import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })

        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        }
        return api(originalRequest)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (data: { email: string; username: string; password: string; full_name: string; role?: string }) =>
    api.post('/auth/register', data),
  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateMe: (data: any) => api.put('/auth/me', data),
  resetPasswordRequest: (email: string) =>
    api.post('/auth/reset-password-request', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
}

// Children API
export const childrenApi = {
  list: () => api.get('/children'),
  create: (data: any) => api.post('/children', data),
  get: (id: string) => api.get(`/children/${id}`),
  update: (id: string, data: any) => api.put(`/children/${id}`, data),
  delete: (id: string) => api.delete(`/children/${id}`),
  getSubjects: (id: string) => api.get(`/children/${id}/subjects`),
}

// Subjects API
export const subjectsApi = {
  list: () => api.get('/subjects'),
  create: (data: any) => api.post('/subjects', data),
  get: (id: string) => api.get(`/subjects/${id}`),
  update: (id: string, data: any) => api.put(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
}

// Lessons API
export const lessonsApi = {
  list: (params?: any) => api.get('/lessons', { params }),
  create: (data: any) => api.post('/lessons', data),
  get: (id: string) => api.get(`/lessons/${id}`),
  update: (id: string, data: any) => api.put(`/lessons/${id}`, data),
  delete: (id: string) => api.delete(`/lessons/${id}`),
  assign: (lessonId: string, data: any) =>
    api.post(`/lessons/${lessonId}/assign`, data),
  updateAssignment: (assignmentId: string, data: any) =>
    api.put(`/lessons/assignments/${assignmentId}`, data),
  completeAssignment: (assignmentId: string, data: any) =>
    api.post(`/lessons/assignments/${assignmentId}/complete`, data),
  rollover: (data?: any) => api.post('/lessons/rollover', data),
  getChildLessons: (childId: string, params?: any) =>
    api.get(`/children/${childId}/lessons`, { params }),
}

// Planner API
export const plannerApi = {
  getDaily: (childId: string, date: string) =>
    api.get('/planner/daily', { params: { child_id: childId, date } }),
  getWeekly: (childId: string, weekStart: string) =>
    api.get('/planner/weekly', { params: { child_id: childId, week_start: weekStart } }),
  getMonthly: (childId: string, month: string) =>
    api.get('/planner/monthly', { params: { child_id: childId, month } }),
  createEntry: (data: any) => api.post('/planner/entries', data),
  updateEntry: (id: string, data: any) => api.put(`/planner/entries/${id}`, data),
  deleteEntry: (id: string) => api.delete(`/planner/entries/${id}`),
  rearrange: (data: any) => api.post('/planner/rearrange', data),
}

// Quizzes API
export const quizzesApi = {
  list: (params?: any) => api.get('/quizzes', { params }),
  create: (data: any) => api.post('/quizzes', data),
  get: (id: string) => api.get(`/quizzes/${id}`),
  update: (id: string, data: any) => api.put(`/quizzes/${id}`, data),
  delete: (id: string) => api.delete(`/quizzes/${id}`),
  assign: (quizId: string, data: any) =>
    api.post(`/quizzes/${quizId}/assign`, data),
  submitAttempt: (data: any) => api.post('/quizzes/attempts', data),
  getAttempt: (attemptId: string) =>
    api.get(`/quizzes/attempts/${attemptId}`),
  getChildQuizzes: (childId: string, params?: any) =>
    api.get(`/children/${childId}/quizzes`, { params }),
}

// Worksheets API
export const worksheetsApi = {
  list: (params?: any) => api.get('/worksheets', { params }),
  create: (data: any) => api.post('/worksheets', data),
  get: (id: string) => api.get(`/worksheets/${id}`),
  update: (id: string, data: any) => api.put(`/worksheets/${id}`, data),
  delete: (id: string) => api.delete(`/worksheets/${id}`),
  upload: (worksheetId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/worksheets/${worksheetId}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  assign: (worksheetId: string, data: any) =>
    api.post(`/worksheets/${worksheetId}/assign`, data),
  submitInteractive: (assignmentId: string, data: any) =>
    api.post(`/worksheets/interactive/${assignmentId}/submit`, data),
}

// Progress API
export const progressApi = {
  getXp: (childId: string) => api.get(`/children/${childId}/xp`),
  getLevel: (childId: string) => api.get(`/children/${childId}/level`),
  getBadges: (childId: string) => api.get(`/children/${childId}/badges`),
  getStreaks: (childId: string) => api.get(`/children/${childId}/streaks`),
  getTimeline: (childId: string, params?: any) =>
    api.get(`/children/${childId}/timeline`, { params }),
  awardXp: (childId: string, data: any) =>
    api.post(`/children/${childId}/xp/award`, data),
}

// Rewards API
export const rewardsApi = {
  getConfigs: () => api.get('/rewards/config'),
  createConfig: (data: any) => api.post('/rewards/config', data),
  updateConfig: (id: string, data: any) => api.put(`/rewards/config/${id}`, data),
  deleteConfig: (id: string) => api.delete(`/rewards/config/${id}`),
  getCurrent: (childId: string) =>
    api.get(`/children/${childId}/rewards/current`),
  getHistory: (childId: string) =>
    api.get(`/children/${childId}/rewards/history`),
}

// Reading Log API
export const readingApi = {
  list: (childId: string, params?: any) =>
    api.get(`/children/${childId}/reading-log`, { params }),
  create: (data: any) => api.post('/reading-log', data),
  get: (id: string) => api.get(`/reading-log/${id}`),
  update: (id: string, data: any) => api.put(`/reading-log/${id}`, data),
  delete: (id: string) => api.delete(`/reading-log/${id}`),
}

// Attendance API
export const attendanceApi = {
  list: (childId: string, params?: any) =>
    api.get('/attendance', { params: { child_id: childId, ...params } }),
  create: (data: any) => api.post('/attendance', data),
  update: (id: string, data: any) => api.put(`/attendance/${id}`, data),
  getStats: (childId: string) =>
    api.get(`/children/${childId}/attendance/stats`),
  getTrend: (childId: string) =>
    api.get(`/children/${childId}/attendance/trend`),
}

// Dashboard API
export const dashboardApi = {
  getParent: () => api.get('/dashboard/parent'),
  getChild: (childId: string) => api.get(`/dashboard/child?child_id=${childId}`),
}

// Oak Academy API
export const oakApi = {
  getSubjects: () => api.get('/oak/subjects'),
  getUnits: (subject: string) => api.get('/oak/units', { params: { subject } }),
  getLessons: (params: any) => api.get('/oak/lessons', { params }),
  importLesson: (data: any) => api.post('/oak/import/lesson', data),
  importQuiz: (data: any) => api.post('/oak/import/quiz', data),
  getCached: () => api.get('/oak/cached'),
}

// Reports API
export const reportsApi = {
  getDaily: (childId: string, date: string) =>
    api.get('/reports/daily', { params: { child_id: childId, date } }),
  getWeekly: (childId: string, weekStart: string) =>
    api.get('/reports/weekly', { params: { child_id: childId, week_start: weekStart } }),
  getMonthly: (childId: string, month: string) =>
    api.get('/reports/monthly', { params: { child_id: childId, month } }),
  getSubjectPerformance: (childId: string) =>
    api.get('/reports/subject-performance', { params: { child_id: childId } }),
  getAttendanceTrends: (childId: string) =>
    api.get('/reports/attendance-trends', { params: { child_id: childId } }),
  getCompletionRates: (childId: string) =>
    api.get('/reports/completion-rates', { params: { child_id: childId } }),
}

// Coding API
export const codingApi = {
  listProjects: (params?: any) => api.get('/coding/projects', { params }),
  createProject: (data: any) => api.post('/coding/projects', data),
  getProject: (id: string) => api.get(`/coding/projects/${id}`),
  updateProject: (id: string, data: any) =>
    api.put(`/coding/projects/${id}`, data),
  deleteProject: (id: string) => api.delete(`/coding/projects/${id}`),
  submit: (data: any) => api.post('/coding/submissions', data),
  getChildProjects: (childId: string) =>
    api.get(`/children/${childId}/coding`),
}

// Extra Credit API
export const extraCreditApi = {
  list: (childId: string) => api.get(`/children/${childId}/extra-credit`),
  create: (data: any) => api.post('/extra-credit', data),
  update: (id: string, data: any) => api.put(`/extra-credit/${id}`, data),
  delete: (id: string) => api.delete(`/extra-credit/${id}`),
  complete: (taskId: string) => api.post(`/extra-credit/${taskId}/complete`),
}

// Notifications API
export const notificationsApi = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

export default api
