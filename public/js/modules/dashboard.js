import { isAuthenticated, getCurrentUser, apiGet } from '../api.js';
import { showToast, navigate } from '../app.js';

const initDashboard = async () => {
  if (!isAuthenticated()) {
    navigate('/auth');
    return;
  }

  const user = getCurrentUser();
  if (user) {
    document.title = `noLIDA — ${user.display_name || user.first_name || 'Dashboard'}`;
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await apiPost('/auth/logout', {});
      } catch (e) {
        console.error('Logout error', e);
      }
      localStorage.clear();
      showToast('You have been logged out', 'info');
      navigate('/auth');
    });
  }
};

export { initDashboard };