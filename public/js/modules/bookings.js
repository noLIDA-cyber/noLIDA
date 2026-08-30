import { apiGet, apiPost, apiPatch, apiDelete, isAuthenticated } from '/js/api.js';

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

const formatTime = (time) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'TBD';
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const getStatusColor = (status) => {
  const colors = {
    pending: 'var(--color-warning)',
    confirmed: 'var(--color-success)',
    in_progress: 'var(--color-accent)',
    completed: 'var(--color-purple)',
    cancelled: 'var(--color-danger)',
    refunded: 'var(--color-text-tertiary)',
    disputed: 'var(--color-pink)',
    failed: 'var(--color-danger)',
  };
  return colors[status] || 'var(--color-text-tertiary)';
};

export const initBookingsPage = () => {
  const container = document.getElementById('bookings-list');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const searchInput = document.getElementById('booking-search');
  const newBookingBtn = document.getElementById('new-booking-btn');

  if (!container) return;

  let currentRole = 'customer';
  let currentStatus = '';
  let searchQuery = '';

  const loadBookings = async () => {
    container.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto;"></div>';

    const params = new URLSearchParams({ role: currentRole });
    if (currentStatus) params.set('status', currentStatus);
    if (searchQuery) params.set('search', searchQuery);

    try {
      const data = await apiGet(`/bookings?${params.toString()}`);
      renderBookings(data.data || []);
    } catch (err) {
      container.innerHTML = `<div class="alert alert--danger">${err.message}</div>`;
    }
  };

  const renderBookings = (bookings) => {
    if (bookings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📅</div>
          <p class="empty-state__title">No bookings found</p>
          <p class="empty-state__description">Your appointments will appear here.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
          <thead>
            <tr style="border-bottom: 1px solid var(--theme-border);">
              <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Listing</th>
              <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Date & Time</th>
              <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">${currentRole === 'provider' ? 'Customer' : 'Provider'}</th>
              <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Status</th>
              <th style="text-align: right; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Amount</th>
              <th style="text-align: right; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Action</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.map(b => `
              <tr style="border-bottom: 1px solid var(--theme-border); cursor: pointer;" class="booking-row" data-id="${b.id}">
                <td style="padding: 0.75rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">${b.listing_title || 'N/A'}</td>
                <td style="padding: 0.75rem; color: var(--theme-text-secondary);">
                  <div>${formatDate(b.booking_date)}</div>
                  <div style="font-size: var(--text-xs);">${formatTime(b.start_time)}${b.end_time ? ` - ${formatTime(b.end_time)}` : ''}</div>
                </td>
                <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${currentRole === 'provider' ? (b.customer_name || 'Customer') : (b.provider_name || 'Provider')}</td>
                <td style="padding: 0.75rem;">
                  <span class="badge" style="background: ${getStatusColor(b.transaction_status)}20; color: ${getStatusColor(b.transaction_status)};">${b.transaction_status}</span>
                </td>
                <td style="padding: 0.75rem; text-align: right; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">
                  ₦${Number(b.total_amount || 0).toLocaleString()}
                </td>
                <td style="padding: 0.75rem; text-align: right;">
                  <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    ${b.transaction_status === 'pending' && currentRole === 'provider' ? `<button class="btn btn--primary btn--sm confirm-booking" data-id="${b.id}">Confirm</button>` : ''}
                    ${b.transaction_status === 'confirmed' && currentRole === 'provider' ? `<button class="btn btn--primary btn--sm start-booking" data-id="${b.id}">Start</button>` : ''}
                    ${['pending', 'confirmed'].includes(b.transaction_status) ? `<button class="btn btn--ghost btn--sm cancel-booking" data-id="${b.id}" style="color: var(--color-danger);">Cancel</button>` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll('.booking-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        window.location.href = `/booking/${row.dataset.id}`;
      });
    });

    container.querySelectorAll('.confirm-booking').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await apiPatch(`/bookings/${btn.dataset.id}/status`, { status: 'confirmed' });
          showToast('Booking confirmed', 'success');
          loadBookings();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    container.querySelectorAll('.start-booking').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await apiPatch(`/bookings/${btn.dataset.id}/status`, { status: 'in_progress' });
          showToast('Booking started', 'success');
          loadBookings();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    container.querySelectorAll('.cancel-booking').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to cancel this booking?')) return;
        try {
          await apiPatch(`/bookings/${btn.dataset.id}/status`, { status: 'cancelled', reason: 'Cancelled by user' });
          showToast('Booking cancelled', 'success');
          loadBookings();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  };

  if (filterTabs) {
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => {
          t.classList.remove('btn--primary');
          t.classList.add('btn--ghost');
        });
        tab.classList.remove('btn--ghost');
        tab.classList.add('btn--primary');
        currentStatus = tab.dataset.status || '';
        loadBookings();
      });
    });
  }

  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchQuery = e.target.value.trim();
        loadBookings();
      }, 300);
    });
  }

  if (newBookingBtn) {
    newBookingBtn.addEventListener('click', () => {
      window.location.href = '/search';
    });
  }

  loadBookings();
};

