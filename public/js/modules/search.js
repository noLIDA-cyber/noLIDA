import { apiGet } from '../api.js';
import { showToast } from '../app.js';

const initSearch = async () => {
  const searchForm = document.getElementById('search-form');
  const resultsContainer = document.getElementById('search-results');

  if (!searchForm || !resultsContainer) return;

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
};

const renderResults = (results) => {
  const container = document.getElementById('search-results');
  if (!results || results.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">😔</div>
        <p class="empty-state__title">No results found</p>
        <p class="empty-state__description">Try adjusting your search terms or location.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
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

export { initSearch, renderResults };