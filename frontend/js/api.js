/**
 * API Client Module
 * Handles all communication with the backend
 */

const API_BASE = window.location.origin;
let authToken = localStorage.getItem('auth_token');

// ─── Auth Endpoints ───
export async function login(username, password) {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    authToken = data.access_token;
    localStorage.setItem('auth_token', authToken);
    return data;
}

export async function registerParent(username, email, fullName, password) {
    const res = await fetch(`${API_BASE}/api/v1/auth/register-parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, full_name: fullName, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    return data;
}

export async function registerChild(username, email, fullName, password, parentId) {
    const res = await fetch(`${API_BASE}/api/v1/auth/register-child`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ username, email, full_name: fullName, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    return data;
}

export async function getCurrentUser() {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return await res.json();
}

export function logout() {
    localStorage.removeItem('auth_token');
    authToken = null;
    window.location.href = '/login.html';
}

// ─── Lessons ───
export async function createLesson(data) {
    return apiPost('/api/v1/lessons', data);
}

export async function getLessons(subject = null) {
    return apiGet(`/api/v1/lessons${subject ? '?subject=' + subject : ''}`);
}

export async function getLesson(id) {
    return apiGet(`/api/v1/lessons/${id}`);
}

export async function deleteLesson(id) {
    return apiDelete(`/api/v1/lessons/${id}`);
}

// ─── Worksheets ───
export async function createWorksheet(data) {
    return apiPost('/api/v1/worksheets', data);
}

export async function getWorksheets() {
    return apiGet('/api/v1/worksheets');
}

export async function uploadWorksheetFile(worksheetId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/v1/worksheets/upload/${worksheetId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
    });
    return await res.json();
}

// ─── Quizzes ───
export async function createQuiz(data) {
    return apiPost('/api/v1/quizzes', data);
}

export async function getQuizzes() {
    return apiGet('/api/v1/quizzes');
}

export async function submitQuiz(quizId, answers) {
    return apiPost(`/api/v1/quizzes/${quizId}/submit`, { answers });
}

export async function getQuizResults(quizId) {
    return apiGet(`/api/v1/quizzes/${quizId}/results`);
}

// ─── Schedules ───
export async function createSchedule(data) {
    return apiPost('/api/v1/schedules', data);
}

export async function getSchedules() {
    return apiGet('/api/v1/schedules');
}

export async function deleteSchedule(id) {
    return apiDelete(`/api/v1/schedules/${id}`);
}

// ─── Progress ───
export async function getTodaysTasks() {
    return apiGet('/api/v1/progress/today');
}

export async function markComplete(itemId) {
    return apiPut(`/api/v1/progress/complete/${itemId}`, {});
}

// ─── Dashboard ───
export async function getChildDashboard(childId) {
    return apiGet(`/api/v1/dashboard/child/${childId}`);
}

export async function getTodayLessons() {
    return apiGet(`/api/v1/auth/me/today-lessons`);
}

// ─── Generic Helpers ───
export async function apiGet(url) {
    const res = await fetch(`${API_BASE}${url}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    return await res.json();
}

export async function apiPost(url, data) {
    const res = await fetch(`${API_BASE}${url}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(data)
    });
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    return await res.json();
}

export async function apiPut(url, data) {
    const res = await fetch(`${API_BASE}${url}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(data)
    });
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    return await res.json();
}

export async function apiDelete(url) {
    const res = await fetch(`${API_BASE}${url}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    return res.status === 204;
}

// ─── Rewards ───
export async function createReward(data) {
    return apiPost('/api/v1/rewards', data);
}

export async function getRewards() {
    return apiGet('/api/v1/rewards');
}

export async function redeemReward(rewardId) {
    return apiPost(`/api/v1/rewards/${rewardId}/redeem`, {});
}

// ─── Delete wrappers ───
export async function deleteWorksheet(id) {
    return apiDelete(`/api/v1/worksheets/${id}`);
}

export async function deleteQuiz(id) {
    return apiDelete(`/api/v1/quizzes/${id}`);
}
