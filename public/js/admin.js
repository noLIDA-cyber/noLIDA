import { apiGet, apiPost, apiPatch, apiDelete } from './api.js';
import { showToast } from './app.js';

const feeModal = document.getElementById('fee-modal');
const addFeeBtn = document.getElementById('add-fee-btn');
const closeFeeModal = document.getElementById('close-fee-modal');
const feeForm = document.getElementById('fee-form');

const formatCurrency = (amount, currency = 'NGN') => {
  if (amount === null || amount === undefined) return '--';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
};

const loadFees = async () => {
  const container = document.getElementById('fees-list');
  try {
    const data = await apiGet('/fees');
    const fees = data.data || [];

    if (fees.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">💰</div>
          <p class="empty-state__title">No fee rules configured</p>
          <p class="empty-state__description">Add fee rules to configure platform charges.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
        <thead>
          <tr style="border-bottom: 1px solid var(--theme-border);">
            <th style="text-align: left; padding: 0.5rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Name</th>
            <th style="text-align: left; padding: 0.5rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Type</th>
            <th style="text-align: left; padding: 0.5rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Calc</th>
            <th style="text-align: left; padding: 0.5rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Value</th>
            <th style="text-align: left; padding: 0.5rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Country</th>
            <th style="text-align: left; padding: 0.5rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Status</th>
            <th style="text-align: right; padding: 0.5rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Action</th>
          </tr>
        </thead>
        <tbody>
          ${fees.map(f => `
            <tr style="border-bottom: 1px solid var(--theme-border);">
              <td style="padding: 0.75rem 0.5rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">${f.name}</td>
              <td style="padding: 0.75rem 0.5rem; color: var(--theme-text-secondary);"><span class="badge badge--primary">${f.type}</span></td>
              <td style="padding: 0.75rem 0.5rem; color: var(--theme-text-secondary);">${f.calculation_type}</td>
              <td style="padding: 0.75rem 0.5rem; color: var(--theme-text-primary);">${f.calculation_type === 'percentage' ? f.value + '%' : formatCurrency(f.value, f.currency)}</td>
              <td style="padding: 0.75rem 0.5rem; color: var(--theme-text-secondary);">${f.country || 'All'}</td>
              <td style="padding: 0.75rem 0.5rem;">
                <span class="badge ${f.active ? 'badge--success' : 'badge--secondary'}">${f.active ? 'Active' : 'Inactive'}</span>
              </td>
              <td style="padding: 0.75rem 0.5rem; text-align: right;">
                <button class="btn btn--ghost btn--sm toggle-fee" data-id="${f.id}" data-active="${f.active}" style="color: var(--theme-accent);">${f.active ? 'Disable' : 'Enable'}</button>
                <button class="btn btn--ghost btn--sm delete-fee" data-id="${f.id}" style="color: var(--color-danger);">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.toggle-fee').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await apiPatch(`/fees/${btn.dataset.id}`, { active: btn.dataset.active === 'true' ? false : true });
          showToast('Fee updated', 'success');
          loadFees();
        } catch (error) {
          showToast(error.message || 'Failed to update fee', 'error');
        }
      });
    });

    container.querySelectorAll('.delete-fee').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this fee rule?')) return;
        try {
          await apiDelete(`/fees/${btn.dataset.id}`);
          showToast('Fee deleted', 'success');
          loadFees();
        } catch (error) {
          showToast(error.message || 'Failed to delete fee', 'error');
        }
      });
    });
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <p class="empty-state__title">Failed to load fees</p>
      </div>`;
  }
};

if (addFeeBtn) {
  addFeeBtn.addEventListener('click', () => {
    feeModal.style.display = 'flex';
  });
}

if (closeFeeModal) {
  closeFeeModal.addEventListener('click', () => {
    feeModal.style.display = 'none';
  });
}

if (feeModal) {
  feeModal.addEventListener('click', (e) => {
    if (e.target === feeModal) feeModal.style.display = 'none';
  });
}

if (feeForm) {
  feeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(feeForm);
    const btn = feeForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:0.5rem;"></div> Saving...';

    try {
      await apiPost('/fees', {
        name: formData.get('name'),
        type: formData.get('type'),
        calculationType: formData.get('calculationType'),
        value: parseFloat(formData.get('value')),
        currency: formData.get('currency') || 'NGN',
        country: formData.get('country') || null,
        minAmount: formData.get('minAmount') ? parseFloat(formData.get('minAmount')) : null,
        maxAmount: formData.get('maxAmount') ? parseFloat(formData.get('maxAmount')) : null,
      });
      showToast('Fee rule created', 'success');
      feeForm.reset();
      feeModal.style.display = 'none';
      loadFees();
    } catch (error) {
      showToast(error.message || 'Failed to create fee', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Save Fee Rule';
    }
  });
}

loadFees();
