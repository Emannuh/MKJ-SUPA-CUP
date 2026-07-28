import axios, { AxiosError } from 'axios'
import * as SecureStore from 'expo-secure-store'

const API_BASE_URL = 'https://mkjsupacup.com/api'

// Token management
const TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'user_data'

const getAccessToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  } catch {
    return null
  }
}

const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

const setTokens = async (access: string, refresh?: string) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, access)
    if (refresh) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh)
    }
  } catch (e) {
    console.error('Failed to save tokens:', e)
  }
}

export const clearTokens = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
  } catch {
    // Ignore errors
  }
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - attach access token
api.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = await getRefreshToken()
      if (!refreshToken) {
        await clearTokens()
        // Navigate to login would happen via auth state change
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        })

        const { access } = response.data
        await setTokens(access)
        originalRequest.headers.Authorization = `Bearer ${access}`

        return api(originalRequest)
      } catch (refreshError) {
        await clearTokens()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await axios.post(`${API_BASE_URL}/v1/auth/login/`, { email, password })
    const { access, refresh } = response.data
    await setTokens(access, refresh)
    return response.data
  },

  logout: async () => {
    await clearTokens()
  },

  getProfile: async () => {
    const response = await api.get('/v1/auth/profile/')
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.data))
    return response.data
  },

  getStoredUser: async () => {
    try {
      const user = await SecureStore.getItemAsync(USER_KEY)
      return user ? JSON.parse(user) : null
    } catch {
      return null
    }
  },

  isAuthenticated: async () => {
    try {
      const token = await getAccessToken()
      return !!token
    } catch {
      return false
    }
  },
}

// Public API
export const publicAPI = {
  getCompetitions: () => api.get('/v1/competitions/'),
  getCompetition: (id: string) => api.get(`/v1/competitions/${id}/`),
  getFixtures: (params?: object) => api.get('/v1/matches/', { params }),
  getStandings: (competitionId: string) => api.get(`/v1/competitions/${competitionId}/standings/`),
  getResults: (params?: object) => api.get('/v1/matches/', { params }),
  getLiveMatches: () => api.get('/v1/matches/'),
}

// Team Manager API
export const teamManagerAPI = {
  getLonglist: () => api.get('/v1/teams/players/'),
  addPlayer: (data: object) => api.post('/v1/teams/players/', data),
  updatePlayer: (id: string, data: object) => api.patch(`/v1/teams/players/${id}/`, data),
  deletePlayer: (id: string) => api.delete(`/v1/teams/players/${id}/`),
  uploadPlayerPhoto: async (playerId: string, file: Blob) => {
    const formData = new FormData()
    formData.append('photo', file)
    return api.patch(`/v1/teams/players/${playerId}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadPlayerDocument: async (playerId: string, file: Blob, docType: string) => {
    const formData = new FormData()
    formData.append(docType, file)
    return api.patch(`/v1/teams/players/${playerId}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// WSCC API
export const wsccAPI = {
  getLonglists: () => api.get('/v1/teams/wscc/longlists/'),
  getLonglist: (id: string) => api.get(`/v1/teams/wscc/longlists/${id}/`),
  approveLonglist: (id: string) => api.post(`/v1/teams/wscc/longlists/${id}/approve/`),
  returnLonglist: (id: string, reason: string) =>
    api.post(`/v1/teams/wscc/longlists/${id}/return/`, { reason }),
}

// Referee API
export const refereeAPI = {
  getAppointments: () => api.get('/v1/referees/appointments/'),
  acceptAppointment: (id: string) => api.post(`/v1/referees/appointments/${id}/accept/`),
  declineAppointment: (id: string, reason: string) =>
    api.post(`/v1/referees/appointments/${id}/decline/`, { reason }),
}

export default api
