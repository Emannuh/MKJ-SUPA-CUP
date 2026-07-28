import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { authAPI } from '../api/client'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  ward?: string
  sub_county?: string
  phone?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  isAuthenticated: boolean
  hasRole: (roles: string | string[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const isAuth = await authAPI.isAuthenticated()
        if (isAuth) {
          const storedUser = await authAPI.getStoredUser()
          if (storedUser) {
            setUser(storedUser)
          } else {
            const profile = await authAPI.getProfile()
            setUser(profile)
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        // Don't call logout here - just clear user state
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await authAPI.login(email, password)
    const profile = await authAPI.getProfile()
    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch (e) {
      // Ignore logout errors
    }
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (roles: string | string[]) => {
      if (!user) return false
      if (typeof roles === 'string') return user.role === roles
      return roles.includes(user.role)
    },
    [user]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default useAuth
