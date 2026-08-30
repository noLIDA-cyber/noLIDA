import { isAuthenticated, apiGet, apiPost } from '/js/api.js';
import { showToast, navigate } from '/js/app.js';

const initDisputesPage = () => {
  if (!isAuthenticated()) {
    navigate('/auth');
    return;
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const { logout } = await import('/js/modules/auth.js');
      await logout();
    });
  }

  const container = document.getElementById('disputes-list');

  const loadDisputes = async () => {
    try {
      const data = await apiGet('/disputes/me', { timeout: 5000 });
      renderDisputes(data.data || []);
    } catch (err) {
      console.error('Failed to load disputes:', err);
      container.innerHTML = `<div class="alert alert--danger">${err.message || 'Failed to load disputes. Please try again.'}</div>`;
    }
  };

  const renderDisputes = (disputes) => {
    if (!disputes || disputes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⚖️</div>
          <p class="empty-state__title">No disputes yet</p>
          <p class="empty-state__description">If you have an issue with a transaction, you can open a dispute here.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="space-y-4">
        ${disputes.map(dispute => `
          <div class="card" style="border-left: 4px solid var(--color-warning);">
            <div class="flex items-center justify-between" style="margin-bottom: 0.75rem;">
              <div>
                <h3 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin: 0;">${dispute.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin: 0;">Transaction #${dispute.transaction_id}</p>
              </div>
              <span class="badge badge--warning">${dispute.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            </div>
            <p style="font-size: var(--text-sm); color: var(--theme-text-secondary); margin: 0;">${dispute.description || 'No description provided.'}</p>
            ${dispute.resolution ? `<p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-top: 0.5rem;"><strong>Resolution:</strong> ${dispute.resolution}</p>` : ''}
            <p style="font-size: var(--text-xs); color: var(--theme-text-tertiary); margin-top: 0.5rem;">Opened: ${new Date(dispute.created_at).toLocaleDateString()}</p>
          </div>
        `).join('')}
      </div>
    `;
  };

  loadDisputes();
};

export { initDisputesPage };
