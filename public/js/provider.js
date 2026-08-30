import { apiGet, apiPost, apiDelete, getCurrentUser, isAuthenticated } from './api.js';
import { showToast, showLoading, navigate } from './app.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

const formatCurrency = (amount, currency = 'NGN') => {
  if (amount === null || amount === undefined) return '--';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '--';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const loadStats = async () => {
  try {
    const data = await apiGet('/provider/dashboard');
    const stats = data.data;

    document.getElementById('stat-revenue').textContent = formatCurrency(stats.bookings?.total_revenue || 0);
    document.getElementById('stat-bookings').textContent = stats.bookings?.total || 0;
    document.getElementById('stat-listings').textContent = stats.listings?.total || 0;
    document.getElementById('stat-rating').textContent = stats.reviews?.avg_rating ? parseFloat(stats.reviews.avg_rating).toFixed(1) : '--';
  } catch (error) {
    showToast(error.message || 'Failed to load stats', 'error');
  }
};

const loadUpcomingBookings = async () => {
  const container = document.getElementById('upcoming-list');
  try {
    const data = await apiGet('/provider/bookings?limit=10');
    const bookings = data.data || [];

    if (bookings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📅</div>
          <p class="empty-state__title">No upcoming bookings</p>
          <p class="empty-state__description">Your upcoming appointments will appear here.</p>
        </div>`;
      return;
    }

    container.innerHTML = bookings.map(b => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border-bottom: 1px solid var(--theme-border);">
        <div>
          <p style="font-weight: var(--weight-medium); color: var(--theme-text-primary); font-size: var(--text-sm);">${b.listing_title || 'Service'}</p>
          <p style="font-size: var(--text-xs); color: var(--theme-text-secondary);">${formatDate(b.booking_date)} · ${formatTime(b.start_time)} - ${formatTime(b.end_time)}</p>
        </div>
        <span class="badge badge--${b.transaction_status === 'confirmed' ? 'success' : b.transaction_status === 'in_progress' ? 'warning' : 'secondary'}">${b.transaction_status || 'pending'}</span>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <p class="empty-state__title">Failed to load bookings</p>
      </div>`;
  }
};

const renderCalendar = () => {
  const grid = document.getElementById('calendar-grid');
  const today = new Date();
  const currentDay = today.getDay();

  let html = '<div style="background: var(--theme-bg-tertiary); padding: 0.5rem; font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--theme-text-tertiary);"></div>';
  DAYS.forEach((day, i) => {
    const isToday = i === currentDay;
    html += `<div style="background: var(--theme-bg-tertiary); padding: 0.5rem; font-size: var(--text-xs); font-weight: var(--weight-medium); color: ${isToday ? 'var(--color-accent)' : 'var(--theme-text-tertiary)'}; text-align: center;">${day}${isToday ? ' (Today)' : ''}</div>`;
  });

  HOURS.forEach(hour => {
    const timeLabel = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
    html += `<div style="background: var(--theme-bg-tertiary); padding: 0.5rem; font-size: var(--text-xs); color: var(--theme-text-tertiary);">${timeLabel}</div>`;
    DAYS.forEach((_, i) => {
      const isToday = i === currentDay;
      const isWorkHour = hour >= 9 && hour <= 17;
      html += `<div style="background: ${isToday ? 'var(--theme-bg-secondary)' : 'var(--theme-card-bg)'}; min-height: 40px; border-left: ${isWorkHour ? '2px solid var(--theme-border)' : 'none'}; opacity: ${isWorkHour ? 1 : 0.5};"></div>`;
    });
  });

  grid.innerHTML = html;
};

const loadAvailability = async () => {
  const container = document.getElementById('availability-list');
  try {
    const data = await apiGet('/provider/availability');
    const slots = data.data || [];

    if (slots.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🕐</div>
          <p class="empty-state__title">No availability set</p>
          <p class="empty-state__description">Add your weekly availability to start accepting bookings.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
        <thead>
          <tr style="border-bottom: 1px solid var(--theme-border);">
            <th style="text-align: left; padding: 0.5rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Day</th>
            <th style="text-align: left; padding: 0.5rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Hours</th>
            <th style="text-align: left; padding: 0.5rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Break</th>
            <th style="text-align: left; padding: 0.5rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Capacity</th>
            <th style="text-align: right; padding: 0.5rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Action</th>
          </tr>
        </thead>
        <tbody>
          ${slots.map(s => `
            <tr style="border-bottom: 1px solid var(--theme-border);">
              <td style="padding: 0.75rem 0.5rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">${DAYS[s.day_of_week] || 'Day ' + s.day_of_week}</td>
              <td style="padding: 0.75rem 0.5rem; color: var(--theme-text-primary);">${formatTime(s.start_time)} - ${formatTime(s.end_time)}</td>
              <td style="padding: 0.75rem 0.5rem; color: var(--theme-text-secondary);">${s.break_start ? formatTime(s.break_start) + ' - ' + formatTime(s.break_end) : '--'}</td>
              <td style="padding: 0.75rem 0.5rem; color: var(--theme-text-secondary);">${s.max_bookings_per_slot || 1} slot${s.max_bookings_per_sot > 1 ? 's' : ''}</td>
              <td style="padding: 0.75rem 0.5rem; text-align: right;">
                <button class="btn btn--ghost btn--sm delete-availability" data-id="${s.id}" style="color: var(--color-danger);">Remove</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.delete-availability').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this availability slot?')) return;
        try {
          await apiDelete(`/provider/availability/${btn.dataset.id}`);
          showToast('Availability removed', 'success');
          loadAvailability();
        } catch (error) {
          showToast(error.message || 'Failed to remove availability', 'error');
        }
      });
    });
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <p class="empty-state__title">Failed to load availability</p>
      </div>`;
  }
};

const loadListings = async () => {
  const container = document.getElementById('listings-list');
  try {
    const data = await apiGet('/provider/listings');
    const listings = data.data || [];

    if (listings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📦</div>
          <p class="empty-state__title">No listings yet</p>
          <p class="empty-state__description">Create a listing to start receiving bookings.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
        ${listings.map(l => `
          <div class="card" style="border: 1px solid var(--theme-border); background: var(--theme-card-bg);">
            <p style="font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin-bottom: 0.25rem;">${l.title}</p>
            <p style="font-size: var(--text-sm); color: var(--theme-text-secondary); margin-bottom: 0.5rem;">${l.category_name}</p>
            <p style="font-size: var(--text-sm); color: var(--theme-text-secondary);">
              ${l.pricing_type === 'fixed' ? formatCurrency(l.base_price, l.currency) : l.pricing_type || 'Pricing not set'}
            </p>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <p class="empty-state__title">Failed to load listings</p>
      </div>`;
  }
};

const initAvailabilityModal = async () => {
  const modal = document.getElementById('availability-modal');
  const addBtn = document.getElementById('add-availability-btn');
  const closeBtn = document.getElementById('close-modal');
  const form = document.getElementById('availability-form');
  const listingSelect = document.getElementById('av-listing');

  addBtn.addEventListener('click', async () => {
    try {
      const data = await apiGet('/provider/listings');
      const listings = data.data || [];
      listingSelect.innerHTML = '<option value="">Select a listing</option>' + listings.map(l => `<option value="${l.id}">${l.title}</option>`).join('');
      modal.style.display = 'flex';
    } catch (error) {
      showToast('Failed to load listings', 'error');
    }
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:0.5rem;"></div> Saving...';

    try {
      await apiPost('/provider/availability', {
        listingId: parseInt(formData.get('listingId')),
        day_of_week: parseInt(formData.get('day_of_week')),
        start_time: formData.get('start_time'),
        end_time: formData.get('end_time'),
        break_start: formData.get('break_start') || null,
        break_end: formData.get('break_end') || null,
        max_bookings_per_slot: parseInt(formData.get('max_bookings_per_slot')) || 1,
        buffer_time: parseInt(formData.get('buffer_time')) || 0,
      });
      showToast('Availability saved', 'success');
      form.reset();
      modal.style.display = 'none';
      loadAvailability();
    } catch (error) {
      showToast(error.message || 'Failed to save availability', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Save Availability';
    }
  });
};

const init = async () => {
  if (!isAuthenticated()) {
    navigate('/auth');
    return;
  }

  document.getElementById('logout-btn').addEventListener('click', async () => {
    const { logout } = await import('./auth.js');
    logout();
  });

  await loadStats();
  await loadUpcomingBookings();
  renderCalendar();
  await loadAvailability();
  await loadListings();
  await initAvailabilityModal();
};

init();
