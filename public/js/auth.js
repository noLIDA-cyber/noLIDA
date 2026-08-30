import { apiPost, clearTokens } from './api.js';
import { showToast, showLoading, navigate } from './app.js';

const initAuthPage = () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      const eyeOpen = btn.querySelector('.eye-open');
      const eyeClosed = btn.querySelector('.eye-closed');
      if (eyeOpen && eyeClosed) {
        eyeOpen.classList.toggle('hidden', !isPassword);
        eyeClosed.classList.toggle('hidden', isPassword);
      }
    });
  });

  const googleBtn = document.getElementById('google-signin');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      googleBtn.disabled = true;
      googleBtn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:0.5rem;"></div> Connecting...';
      try {
        const data = await apiPost('/auth/google', {});
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        showToast('Signed in with Google!', 'success');
        navigate('/');
      } catch (error) {
        showToast(error.message || 'Google sign-in failed', 'error');
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
        const data = await apiPost('/auth/apple', {});
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        showToast('Signed in with Apple!', 'success');
        navigate('/');
      } catch (error) {
        showToast(error.message || 'Apple sign-in failed', 'error');
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
        btn.innerHTML = 'Sign In';
      }
    });
  }

  const forgotForm = document.getElementById('forgot-password-form');
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
        btn.innerHTML = 'Send Reset Link';
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
        btn.innerHTML = 'Create Account';
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

initAuthPage();

export { initAuthPage, logout };
