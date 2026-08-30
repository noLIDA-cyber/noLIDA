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

const formatCurrency = (amount) => {
  return `₦${Number(amount || 0).toLocaleString()}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const initCustomersPage = () => {
  const container = document.getElementById('customers-content');
  if (!container) return;

  let currentPage = 1;
  let searchQuery = '';

  const loadCustomers = async () => {
    container.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto;"></div>';

    try {
      const [customersRes, statsRes] = await Promise.all([
        apiGet(`/customers?page=${currentPage}&search=${encodeURIComponent(searchQuery)}`),
        apiGet('/customers/stats'),
      ]);

      renderCustomers(customersRes.data.data, customersRes.data.pagination, statsRes.data);
    } catch (err) {
      container.innerHTML = `<div class="alert alert--danger">${err.message}</div>`;
    }
  };

  const renderCustomers = (customers, pagination, stats) => {
    container.innerHTML = `
      <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="card" style="border-left: 4px solid var(--color-accent);">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Total Customers</p>
          <p style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${stats?.total_customers || 0}</p>
        </div>
        <div class="card" style="border-left: 4px solid var(--color-success);">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">New (30 days)</p>
          <p style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${stats?.new_customers_30d || 0}</p>
        </div>
        <div class="card" style="border-left: 4px solid var(--color-purple);">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Total Revenue</p>
          <p style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${formatCurrency(stats?.total_revenue)}</p>
        </div>
        <div class="card" style="border-left: 4px solid var(--color-pink);">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Avg. Booking Value</p>
          <p style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${formatCurrency(stats?.avg_booking_value)}</p>
        </div>
      </div>

      <div class="card" style="padding: 0.5rem 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
        <input type="text" id="customer-search" class="form-input" placeholder="Search customers..." value="${searchQuery}" style="background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text); flex: 1; min-width: 200px; max-width: 320px;">
      </div>

      ${customers.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state__icon">👥</div>
          <p class="empty-state__title">No customers found</p>
          <p class="empty-state__description">Customers will appear here after their first booking.</p>
        </div>
      ` : `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
            <thead>
              <tr style="border-bottom: 1px solid var(--theme-border);">
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Customer</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Email</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Bookings</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Total Spend</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Last Activity</th>
                <th style="text-align: right; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Action</th>
              </tr>
            </thead>
            <tbody>
              ${customers.map(c => `
                <tr style="border-bottom: 1px solid var(--theme-border);" class="customer-row" data-id="${c.id}">
                  <td style="padding: 0.75rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <div class="avatar">${getInitials(c.display_name)}</div>
                      <span>${c.display_name || 'Customer'}</span>
                    </div>
                  </td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${c.email}</td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${c.total_bookings}</td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">${formatCurrency(c.total_spend)}</td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${formatDate(c.last_activity)}</td>
                  <td style="padding: 0.75rem; text-align: right;">
                    <a href="/customer/${c.id}" class="btn btn--ghost btn--sm">View</a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${pagination.pages > 1 ? `
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 1.5rem;">
            <button class="btn btn--ghost btn--sm" id="prev-page" ${currentPage <= 1 ? 'disabled' : ''}>Previous</button>
            <span style="color: var(--theme-text-secondary); font-size: var(--text-sm);">Page ${pagination.page} of ${pagination.pages}</span>
            <button class="btn btn--ghost btn--sm" id="next-page" ${currentPage >= pagination.pages ? 'disabled' : ''}>Next</button>
          </div>
        ` : ''}
      `}
    `;

    container.querySelectorAll('.customer-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        window.location.href = `/customer/${row.dataset.id}`;
      });
    });

    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          loadCustomers();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < pagination.pages) {
          currentPage++;
          loadCustomers();
        }
      });
    }
  };

  const searchInput = document.getElementById('customer-search');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchQuery = e.target.value.trim();
        currentPage = 1;
        loadCustomers();
      }, 300);
    });
  }

  loadCustomers();
};

export const initCustomerDetail = () => {
  const container = document.getElementById('customer-detail');
  if (!container) return;

  const pathParts = window.location.pathname.split('/');
  const customerId = pathParts[pathParts.length - 1];

  const loadCustomer = async () => {
    container.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto;"></div>';
    try {
      const data = await apiGet(`/customers/${customerId}`);
      renderCustomer(data.data);
    } catch (err) {
      container.innerHTML = `<div class="alert alert--danger">${err.message}</div>`;
    }
  };

  const renderCustomer = (data) => {
    const customer = data.customer;
    const bookings = data.bookings || [];
    const orders = data.orders || [];
    const reviews = data.reviews || [];

    container.innerHTML = `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div class="avatar" style="width: 64px; height: 64px; font-size: var(--text-2xl);">${getInitials(customer.display_name)}</div>
          <div style="flex: 1; min-width: 200px;">
            <h1 style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin: 0 0 0.25rem;">${customer.display_name || 'Customer'}</h1>
            <p style="color: var(--theme-text-secondary); margin: 0 0 0.25rem;">${customer.email}</p>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
              <span class="badge ${customer.status === 'active' ? 'badge--success' : 'badge--primary'}">${customer.status || 'Active'}</span>
              ${customer.phone ? `<span class="badge badge--primary">${customer.phone}</span>` : ''}
              ${customer.country ? `<span class="badge badge--primary">${customer.country}</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="card">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Total Spend</p>
          <p style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${formatCurrency(customer.total_spend)}</p>
        </div>
        <div class="card">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Total Bookings</p>
          <p style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${customer.total_bookings}</p>
        </div>
        <div class="card">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">First Booking</p>
          <p style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${formatDate(customer.first_booking)}</p>
        </div>
        <div class="card">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Last Activity</p>
          <p style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${formatDate(customer.last_activity)}</p>
        </div>
      </div>

      ${customer.bio ? `
        <div class="card" style="margin-bottom: 2rem;">
          <h3 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin-bottom: 0.5rem;">Bio</h3>
          <p style="color: var(--theme-text-secondary); white-space: pre-wrap;">${customer.bio}</p>
        </div>
      ` : ''}

      <div class="card" style="margin-bottom: 2rem;">
        <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin-bottom: 1rem;">Recent Appointments</h2>
        ${bookings.length === 0 ? `<p style="color: var(--theme-text-secondary);">No appointments yet.</p>` : `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
              <thead>
                <tr style="border-bottom: 1px solid var(--theme-border);">
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Service</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Date</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Time</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Status</th>
                  <th style="text-align: right; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${bookings.map(b => `
                  <tr style="border-bottom: 1px solid var(--theme-border);" class="booking-row" data-id="${b.id}">
                    <td style="padding: 0.75rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">${b.listing_title || 'N/A'}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${formatDate(b.booking_date)}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${b.start_time}${b.end_time ? ` - ${b.end_time}` : ''}</td>
                    <td style="padding: 0.75rem;"><span class="badge">${b.transaction_status}</span></td>
                    <td style="padding: 0.75rem; text-align: right; color: var(--theme-text-secondary);">${formatCurrency(b.total_amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <div class="card" style="margin-bottom: 2rem;">
        <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin-bottom: 1rem;">Recent Orders</h2>
        ${orders.length === 0 ? `<p style="color: var(--theme-text-secondary);">No orders yet.</p>` : `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
              <thead>
                <tr style="border-bottom: 1px solid var(--theme-border);">
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Service</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Category</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Status</th>
                  <th style="text-align: right; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${orders.map(o => `
                  <tr style="border-bottom: 1px solid var(--theme-border);" class="booking-row" data-id="${o.id}">
                    <td style="padding: 0.75rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">${o.listing_title || 'N/A'}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${o.category_name || 'N/A'}</td>
                    <td style="padding: 0.75rem;"><span class="badge">${o.transaction_status}</span></td>
                    <td style="padding: 0.75rem; text-align: right; color: var(--theme-text-secondary);">${formatCurrency(o.total_amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <div class="card">
        <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin-bottom: 1rem;">Reviews</h2>
        ${reviews.length === 0 ? `<p style="color: var(--theme-text-secondary);">No reviews yet.</p>` : `
          <div style="display: grid; gap: 1rem;">
            ${reviews.map(r => `
              <div style="padding: 1rem; border-bottom: 1px solid var(--theme-border);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <span style="font-weight: var(--weight-medium); color: var(--theme-text-primary);">${r.listing_title || 'Review'}</span>
                  <span style="color: var(--color-warning);">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p style="color: var(--theme-text-secondary); font-size: var(--text-sm); margin: 0;">${r.content || ''}</p>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    container.querySelectorAll('.booking-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        window.location.href = `/booking/${row.dataset.id}`;
      });
    });
  };

  loadCustomer();
};
