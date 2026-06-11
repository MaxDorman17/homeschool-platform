/**
 * Main App Module - Shared UI logic for all dashboards
 */

// ─── Navigation ───
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.navbar-links a').forEach(a => a.classList.remove('active'));

    // Show target section
    const section = document.getElementById('section-' + sectionId);
    if (section) {
        section.style.display = 'block';
    }

    // Update nav
    const links = document.querySelectorAll('.navbar-links a');
    links.forEach(link => {
        if (link.textContent.toLowerCase().includes(sectionId.substring(0, 4))) {
            link.classList.add('active');
        }
    });
}

// ─── Modals ───
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ─── Toast Notifications ───
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✅' : '❌'}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ─── Logout ───
function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    window.location.href = 'login.html';
}

// ─── Format Date ───
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Loading State ───
function setLoading(elementId, loading = true) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (loading) {
        el.innerHTML = '<p style="color: var(--text-muted);">Loading...</p>';
    }
}
