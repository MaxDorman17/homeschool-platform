/**
 * Parent Dashboard Logic
 */
import {
    getCurrentUser, getLessons, createLesson, deleteLesson,
    getSchedules, createSchedule, deleteSchedule,
    getWorksheets, createWorksheet,
    getChildDashboard
} from './api.js';

let currentUser = null;
let children = [];
let lessons = [];

// ─── Initialization ───
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    await loadDashboardData();
    setupFormListeners();
});

async function loadUserData() {
    try {
        currentUser = await getCurrentUser();
    } catch (err) {
        showToast(err.message, 'error');
        logout();
    }
}

async function loadDashboardData() {
    // Load lessons
    try {
        lessons = await getLessons();
        renderLessons();
        document.getElementById('stat-lessons').textContent = lessons.length;
    } catch (err) {
        console.error('Failed to load lessons:', err);
    }

    // Load schedules
    try {
        const schedules = await getSchedules();
        document.getElementById('stat-schedules').textContent = schedules.length;
    } catch (err) {
        console.error('Failed to load schedules:', err);
    }
}

// ─── Lesson Form ───
function setupFormListeners() {
    document.getElementById('addLessonForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            title: document.getElementById('lessonTitle').value,
            subject: document.getElementById('lessonSubject').value,
            topic: document.getElementById('lessonTopic').value || null,
            description: document.getElementById('lessonDescription').value || null,
            content_type: document.getElementById('lessonType').value,
            content_url: document.getElementById('lessonUrl').value || null,
            content_body: document.getElementById('lessonDescription').value || null,
            difficulty: document.getElementById('lessonDifficulty').value,
            points_reward: parseInt(document.getElementById('lessonPoints').value)
        };

        try {
            await createLesson(data);
            showToast('Lesson created successfully!');
            closeModal('addLessonModal');
            document.getElementById('addLessonForm').reset();
            await loadDashboardData();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// ─── Render Lessons ───
function renderLessons() {
    const container = document.getElementById('lessons-list');
    if (!container) return;

    if (lessons.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">No lessons yet. Create your first lesson!</p>';
        return;
    }

    container.innerHTML = lessons.map(lesson => `
        <div class="card lesson-card">
            <div class="card-header">
                <div>
                    <div class="lesson-subject">${lesson.subject}</div>
                    <div class="lesson-title">${lesson.title}</div>
                </div>
                <div>
                    <span class="badge badge-bronze">${lesson.difficulty}</span>
                    <span style="color: #fbbf24; margin-left: 8px;">⭐ ${lesson.points_reward}pts</span>
                </div>
            </div>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 12px;">
                ${lesson.description || 'No description'}
            </p>
            ${lesson.topic ? `<p style="font-size: 0.85rem; color: var(--text-muted);">📌 Topic: ${lesson.topic}</p>` : ''}
            <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button class="btn btn-secondary btn-sm" onclick="editLesson(${lesson.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteLessonHandler(${lesson.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

async function deleteLessonHandler(id) {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    try {
        await deleteLesson(id);
        showToast('Lesson deleted');
        await loadDashboardData();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
