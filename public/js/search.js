import { apiGet, apiPost, isAuthenticated } from './api.js';
import { showToast, navigate } from './app.js';

const searchForm = document.getElementById('search-form');
const resultsContainer = document.getElementById('search-results');
const requestBtn = document.getElementById('request-btn');
const requestModal = document.getElementById('request-modal');
const closeRequestModal = document.getElementById('close-request-modal');
const requestForm = document.getElementById('request-form');

const renderResults = (results) => {
  if (!results || results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">😔</div>
        <p class="empty-state__title">No results found</p>
        <p class="empty-state__description">Try adjusting your search terms or location.</p>
      </div>`;
    requestBtn.style.display = 'none';
    return;
  }

  requestBtn.style.display = 'inline-block';

  resultsContainer.innerHTML = `
    <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
      ${results.map(item => `
        <div class="card card--interactive" style="border-top: 3px solid var(--color-accent); background: var(--theme-card-bg); border-color: var(--theme-border);">
          <div class="flex items-center gap-3 mb-3">
            <div class="avatar">${item.business_name ? item.business_name[0] : '?'}</div>
            <div>
              <h3 style="font-size: var(--text-base); font-weight: var(--weight-semibold); color: var(--theme-text-primary);">${item.title || item.business_name || 'Untitled'}</h3>
              <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary);">${item.category_name || 'General'}</p>
            </div>
          </div>
          <p style="font-size: var(--text-sm); color: var(--theme-text-secondary); margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.description || 'No description available.'}</p>
          <div class="flex items-center justify-between">
            <span class="badge ${item.verified ? 'badge--success' : 'badge--primary'}">${item.verified ? 'Verified' : 'Unverified'}</span>
            <span style="font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--theme-accent);">View details →</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
};

const renderNaturalResults = (data) => {
  const parsed = data.parsed || {};
  let html = `
    <div class="card mb-4" style="background: var(--theme-card-bg); border-color: var(--theme-border); padding: 1rem;">
      <p style="font-size: var(--text-sm); color: var(--theme-text-secondary); margin-bottom: 0.5rem;">
        <strong>Interpreted:</strong> 
        ${parsed.category ? `Category: ${parsed.category}` : ''}
        ${parsed.location ? ` · Location: ${parsed.location}` : ''}
        ${parsed.priceRange?.max ? ` · Max: ₦${parsed.priceRange.max.toLocaleString()}` : ''}
        ${parsed.priceRange?.min ? ` · Min: ₦${parsed.priceRange.min.toLocaleString()}` : ''}
      </p>
    </div>
  `;

  if (!data.results || data.results.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state__icon">😔</div>
        <p class="empty-state__title">No results found</p>
        <p class="empty-state__description">Try adjusting your search terms or make a request.</p>
      </div>`;
    requestBtn.style.display = 'inline-block';
    resultsContainer.innerHTML = html;
    return;
  }

  requestBtn.style.display = 'inline-block';

  html += `
    <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
      ${data.results.map(item => `
        <div class="card card--interactive" style="border-top: 3px solid var(--color-accent); background: var(--theme-card-bg); border-color: var(--theme-border);">
          <div class="flex items-center gap-3 mb-3">
            <div class="avatar">${item.business_name ? item.business_name[0] : '?'}</div>
            <div>
              <h3 style="font-size: var(--text-base); font-weight: var(--weight-semibold); color: var(--theme-text-primary);">${item.title || item.business_name || 'Untitled'}</h3>
              <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary);">${item.category_name || 'General'}</p>
            </div>
          </div>
          <p style="font-size: var(--text-sm); color: var(--theme-text-secondary); margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.description || 'No description available.'}</p>
          <div class="flex items-center justify-between">
            <span class="badge ${item.verified ? 'badge--success' : 'badge--primary'}">${item.verified ? 'Verified' : 'Unverified'}</span>
            <span style="font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--theme-accent);">View details →</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  resultsContainer.innerHTML = html;
};

if (searchForm) {
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('search-query').value;
    const location = document.getElementById('search-location').value;

    resultsContainer.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto;"></div>';

    try {
      const data = await apiGet(`/search?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`);
      renderResults(data.data || []);
    } catch (error) {
      resultsContainer.innerHTML = `<div class="alert alert--danger">${error.message}</div>`;
    }
  });
}

if (requestBtn) {
  requestBtn.addEventListener('click', () => {
    requestModal.style.display = 'flex';
  });
}

if (closeRequestModal) {
  closeRequestModal.addEventListener('click', () => {
    requestModal.style.display = 'none';
  });
}

if (requestModal) {
  requestModal.addEventListener('click', (e) => {
    if (e.target === requestModal) requestModal.style.display = 'none';
  });
}

if (requestForm) {
  requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isAuthenticated()) {
      showToast('Please sign in to make a request', 'error');
      navigate('/auth');
      return;
    }

    const formData = new FormData(requestForm);
    const btn = requestForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:0.5rem;"></div> Submitting...';

    try {
      await apiPost('/requests', {
        title: formData.get('title'),
        description: formData.get('description'),
        location: formData.get('location'),
        budgetMin: formData.get('budgetMin') ? parseFloat(formData.get('budgetMin')) : null,
        budgetMax: formData.get('budgetMax') ? parseFloat(formData.get('budgetMax')) : null,
        urgency: formData.get('urgency') || 'normal',
      });
      showToast('Request submitted successfully!', 'success');
      requestForm.reset();
      requestModal.style.display = 'none';
    } catch (error) {
      showToast(error.message || 'Failed to submit request', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Submit Request';
    }
  });
}
