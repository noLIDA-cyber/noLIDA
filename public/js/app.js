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
    import('./modules/admin.js').then(m => m.initAdminPage()).catch(err => console.error('Admin module failed:', err));
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

  if (page === 'bookings') {
    import('./modules/bookings.js').then(m => m.initBookingsPage()).catch(err => console.error('Bookings module failed:', err));
  }

  if (page === 'booking-detail') {
    import('./modules/bookings.js').then(m => m.initBookingDetail()).catch(err => console.error('Booking detail module failed:', err));
  }

  if (page === 'provider') {
    import('./modules/bookings.js').then(m => m.initProviderDashboard()).catch(err => console.error('Provider module failed:', err));
  }

  if (page === 'customers') {
    import('./modules/customers.js').then(m => m.initCustomersPage()).catch(err => console.error('Customers module failed:', err));
  }

  if (page === 'customer-detail') {
    import('./modules/customers.js').then(m => m.initCustomerDetail()).catch(err => console.error('Customer detail module failed:', err));
  }

  if (page === 'analytics') {
    import('./modules/analytics.js').then(m => m.initAnalyticsPage()).catch(err => console.error('Analytics module failed:', err));
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

const profileBtn = document.getElementById('profile-btn');
const drawer = document.getElementById('profile-drawer');
const drawerBackdrop = document.getElementById('profile-drawer-backdrop');
const closeDrawerBtn = document.getElementById('close-drawer');
const drawerGuest = document.getElementById('drawer-guest');
const drawerUser = document.getElementById('drawer-user');
const drawerUserName = document.getElementById('drawer-user-name');
const drawerUserEmail = document.getElementById('drawer-user-email');
const drawerLogout = document.getElementById('drawer-logout');
const drawerAvatarImg = document.getElementById('drawer-avatar-img');
const drawerAvatarIcon = document.getElementById('drawer-avatar-icon');
const profileIconDefault = document.getElementById('profile-icon-default');
const profileAvatar = document.getElementById('profile-avatar');
const notificationBtn = document.getElementById('notification-btn');
const notificationBadge = document.getElementById('notification-badge');

const openDrawer = () => {
  if (!drawer || !drawerBackdrop) return;
  drawer.style.transform = 'translateX(0)';
  drawerBackdrop.classList.remove('hidden');
  requestAnimationFrame(() => {
    drawerBackdrop.style.opacity = '1';
  });
  document.body.style.overflow = 'hidden';
};

const closeDrawer = () => {
  if (!drawer || !drawerBackdrop) return;
  drawer.style.transform = 'translateX(100%)';
  drawerBackdrop.style.opacity = '0';
  document.body.style.overflow = '';
  setTimeout(() => {
    drawerBackdrop.classList.add('hidden');
  }, 300);
};

if (profileBtn) {
  profileBtn.addEventListener('click', openDrawer);
}

if (closeDrawerBtn) {
  closeDrawerBtn.addEventListener('click', closeDrawer);
}

if (drawerBackdrop) {
  drawerBackdrop.addEventListener('click', closeDrawer);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDrawer();
});

if (drawerLogout) {
  drawerLogout.addEventListener('click', async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      showToast('You have been logged out', 'info');
      closeDrawer();
      window.location.href = '/auth';
    }
  });
}

if (notificationBtn) {
  notificationBtn.addEventListener('click', () => {
    navigate('/notifications');
  });
}

const updateDrawerState = () => {
  if (!drawerGuest || !drawerUser || !drawerLogout) return;
  const authenticated = isAuthenticated();
  if (authenticated) {
    drawerGuest.style.display = 'none';
    drawerUser.style.display = 'block';
    drawerLogout.style.display = 'flex';
    const user = getCurrentUser();
    if (user && drawerUserName && drawerUserEmail) {
      drawerUserName.textContent = user.display_name || user.first_name || 'User';
      drawerUserEmail.textContent = user.email || '';
    }
    updateDrawerAvatar();
  } else {
    drawerGuest.style.display = 'block';
    drawerUser.style.display = 'none';
    drawerLogout.style.display = 'none';
    if (drawerAvatarImg) {
      drawerAvatarImg.style.display = 'none';
      drawerAvatarImg.src = '';
    }
    if (drawerAvatarIcon) {
      drawerAvatarIcon.style.display = 'block';
    }
  }
};

const updateDrawerAvatar = async () => {
  if (!drawerAvatarImg || !drawerAvatarIcon) return;
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      drawerAvatarIcon.style.display = 'block';
      drawerAvatarImg.style.display = 'none';
      return;
    }

    const response = await fetch('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      const avatarUrl = data.data?.avatar_url;
      if (avatarUrl) {
        drawerAvatarImg.src = avatarUrl;
        drawerAvatarImg.style.display = 'block';
        drawerAvatarIcon.style.display = 'none';
      } else {
        drawerAvatarIcon.style.display = 'block';
        drawerAvatarImg.style.display = 'none';
      }
    }
  } catch (e) {
    drawerAvatarIcon.style.display = 'block';
    drawerAvatarImg.style.display = 'none';
  }
};

const updateProfileAvatar = async () => {
  if (!profileIconDefault || !profileAvatar) return;
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      profileIconDefault.style.display = 'block';
      profileAvatar.style.display = 'none';
      return;
    }

    const response = await fetch('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      const avatarUrl = data.data?.avatar_url;
      if (avatarUrl) {
        profileAvatar.src = avatarUrl;
        profileAvatar.style.display = 'block';
        profileIconDefault.style.display = 'none';
      } else {
        profileIconDefault.style.display = 'block';
        profileAvatar.style.display = 'none';
      }
    }
  } catch (e) {
    profileIconDefault.style.display = 'block';
    profileAvatar.style.display = 'none';
  }
};

const updateNotificationBadge = async () => {
  if (!notificationBadge) return;
  try {
    const data = await apiGet('/notifications/unread-count');
    const count = data?.data?.count || 0;
    if (count > 0) {
      notificationBadge.classList.remove('hidden');
    } else {
      notificationBadge.classList.add('hidden');
    }
  } catch (e) {
    notificationBadge.classList.add('hidden');
  }
};

updateDrawerState();
updateProfileAvatar();
updateNotificationBadge();