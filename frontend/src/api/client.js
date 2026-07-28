import axios from 'axios'

const API_BASE_URL = '/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token management
const getAccessToken = () => localStorage.getItem('access_token')
const getRefreshToken = () => localStorage.getItem('refresh_token')
const setTokens = (access, refresh) => {
  localStorage.setItem('access_token', access)
  if (refresh) localStorage.setItem('refresh_token', refresh)
}
const clearTokens = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

// Request interceptor - attach access token
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
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
  async (error) => {
    const originalRequest = error.config

    // If 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        })

        const { access } = response.data
        setTokens(access, refreshToken)
        originalRequest.headers.Authorization = `Bearer ${access}`
        
        return api(originalRequest)
      } catch (refreshError) {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/token/`, { email, password })
    const { access, refresh } = response.data
    setTokens(access, refresh)
    return response.data
  },

  logout: () => {
    clearTokens()
  },

  getProfile: async () => {
    const response = await api.get('/v1/auth/me/')
    localStorage.setItem('user', JSON.stringify(response.data))
    return response.data
  },

  getStoredUser: () => {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  isAuthenticated: () => !!getAccessToken(),
}

// Public API (no auth required)
export const publicAPI = {
  getCompetitions: () => api.get('/v1/competitions/'),
  getCompetition: (id) => api.get(`/v1/competitions/${id}/`),
  getFixtures: (params) => api.get('/v1/fixtures/', { params }),
  getStandings: (competitionId) => api.get(`/v1/competitions/${competitionId}/standings/`),
  getResults: (params) => api.get('/v1/matches/', { params }),
  getLiveMatches: () => api.get('/v1/matches/live/'),
}

// Team Manager API
export const teamManagerAPI = {
  getLonglist: () => api.get('/v1/teams/my-longlist/'),
  addPlayer: (data) => api.post('/v1/teams/players/', data),
  updatePlayer: (id, data) => api.patch(`/v1/teams/players/${id}/`, data),
  deletePlayer: (id) => api.delete(`/v1/teams/players/${id}/`),
  uploadPlayerPhoto: (playerId, file) => {
    const formData = new FormData()
    formData.append('photo', file)
    return api.patch(`/v1/teams/players/${playerId}/upload-photo/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadPlayerDocument: (playerId, file, docType) => {
    const formData = new FormData()
    formData.append(docType, file)
    return api.patch(`/v1/teams/players/${playerId}/upload-document/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// WSCC API
export const wsccAPI = {
  getLonglists: () => api.get('/v1/teams/wscc/longlists/'),
  getLonglist: (id) => api.get(`/v1/teams/wscc/longlists/${id}/`),
  approveLonglist: (id) => api.post(`/v1/teams/wscc/longlists/${id}/approve/`),
  returnLonglist: (id, reason) => api.post(`/v1/teams/wscc/longlists/${id}/return/`, { reason }),
}

// Referee API
export const refereeAPI = {
  getAppointments: () => api.get('/v1/referees/appointments/'),
  acceptAppointment: (id) => api.post(`/v1/referees/appointments/${id}/accept/`),
  declineAppointment: (id, reason) => api.post(`/v1/referees/appointments/${id}/decline/`, { reason }),
}

export default api
