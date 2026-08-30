import { apiGet, isAuthenticated } from '/js/api.js';

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
  toast.style.cssText = `padding: 0.75rem 1rem; border-left: 4px solid ${borderColor}; box-shadow: var(--shadow-md); font-size: var(--text-sm); color: var(--theme-text-primary);`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

const formatCurrency = (amount) => `₦${Number(amount || 0).toLocaleString()}`;
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const renderSparkline = (data, key, color) => {
  if (!data || data.length === 0) return '<span style="color: var(--theme-text-tertiary);">No data</span>';

  const max = Math.max(...data.map(d => d[key] || 0)) || 1;
  const width = 100;
  const height = 40;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d[key] || 0) / max) * height;
    return `${x},${y}`;
  }).join(' ');

  return `<svg width="${width}" height="${height}" style="display: block; margin-top: 0.5rem;"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"/></svg>`;
};

export const initAnalyticsPage = () => {
  const container = document.getElementById('analytics-content');
  if (!container) return;

  let currentDays = 30;

  const loadAnalytics = async () => {
    container.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto;"></div>';

    try {
      const [overviewRes, revenueRes, usersRes, bookingsRes, providersRes, categoriesRes] = await Promise.all([
        apiGet(`/analytics/overview?days=${currentDays}`),
        apiGet(`/analytics/revenue?days=${currentDays}`),
        apiGet(`/analytics/users?days=${currentDays}`),
        apiGet(`/analytics/bookings?days=${currentDays}`),
        apiGet(`/analytics/providers?days=${currentDays}`),
        apiGet('/analytics/categories'),
      ]);

      renderAnalytics(overviewRes.data, revenueRes.data, usersRes.data, bookingsRes.data, providersRes.data, categoriesRes.data);
    } catch (err) {
      container.innerHTML = `<div class="alert alert--danger">${err.message}</div>`;
    }
  };

  const renderAnalytics = (overview, revenue, users, bookings, providers, categories) => {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <h1 style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin-bottom: 0.25rem;">Analytics Dashboard</h1>
          <p style="color: var(--theme-text-secondary); margin: 0;">Platform-wide metrics and trends.</p>
        </div>
        <select id="analytics-range" class="form-input" style="background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text); width: auto;">
          <option value="7" ${currentDays === 7 ? 'selected' : ''}>Last 7 days</option>
          <option value="30" ${currentDays === 30 ? 'selected' : ''}>Last 30 days</option>
          <option value="90" ${currentDays === 90 ? 'selected' : ''}>Last 90 days</option>
          <option value="365" ${currentDays === 365 ? 'selected' : ''}>Last year</option>
        </select>
      </div>

      <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="card" style="border-left: 4px solid var(--color-accent);">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Total Users</p>
          <p style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${overview?.users?.total || 0}</p>
          <p style="font-size: var(--text-xs); color: var(--theme-text-tertiary); margin-top: 0.25rem;">+${overview?.users?.new_users || 0} new</p>
        </div>
        <div class="card" style="border-left: 4px solid var(--color-success);">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Total Revenue</p>
          <p style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${formatCurrency(overview?.transactions?.revenue)}</p>
          <p style="font-size: var(--text-xs); color: var(--theme-text-tertiary); margin-top: 0.25rem;">${formatCurrency(overview?.transactions?.platform_fees || 0)} platform fees</p>
        </div>
        <div class="card" style="border-left: 4px solid var(--color-purple);">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Total Bookings</p>
          <p style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${overview?.bookings?.total || 0}</p>
          <p style="font-size: var(--text-xs); color: var(--theme-text-tertiary); margin-top: 0.25rem;">${overview?.bookings?.completed || 0} completed · ${overview?.bookings?.cancelled || 0} cancelled</p>
        </div>
        <div class="card" style="border-left: 4px solid var(--color-pink);">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Active Listings</p>
          <p style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${overview?.listings?.active || 0}</p>
          <p style="font-size: var(--text-xs); color: var(--theme-text-tertiary); margin-top: 0.25rem;">${overview?.listings?.total || 0} total</p>
        </div>
      </div>

      <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
        <div class="card">
          <h2 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin-bottom: 1rem;">Revenue Trend</h2>
          ${renderSparkline(revenue, 'revenue', 'var(--color-accent)')}
          <div style="display: flex; justify-content: space-between; font-size: var(--text-xs); color: var(--theme-text-tertiary); margin-top: 0.5rem;">
            <span>${revenue.length > 0 ? formatDate(revenue[0].date) : ''}</span>
            <span>${revenue.length > 0 ? formatDate(revenue[revenue.length - 1].date) : ''}</span>
          </div>
        </div>

        <div class="card">
          <h2 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin-bottom: 1rem;">User Growth</h2>
          ${renderSparkline(users, 'new_users', 'var(--color-success)')}
          <div style="display: flex; justify-content: space-between; font-size: var(--text-xs); color: var(--theme-text-tertiary); margin-top: 0.5rem;">
            <span>${users.length > 0 ? formatDate(users[0].date) : ''}</span>
            <span>${users.length > 0 ? formatDate(users[users.length - 1].date) : ''}</span>
          </div>
        </div>
      </div>

      <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
        <div class="card">
          <h2 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin-bottom: 1rem;">Bookings by Status</h2>
          ${bookings?.by_status && bookings.by_status.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${bookings.by_status.map(s => `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="color: var(--theme-text-secondary); text-transform: capitalize;">${s.status}</span>
                  <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-weight: var(--weight-medium); color: var(--theme-text-primary);">${s.count}</span>
                    <span style="font-size: var(--text-sm); color: var(--theme-text-tertiary); min-width: 100px; text-align: right;">${formatCurrency(s.revenue)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<p style="color: var(--theme-text-secondary);">No booking data.</p>'}
        </div>

        <div class="card">
          <h2 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin-bottom: 1rem;">Top Categories</h2>
          ${categories && categories.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${categories.slice(0, 5).map(c => `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="color: var(--theme-text-secondary);">${c.category}</span>
                  <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-weight: var(--weight-medium); color: var(--theme-text-primary);">${c.total_bookings} bookings</span>
                    <span style="font-size: var(--text-sm); color: var(--theme-text-tertiary); min-width: 100px; text-align: right;">${formatCurrency(c.total_revenue)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<p style="color: var(--theme-text-secondary);">No category data.</p>'}
        </div>
      </div>

      <div class="card">
        <h2 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin-bottom: 1rem;">Top Providers</h2>
        ${providers?.top_providers && providers.top_providers.length > 0 ? `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
              <thead>
                <tr style="border-bottom: 1px solid var(--theme-border);">
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Provider</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Bookings</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Avg. Booking</th>
                  <th style="text-align: right; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${providers.top_providers.map(p => `
                  <tr style="border-bottom: 1px solid var(--theme-border);">
                    <td style="padding: 0.75rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">${p.display_name || p.email}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${p.bookings}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${formatCurrency(p.avg_booking)}</td>
                    <td style="padding: 0.75rem; text-align: right; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">${formatCurrency(p.revenue)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="color: var(--theme-text-secondary);">No provider data.</p>'}
      </div>
    `;

    const rangeSelect = document.getElementById('analytics-range');
    if (rangeSelect) {
      rangeSelect.addEventListener('change', (e) => {
        currentDays = parseInt(e.target.value);
        loadAnalytics();
      });
    }
  };

  loadAnalytics();
};
