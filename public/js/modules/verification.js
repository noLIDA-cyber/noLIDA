import { isAuthenticated, apiGet, apiPost } from '/js/api.js';
import { showToast, navigate } from '/js/app.js';

const initVerificationPage = () => {
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

  const form = document.getElementById('verification-form');
  const statusContainer = document.getElementById('verification-status');

  const loadStatus = async () => {
    try {
      const data = await apiGet('/verification/me/status', { timeout: 5000 });
      renderStatus(data.data || {});
      updateBanner(data.data || {});
    } catch (err) {
      console.error('Failed to load verification status:', err);
      statusContainer.innerHTML = `<div class="alert alert--danger">${err.message || 'Failed to load verification status. Please try again.'}</div>`;
    }
  };

  const updateBanner = (status) => {
    const banner = document.getElementById('verification-banner');
    const container = document.querySelector('.container');
    if (!banner || !container) return;

    const hasApproved = Object.values(status).some(s => s === 'approved');
    if (hasApproved) {
      banner.style.display = 'none';
      container.style.marginTop = '0';
    } else {
      banner.style.display = 'block';
      container.style.marginTop = '3rem';
    }
  };

  const renderStatus = (status) => {
    const entries = Object.entries(status);
    if (entries.length === 0) {
      statusContainer.innerHTML = `<p style="color: var(--theme-text-secondary);">No verifications submitted yet.</p>`;
      return;
    }

    statusContainer.innerHTML = `
      <div class="space-y-2">
        ${entries.map(([type, state]) => `
          <div class="card flex items-center justify-between" style="padding: 1rem;">
            <div>
              <p style="font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--theme-text-primary); margin: 0; text-transform: capitalize;">${type}</p>
              <p style="font-size: var(--text-xs); color: var(--theme-text-tertiary); margin: 0;">Verification</p>
            </div>
            <span class="badge ${getStatusBadgeClass(state)}">${state}</span>
          </div>
        `).join('')}
      </div>
    `;
  };

  const getStatusBadgeClass = (state) => {
    switch (state) {
      case 'approved': return 'badge--primary';
      case 'pending': return 'badge--warning';
      case 'under_review': return 'badge--warning';
      case 'rejected': return 'badge--danger';
      default: return 'badge--secondary';
    }
  };

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:0.5rem;"></div> Submitting...';

      try {
        const formData = new FormData(form);
        await apiPost('/verification', {
          type: formData.get('type'),
          documentType: formData.get('documentType'),
          documentUrl: formData.get('documentUrl'),
        });
        showToast('Verification submitted successfully', 'success');
        form.reset();
        loadStatus();

        const banner = document.getElementById('global-verification-banner');
        if (banner) {
          banner.remove();
        }
      } catch (err) {
        showToast(err.message || 'Failed to submit verification', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Verification';
      }
    });
  }

  const banner = document.getElementById('verification-banner');
  if (banner) {
    banner.style.display = 'none';
  }

  loadStatus();
};

export { initVerificationPage };
