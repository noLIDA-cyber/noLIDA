window.NOLIDA_API_VERSION = 'v1';
window.NOLIDA_FRONTEND_URL = 'http://localhost:3000';

import { isAuthenticated, apiGet } from './api.js';
import './modules/theme.js';

document.addEventListener('DOMContentLoaded', async () => {
  document.body.dataset.authenticated = isAuthenticated() ? 'true' : 'false';

  if (window.ThemeManager) {
    await window.ThemeManager.init();
    window.ThemeManager.setupSystemListener();
  }

  if (isAuthenticated()) {
    await injectVerificationBanner();
  }

  const page = document.body.dataset.page;

  if (page === 'auth') {
    import('./modules/auth.js').then(m => m.initAuthPage()).catch(err => console.error('Auth module failed:', err));
  }

  if (page === 'dashboard') {
    import('./modules/dashboard.js').then(m => m.initDashboard()).catch(err => console.error('Dashboard module failed:', err));
  }

  if (page === 'search') {
    import('./modules/search.js').then(m => m.initSearch()).catch(err => console.error('Search module failed:', err));
  }

  if (page === 'admin') {
    import('./modules/admin.js').then(m => m.initAdmin()).catch(err => console.error('Admin module failed:', err));
  }

  if (page === 'settings') {
    import('./modules/settings.js').then(m => m.initSettingsPage()).catch(err => console.error('Settings module failed:', err));
  }

  if (page === 'reviews') {
    import('./modules/reviews.js').then(m => m.initReviewsPage()).catch(err => console.error('Reviews module failed:', err));
  }

  if (page === 'disputes') {
    import('./modules/disputes.js').then(m => m.initDisputesPage()).catch(err => console.error('Disputes module failed:', err));
  }

  if (page === 'verification') {
    import('./modules/verification.js').then(m => m.initVerificationPage()).catch(err => console.error('Verification module failed:', err));
  }
});

const navigate = (url) => {
  window.location.href = url;
};

const injectVerificationBanner = async () => {
  if (document.getElementById('global-verification-banner')) return;
  if (document.body.dataset.page === 'verification') return;
  if (!isAuthenticated()) return;

  let hasApproved = false;
  try {
    const response = await fetch('/api/v1/verification/me/status', {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });
    if (response.ok) {
      const data = await response.json();
      hasApproved = Object.values(data.data || {}).some(s => s === 'approved');
    }
  } catch (e) {
    return;
  }

  if (hasApproved) return;

  const banner = document.createElement('div');
  banner.id = 'global-verification-banner';
  banner.style.cssText = 'position: fixed; top: var(--header-height); left: 0; right: 0; background: var(--color-warning); color: var(--color-white); padding: 0.75rem 1rem; text-align: center; font-size: var(--text-sm); font-weight: var(--weight-medium); z-index: 999; box-shadow: var(--shadow-md); cursor: pointer;';
  banner.textContent = '⚠️ Verification pending — click here to complete verification and unlock full access';
  banner.addEventListener('click', () => {
    navigate('/verification');
  });

  document.body.appendChild(banner);
};

const showToast = (message, type = 'info', duration = 3000) => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position: fixed; top: 1rem; right: 1rem; z-index: 400; display: flex; flex-direction: column; gap: 0.5rem;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'card';
  const borderColor = type === 'error' ? 'var(--color-danger)' : type === 'success' ? 'var(--color-success)' : 'var(--color-accent)';
  toast.style.cssText = `padding: 0.875rem 1.25rem; box-shadow: var(--shadow-lg); border-left: 4px solid ${borderColor}; animation: slideIn 0.3s ease; min-width: 280px;`;
  toast.innerHTML = `<p style="font-size: var(--text-sm); font-weight: var(--weight-medium); margin: 0; color: var(--color-gray-900);">${message}</p>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

const showLoading = (elementId) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto;"></div>';
};

const hideLoading = (elementId, content) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = content;
};

export { navigate, showToast, showLoading, hideLoading };