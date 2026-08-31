import { isAuthenticated, apiGet, apiPost } from '/js/api.js';
import { showToast, navigate } from '/js/app.js';

const initReviewsPage = () => {
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

  const profileBtn = document.getElementById('profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      const drawer = document.getElementById('profile-drawer');
      if (drawer) {
        drawer.style.transform = 'translateX(0)';
        const backdrop = document.getElementById('profile-drawer-backdrop');
        if (backdrop) backdrop.classList.remove('hidden');
      } else {
        window.location.href = '/';
      }
    });
  }

  const myReviewsTab = document.getElementById('tab-my-reviews');
  const providerReviewsTab = document.getElementById('tab-provider-reviews');
  const container = document.getElementById('reviews-list');

  const loadMyReviews = async () => {
    try {
      const data = await apiGet('/reviews/me', { timeout: 5000 });
      renderReviews(data.data || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      container.innerHTML = `<div class="alert alert--danger">${err.message || 'Failed to load reviews. Please try again.'}</div>`;
    }
  };

  const loadProviderReviews = async () => {
    try {
      const userData = await apiGet('/users/me');
      const providerId = userData.data.id;
      const data = await apiGet(`/reviews/provider/${providerId}`);
      renderReviews(data.data || []);
    } catch (err) {
      container.innerHTML = `<div class="alert alert--danger">${err.message}</div>`;
    }
  };

  const renderReviews = (reviews) => {
    if (!reviews || reviews.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⭐</div>
          <p class="empty-state__title">No reviews yet</p>
          <p class="empty-state__description">Reviews will appear here once you receive them.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="space-y-4">
        ${reviews.map(review => `
          <div class="card" style="border-left: 4px solid var(--color-accent);">
            <div class="flex items-center justify-between" style="margin-bottom: 0.75rem;">
              <div>
                <h3 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin: 0;">${review.title || 'Review'}</h3>
                <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin: 0;">Rating: ${'⭐'.repeat(review.rating)}</p>
              </div>
              <span class="badge badge--primary">${review.status}</span>
            </div>
            <p style="font-size: var(--text-sm); color: var(--theme-text-secondary); margin: 0;">${review.content}</p>
            ${review.response ? `<p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-top: 0.5rem;"><strong>Response:</strong> ${review.response}</p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  };

  myReviewsTab.addEventListener('click', () => {
    myReviewsTab.classList.remove('btn--ghost');
    myReviewsTab.classList.add('btn--primary');
    providerReviewsTab.classList.remove('btn--primary');
    providerReviewsTab.classList.add('btn--ghost');
    loadMyReviews();
  });

  providerReviewsTab.addEventListener('click', () => {
    providerReviewsTab.classList.remove('btn--ghost');
    providerReviewsTab.classList.add('btn--primary');
    myReviewsTab.classList.remove('btn--primary');
    myReviewsTab.classList.add('btn--ghost');
    loadProviderReviews();
  });

  loadMyReviews();
};

export { initReviewsPage };
