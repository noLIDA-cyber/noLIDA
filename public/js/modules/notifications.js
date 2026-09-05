import { apiGet, apiPatch, isAuthenticated } from '/js/api.js';
import { showToast, navigate } from '/js/app.js';

const renderNotifications = (notifications) => {
  const container = document.getElementById('notifications-list');
  const empty = document.getElementById('notifications-empty');
  if (!container) return;

  if (!notifications || notifications.length === 0) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  container.innerHTML = notifications.map(n => {
    const created = new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const unread = !n.read;
    const link = n.data && n.data.link;
    return `
      <div class="card" style="padding: 1rem; border: 1px solid var(--theme-border); ${unread ? 'border-left: 4px solid var(--color-accent);' : ''} opacity: ${unread ? 1 : 0.7};" data-notification-id="${n.id}">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem;">
          <div style="flex: 1; min-width: 0;">
            <h3 style="font-size: var(--text-base); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin: 0 0 0.25rem;">${n.title || 'Notification'}</h3>
            <p style="font-size: var(--text-sm); color: var(--theme-text-secondary); margin: 0 0 0.5rem;">${n.body || ''}</p>
            <p style="font-size: var(--text-xs); color: var(--theme-text-tertiary); margin: 0;">${created}</p>
          </div>
          ${link ? `<a href="${link}" class="btn btn--ghost btn--sm">View</a>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-notification-id]').forEach(el => {
    el.addEventListener('click', () => markRead(el.dataset.notificationId));
  });
};

const markRead = async (id) => {
  try {
    await apiPatch(`/notifications/${id}/read`, {});
  } catch (err) {
    console.error('Failed to mark notification read:', err);
  }
};

const markAllRead = async () => {
  try {
    await apiPatch('/notifications/read-all', {});
    showToast('All notifications marked as read', 'success');
    loadNotifications();
  } catch (err) {
    showToast(err.message || 'Failed to mark all as read', 'error');
  }
};

const loadNotifications = async () => {
  const container = document.getElementById('notifications-list');
  if (!container) return;
  try {
    const data = await apiGet('/notifications?limit=50');
    renderNotifications(data.data || []);
  } catch (err) {
    container.innerHTML = `<div class="alert alert--danger">${err.message || 'Failed to load notifications'}</div>`;
  }
};

export const initNotificationsPage = () => {
  if (!isAuthenticated()) {
    navigate('/auth');
    return;
  }
  loadNotifications();

  const markAllBtn = document.getElementById('mark-all-read-btn');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', markAllRead);
  }
};
