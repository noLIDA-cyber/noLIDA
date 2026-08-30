import { isAuthenticated, apiGet } from '../api.js';
import { navigate, showToast } from '../app.js';

const initAdmin = async () => {
  if (!isAuthenticated()) {
    navigate('/auth');
    return;
  }

  const loadStats = async () => {
    try {
      const [users, transactions] = await Promise.all([
        apiGet('/admin/users?page=1&limit=1'),
        apiGet('/admin/transactions?page=1&limit=1'),
      ]);

      // Update stats if elements exist
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    }
  };

  await loadStats();
};

export { initAdmin };