export const initBookingDetail = () => {
  const container = document.getElementById('booking-detail');
  if (!container) return;

  const pathParts = window.location.pathname.split('/');
  const bookingId = pathParts[pathParts.length - 1];

  const loadBooking = async () => {
    container.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto;"></div>';
    try {
      const data = await apiGet(`/bookings/${bookingId}`);
      renderBooking(data);
    } catch (err) {
      container.innerHTML = `<div class="alert alert--danger">${err.message}</div>`;
    }
  };

  const renderBooking = (booking) => {
    container.innerHTML = `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin: 0 0 0.5rem;">${booking.listing_title || 'Booking Details'}</h1>
            <p style="color: var(--theme-text-secondary); margin: 0;">${booking.category_name || 'General'} · ${booking.organization_name || 'Independent'}</p>
          </div>
          <span class="badge" style="background: ${getStatusColor(booking.transaction_status)}20; color: ${getStatusColor(booking.transaction_status)}; font-size: var(--text-sm);">${booking.transaction_status}</span>
        </div>
      </div>

      <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        <div class="card">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Date</p>
          <p style="font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${formatDate(booking.booking_date)}</p>
        </div>
        <div class="card">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Time</p>
          <p style="font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${formatTime(booking.start_time)}${booking.end_time ? ` - ${formatTime(booking.end_time)}` : ''}</p>
        </div>
        <div class="card">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Total</p>
          <p style="font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--theme-accent);">₦${Number(booking.total_amount || 0).toLocaleString()}</p>
        </div>
      </div>

      <div class="card" style="margin-bottom: 1.5rem;">
        <h3 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin-bottom: 1rem;">Participants</h3>
        <div style="display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
          <div>
            <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Provider</p>
            <p style="color: var(--theme-text-primary); font-weight: var(--weight-medium);">${booking.provider_name || 'N/A'}</p>
            ${booking.provider_phone ? `<p style="font-size: var(--text-sm); color: var(--theme-text-secondary);">${booking.provider_phone}</p>` : ''}
          </div>
          <div>
            <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Organization</p>
            <p style="color: var(--theme-text-primary); font-weight: var(--weight-medium);">${booking.organization_name || 'N/A'}</p>
            ${booking.org_phone ? `<p style="font-size: var(--text-sm); color: var(--theme-text-secondary);">${booking.org_phone}</p>` : ''}
          </div>
        </div>
      </div>

      ${booking.notes ? `
        <div class="card" style="margin-bottom: 1.5rem;">
          <h3 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin-bottom: 0.5rem;">Notes</h3>
          <p style="color: var(--theme-text-secondary); white-space: pre-wrap;">${booking.notes}</p>
        </div>
      ` : ''}

      <div class="flex gap-2" style="gap: 0.5rem;">
        <a href="/bookings" class="btn btn--secondary">← Back to Bookings</a>
        ${['pending', 'confirmed'].includes(booking.transaction_status) ? `<button class="btn btn--danger" id="cancel-booking-btn" style="color: var(--color-danger); border-color: var(--color-danger);">Cancel Booking</button>` : ''}
      </div>
    `;

    const cancelBtn = document.getElementById('cancel-booking-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;
        try {
          await apiPatch(`/bookings/${bookingId}/status`, { status: 'cancelled', reason: 'Cancelled by user' });
          showToast('Booking cancelled', 'success');
          loadBooking();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  };

  loadBooking();
};

export const initProviderDashboard = () => {
  const container = document.getElementById('provider-content');
  if (!container) return;

  const loadDashboard = async () => {
    container.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto;"></div>';
    try {
      const [statsRes, bookingsRes, availabilityRes, listingsRes, customersRes] = await Promise.all([
        apiGet('/provider/dashboard'),
        apiGet('/provider/bookings'),
        apiGet('/provider/availability'),
        apiGet('/provider/listings'),
        apiGet('/customers/stats'),
      ]);

      renderDashboard(statsRes.data, bookingsRes.data, availabilityRes.data, listingsRes.data, customersRes.data);
    } catch (err) {
      container.innerHTML = `<div class="alert alert--danger">${err.message}</div>`;
    }
  };

  const renderDashboard = (stats, bookings, availability, listings, customerStats) => {
    const upcomingBookings = (bookings || []).filter(b => ['confirmed', 'in_progress'].includes(b.transaction_status));

    container.innerHTML = `
      <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="card" style="border-left: 4px solid var(--color-accent);">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Total Bookings (30d)</p>
          <p style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${stats?.bookings?.total || 0}</p>
        </div>
        <div class="card" style="border-left: 4px solid var(--color-success);">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Confirmed</p>
          <p style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${stats?.bookings?.confirmed || 0}</p>
        </div>
        <div class="card" style="border-left: 4px solid var(--color-purple);">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Revenue (30d)</p>
          <p style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">₦${Number(stats?.bookings?.revenue || 0).toLocaleString()}</p>
        </div>
        <div class="card" style="border-left: 4px solid var(--color-pink);">
          <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.25rem;">Active Listings</p>
          <p style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary);">${stats?.listings?.total || 0}</p>
        </div>
      </div>

      <div class="card" style="margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin: 0;">Upcoming Appointments</h2>
          <span class="badge badge--primary">${upcomingBookings.length} upcoming</span>
        </div>
        ${upcomingBookings.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state__icon">📅</div>
            <p class="empty-state__title">No upcoming appointments</p>
            <p class="empty-state__description">Confirmed bookings will appear here.</p>
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
              <thead>
                <tr style="border-bottom: 1px solid var(--theme-border);">
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Customer</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Service</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Date</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Time</th>
                  <th style="text-align: right; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${upcomingBookings.map(b => `
                  <tr style="border-bottom: 1px solid var(--theme-border);" class="booking-row" data-id="${b.id}">
                    <td style="padding: 0.75rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">${b.customer_name || 'Customer'}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${b.listing_title || 'N/A'}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${formatDate(b.booking_date)}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${formatTime(b.start_time)}${b.end_time ? ` - ${formatTime(b.end_time)}` : ''}</td>
                    <td style="padding: 0.75rem; text-align: right; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">₦${Number(b.total_amount || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <div class="card" style="margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin: 0;">Availability Schedule</h2>
          <button class="btn btn--primary btn--sm" id="add-availability-btn">Add Slot</button>
        </div>
        ${availability && availability.length > 0 ? `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
              <thead>
                <tr style="border-bottom: 1px solid var(--theme-border);">
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Day</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Start</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">End</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Max Slots</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Buffer</th>
                  <th style="text-align: right; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Action</th>
                </tr>
              </thead>
              <tbody>
                ${availability.map(a => `
                  <tr style="border-bottom: 1px solid var(--theme-border);">
                    <td style="padding: 0.75rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][a.day_of_week]}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${formatTime(a.start_time)}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${formatTime(a.end_time)}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${a.max_bookings_per_slot || 1}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${a.buffer_time || 0} min</td>
                    <td style="padding: 0.75rem; text-align: right;">
                      <button class="btn btn--ghost btn--sm delete-availability" data-id="${a.id}" style="color: var(--color-danger);">Delete</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-state__icon">🕐</div>
            <p class="empty-state__title">No availability set</p>
            <p class="empty-state__description">Set your weekly availability to start accepting bookings.</p>
          </div>
        `}
      </div>

      ${customerStats?.top_customers && customerStats.top_customers.length > 0 ? `
        <div class="card" style="margin-bottom: 2rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin: 0;">Top Customers</h2>
            <a href="/customers" class="btn btn--ghost btn--sm">View All</a>
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
              <thead>
                <tr style="border-bottom: 1px solid var(--theme-border);">
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Customer</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Bookings</th>
                  <th style="text-align: right; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Total Spend</th>
                </tr>
              </thead>
              <tbody>
                ${customerStats.top_customers.map(c => `
                  <tr style="border-bottom: 1px solid var(--theme-border);">
                    <td style="padding: 0.75rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">${c.display_name || c.email}</td>
                    <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${c.booking_count}</td>
                    <td style="padding: 0.75rem; text-align: right; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">₦${Number(c.total_spend || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <div class="card">
        <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin-bottom: 1rem;">My Listings</h2>
        ${listings && listings.length > 0 ? `
          <div style="display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
            ${listings.map(l => `
              <div class="card card--interactive" style="cursor: pointer;" onclick="window.location.href='/listing/${l.id}'">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <h3 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin: 0;">${l.title}</h3>
                  <span class="badge ${l.status === 'active' ? 'badge--success' : 'badge--primary'}">${l.status}</span>
                </div>
                <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin-bottom: 0.5rem;">${l.category_name || 'General'}</p>
                <p style="font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--theme-accent); margin: 0;">
                  ${l.pricing_type === 'hourly' && l.base_price ? `₦${Number(l.base_price).toLocaleString()} / hr` : l.base_price ? `₦${Number(l.base_price).toLocaleString()}` : 'Contact for price'}
                </p>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-state__icon">📋</div>
            <p class="empty-state__title">No listings yet</p>
            <p class="empty-state__description">Create your first listing to start receiving bookings.</p>
          </div>
        `}
      </div>
    `;

    container.querySelectorAll('.delete-availability').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this availability slot?')) return;
        try {
          await apiDelete(`/provider/availability/${btn.dataset.id}`);
          showToast('Availability removed', 'success');
          loadDashboard();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    const addAvailBtn = document.getElementById('add-availability-btn');
    if (addAvailBtn) {
      addAvailBtn.addEventListener('click', () => {
        const listingSelect = listings && listings.length > 0
          ? listings.map(l => `<option value="${l.id}">${l.title}</option>`).join('')
          : '<option value="">No listings available</option>';

        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 400; display: flex; align-items: center; justify-content: center; padding: 1rem;';
        modal.innerHTML = `
          <div class="card" style="width: 100%; max-width: 480px; padding: 1.5rem; background: var(--theme-card-bg); border-color: var(--theme-border);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
              <h3 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin: 0;">Add Availability</h3>
              <button class="btn btn--ghost btn--sm" id="close-avail-modal" style="color: var(--theme-text-secondary);">✕</button>
            </div>
            <form id="availability-form">
              <div class="form-group">
                <label class="form-label" for="avail-listing">Listing</label>
                <select id="avail-listing" class="form-input" required style="background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text);">
                  <option value="">Select a listing</option>
                  ${listingSelect}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="avail-day">Day</label>
                <select id="avail-day" class="form-input" required style="background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text);">
                  <option value="0">Sunday</option>
                  <option value="1" selected>Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label" for="avail-start">Start Time</label>
                  <input type="time" id="avail-start" class="form-input" required style="background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text);">
                </div>
                <div class="form-group">
                  <label class="form-label" for="avail-end">End Time</label>
                  <input type="time" id="avail-end" class="form-input" required style="background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text);">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="avail-max">Max Bookings Per Slot</label>
                <input type="number" id="avail-max" class="form-input" value="1" min="1" style="background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text);">
              </div>
              <div class="form-group">
                <label class="form-label" for="avail-buffer">Buffer Time (minutes)</label>
                <input type="number" id="avail-buffer" class="form-input" value="0" min="0" style="background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text);">
              </div>
              <button type="submit" class="btn btn--primary btn--block mt-4">Save Availability</button>
            </form>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('close-avail-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        document.getElementById('availability-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = e.target.querySelector('button[type="submit"]');
          btn.disabled = true;
          btn.innerHTML = 'Saving...';
          try {
            await apiPost('/provider/availability', {
              listingId: parseInt(document.getElementById('avail-listing').value),
              day_of_week: parseInt(document.getElementById('avail-day').value),
              start_time: document.getElementById('avail-start').value,
              end_time: document.getElementById('avail-end').value,
              max_bookings_per_slot: parseInt(document.getElementById('avail-max').value) || 1,
              buffer_time: parseInt(document.getElementById('avail-buffer').value) || 0,
            });
            showToast('Availability saved', 'success');
            modal.remove();
            loadDashboard();
          } catch (err) {
            showToast(err.message, 'error');
          } finally {
            btn.disabled = false;
            btn.innerHTML = 'Save Availability';
          }
        });
      });
    }

    container.querySelectorAll('.booking-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        window.location.href = `/booking/${row.dataset.id}`;
      });
    });
  };

  loadDashboard();
};
