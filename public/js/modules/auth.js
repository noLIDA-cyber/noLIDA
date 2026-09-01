import { apiPost, clearTokens } from '../api.js';
import { showToast, showLoading, hideLoading, navigate } from '../app.js';

const initAuthPage = () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const forgotForm = document.getElementById('forgot-password-form');
  const tabButtons = document.querySelectorAll('[data-auth-tab]');

  const getTabFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'register' ? 'register' : 'login';
  };

  const showPanel = (tab) => {
    document.querySelectorAll('[data-auth-panel]').forEach(panel => {
      panel.classList.add('hidden');
    });
    const panel = document.querySelector(`[data-auth-panel="${tab}"]`);
    if (panel) panel.classList.remove('hidden');

    tabButtons.forEach(btn => {
      if (btn.dataset.authTab === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  };

  const initialTab = getTabFromUrl();
  showPanel(initialTab);

  if (tabButtons) {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => showPanel(btn.dataset.authTab));
    });
  }

  const forgotLink = document.getElementById('forgot-password-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      showPanel('forgot');
    });
  }

  const backLink = document.getElementById('back-to-login');
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      showPanel('login');
    });
  }

  const googleBtn = document.getElementById('google-signin');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      googleBtn.disabled = true;
      googleBtn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:0.5rem;"></div> Connecting...';
      try {
        await apiPost('/auth/google', {});
      } catch (error) {
        showToast(error.message || 'Google sign-in is not available yet', 'error');
      } finally {
        googleBtn.disabled = false;
        googleBtn.textContent = 'Continue with Google';
      }
    });
  }

  const appleBtn = document.getElementById('apple-signin');
  if (appleBtn) {
    appleBtn.addEventListener('click', async () => {
      appleBtn.disabled = true;
      appleBtn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:0.5rem;"></div> Connecting...';
      try {
        await apiPost('/auth/apple', {});
      } catch (error) {
        showToast(error.message || 'Apple sign-in is not available yet', 'error');
      } finally {
        appleBtn.disabled = false;
        appleBtn.textContent = 'Continue with Apple';
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;border-width:2px;"></div> Signing in...';

      try {
        const formData = new FormData(loginForm);
        const data = await apiPost('/auth/login', {
          email: formData.get('email'),
          password: formData.get('password'),
        });

        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        showToast('Welcome back!', 'success');
        navigate('/');
      } catch (error) {
        showToast(error.message || 'Login failed', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Sign in';
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;border-width:2px;"></div> Creating account...';

      try {
        const formData = new FormData(registerForm);
        const data = await apiPost('/auth/register', {
          email: formData.get('email'),
          password: formData.get('password'),
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
        });

        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        showToast('Account created successfully!', 'success');
        navigate('/');
      } catch (error) {
        showToast(error.message || 'Registration failed', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Create account';
      }
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = forgotForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = 'Sending...';

      try {
        const formData = new FormData(forgotForm);
        await apiPost('/auth/forgot-password', { email: formData.get('email') });
        showToast('If an account exists, a reset link has been sent.', 'success');
        forgotForm.reset();
      } catch (error) {
        showToast(error.message || 'Request failed', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Send reset link';
      }
    });
  }
};

const logout = async () => {
  try {
    await fetch('/api/v1/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearTokens();
    showToast('You have been logged out', 'info');
    navigate('/auth');
  }
};

export { initAuthPage, logout };