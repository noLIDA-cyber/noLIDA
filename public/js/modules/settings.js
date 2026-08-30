import { apiPatch } from '../api.js';
import { showToast } from '../app.js';

const initSettingsPage = async () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (user.email) {
    const emailEl = document.getElementById('setting-email');
    if (emailEl) emailEl.textContent = user.email;
  }

  const radioButtons = document.querySelectorAll('input[name="theme"]');

  if (window.ThemeManager) {
    const currentTheme = window.ThemeManager.getTheme();
    radioButtons.forEach(radio => {
      if (radio.value === currentTheme) {
        radio.checked = true;
      }
    });
  }

  radioButtons.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const selectedTheme = e.target.value;
      try {
        if (window.ThemeManager) {
          await window.ThemeManager.setTheme(selectedTheme);
        }
        await apiPatch('/users/theme', { theme: selectedTheme });
        showToast(`Theme changed to ${selectedTheme}`, 'success');
      } catch (error) {
        showToast('Failed to update theme', 'error');
      }
    });
  });
};

export { initSettingsPage };