import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      if (authAPI.isAuthenticated()) {
        try {
          const storedUser = authAPI.getStoredUser()
          if (storedUser) {
            setUser(storedUser)
          } else {
            const profile = await authAPI.getProfile()
            setUser(profile)
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error)
          authAPI.logout()
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authAPI.login(email, password)
    const profile = await authAPI.getProfile()
    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(() => {
    authAPI.logout()
    setUser(null)
  }, [])

  const hasRole = useCallback((roles) => {
    if (!user) return false
    if (typeof roles === 'string') return user.role === roles
    return roles.includes(user.role)
  }, [user])

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
  }

  return (
    <AuthContext.Provider value={value}>
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
