/**
 * Child Dashboard Logic
 */
import {
    getCurrentUser, getTodaysTasks, markComplete,
    getQuizzes, submitQuiz, getChildDashboard
} from './api.js';

let currentUser = null;
let childProfile = null;
let todayTasks = [];

// ─── Initialization ───
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    await loadChildData();
    await loadTodayTasks();
    loadQuizzes();
});

async function loadUserData() {
    try {
        currentUser = await getCurrentUser();
    } catch (err) {
        showToast('Login required', 'error');
        logout();
    }
}

async function loadChildData() {
    // Fetch child dashboard data
    try {
        const dashboard = await getChildDashboard(1); // Will use actual child ID
        childProfile = dashboard.profile;
        updateChildProfile();
    } catch (err) {
        console.error('Failed to load child data:', err);
        // Use local data for now
        document.getElementById('child-name').textContent = currentUser?.full_name || 'Student';
    }
}

function updateChildProfile() {
    if (!childProfile) return;
    document.getElementById('child-name').textContent = childProfile.full_name;
    document.getElementById('child-level').textContent = childProfile.level;
    document.getElementById('child-xp').textContent = childProfile.experience || 0;
    document.getElementById('streak-count').textContent = childProfile.current_streak || 0;
    document.getElementById('points-balance').textContent = 0;

    // Update level progress bar
    const level = childProfile.level || 1;
    const xp = childProfile.experience || 0;
    const xpNeeded = (level * level * 100);
    const prevLevelXP = ((level - 1) * (level - 1) * 100);
    const progress = ((xp - prevLevelXP) / (xpNeeded - prevLevelXP)) * 100;
    document.getElementById('level-progress').style.width = Math.min(100, progress) + '%';
}

// ─── Today's Tasks ───
async function loadTodayTasks() {
    setLoading('today-lessons');
    try {
        todayTasks = await getTodaysTasks();
        renderTodayTasks();
    } catch (err) {
        document.getElementById('today-lessons').innerHTML =
            '<p style="color: var(--text-muted);">No tasks for today — check back tomorrow!</p>';
    }
}

function renderTodayTasks() {
    const container = document.getElementById('today-lessons');
    if (!container) return;

    if (todayTasks.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">🎉</div>
                <h3>No tasks for today!</h3>
                <p style="color: var(--text-muted);">Great job completing everything. Ask your parent to add more lessons!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = todayTasks.map((task, index) => {
        const isCompleted = task.status === 'completed';
        return `
            <div class="card lesson-card ${isCompleted ? 'completed' : ''}" style="margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="flex: 1;">
                        <div class="lesson-subject">${task.lesson_id ? 'Lesson' : task.worksheet_id ? 'Worksheet' : 'Quiz'} #${index + 1}</div>
                        <div class="lesson-title">
                            ${isCompleted ? '✅' : '⏳'} ${isCompleted ? 'Completed!' : 'In Progress'}
                        </div>
                        ${task.score !== null ? `<p style="color: var(--success); font-weight: 600;">Score: ${task.score}%</p>` : ''}
                    </div>
                    ${!isCompleted ? `<button class="btn btn-success" onclick="completeTask(${task.id})">Complete</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function completeTask(itemId) {
    try {
        await markComplete(itemId);
        showToast('Task completed! +10 points');
        await loadTodayTasks();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ─── Quizzes ───
async function loadQuizzes() {
    const container = document.getElementById('quizzes-list');
    if (!container) return;

    try {
        const quizzes = await getQuizzes();
        if (quizzes.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted);">No quizzes available yet.</p>';
            return;
        }

        container.innerHTML = quizzes.map(quiz => `
            <div class="card" style="margin-bottom: 15px;">
                <div class="card-header">
                    <div>
                        <div class="lesson-subject">${quiz.quiz_type.toUpperCase()}</div>
                        <div class="lesson-title">${quiz.title}</div>
                        <p style="color: var(--text-muted); font-size: 0.9rem;">
                            ${quiz.questions?.length || 0} questions • ${quiz.pass_score}% to pass
                        </p>
                    </div>
                    <button class="btn btn-primary" onclick="startQuiz(${quiz.id})">Take Quiz</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p style="color: var(--text-muted);">Failed to load quizzes.</p>';
    }
}

async function startQuiz(quizId) {
    try {
        const quiz = await fetch(`/api/v1/quizzes/${quizId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        const data = await quiz.json();

        // Render quiz
        renderQuiz(data, quizId);
    } catch (err) {
        showToast('Failed to load quiz', 'error');
    }
}

function renderQuiz(quiz, quizId) {
    const container = document.getElementById('section-quizzes');
    if (!container) return;

    const questions = quiz.questions || [];
    container.innerHTML = `
        <h2 style="margin-bottom: 20px;">${quiz.title}</h2>
        <form id="quizForm">
            ${questions.map((q, i) => `
                <div class="card quiz-question" style="margin-bottom: 20px;">
                    <h4>Question ${i + 1}: ${q.question_text}</h4>
                    <div class="quiz-options" style="margin-top: 10px;">
                        ${q.question_type === 'multiple_choice' || q.question_type === 'true_false'
                            ? q.options?.map((opt, j) => `
                                <label>
                                    <input type="radio" name="q${i}" value="${j}" required>
                                    ${opt}
                                </label>
                            `).join('')
                            : `<input type="text" name="q${i}" placeholder="Type your answer..." required>`
                        }
                    </div>
                </div>
            `).join('')}
            <button type="submit" class="btn btn-primary btn-block">Submit Quiz</button>
        </form>
        <div id="quizResult"></div>
    `;

    // Handle form submission
    document.getElementById('quizForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const answers = [];
        for (let [key, value] of formData.entries()) {
            const qIndex = parseInt(key.replace('q', ''));
            answers[qIndex] = q.question_type === 'multiple_choice' || q.question_type === 'true_false'
                ? parseInt(value) : value;
        }

        try {
            const result = await submitQuiz(quizId, answers);
            const resultDiv = document.getElementById('quizResult');
            resultDiv.innerHTML = `
                <div class="quiz-result ${result.passed ? 'pass' : 'fail'}">
                    <h3>${result.passed ? '🎉 Great job!' : '📚 Keep practicing!'}</h3>
                    <p>Score: ${result.correct_answers}/${result.total_questions} (${result.score}%)</p>
                    ${result.passed ? '<p>You earned ' + quiz.points_reward + ' points!</p>' : ''}
                    <button class="btn btn-secondary" onclick="location.reload()" style="margin-top: 15px;">Back to Quizzes</button>
                </div>
            `;
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}
