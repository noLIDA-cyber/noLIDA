import { apiGet, apiPatch, apiDelete, isAuthenticated } from '/js/api.js';

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

const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const initAdminPage = () => {
  const container = document.getElementById('admin-content');
  if (!container) return;

  let currentTab = 'users';

  const loadTab = async (tab) => {
    currentTab = tab;
    container.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto;"></div>';

    try {
      if (tab === 'users') {
        const data = await apiGet('/admin/users?limit=50');
        renderUsers(data.data, data.pagination);
      } else if (tab === 'risk') {
        const data = await apiGet('/admin/risk?limit=50');
        renderRisk(data.data, data.pagination);
      } else if (tab === 'audit') {
        const data = await apiGet('/admin/audit-logs?limit=50');
        renderAudit(data.data, data.pagination);
      } else if (tab === 'fees') {
        const data = await apiGet('/fees');
        renderFees(data.data || []);
      }
    } catch (err) {
      container.innerHTML = `<div class="alert alert--danger">${err.message}</div>`;
    }
  };

  const renderUsers = (users, pagination) => {
    container.innerHTML = `
      <h1 style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin-bottom: 1.5rem;">User Management</h1>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
          <thead>
            <tr style="border-bottom: 1px solid var(--theme-border);">
              <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">ID</th>
              <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Email</th>
              <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Status</th>
              <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Created</th>
              <th style="text-align: right; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr style="border-bottom: 1px solid var(--theme-border);">
                <td style="padding: 0.75rem; color: var(--theme-text-primary);">#${u.id}</td>
                <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${u.email}</td>
                <td style="padding: 0.75rem;">
                  <span class="badge ${u.status === 'active' ? 'badge--success' : u.status === 'suspended' ? 'badge--warning' : 'badge--primary'}">${u.status}</span>
                </td>
                <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${formatDate(u.created_at)}</td>
                <td style="padding: 0.75rem; text-align: right;">
                  <select class="form-input user-status-select" data-id="${u.id}" style="padding: 0.25rem 0.5rem; font-size: var(--text-xs); background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text);">
                    <option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="suspended" ${u.status === 'suspended' ? 'selected' : ''}>Suspend</option>
                    <option value="deactivated" ${u.status === 'deactivated' ? 'selected' : ''}>Deactivate</option>
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll('.user-status-select').forEach(select => {
      select.addEventListener('change', async () => {
        try {
          await apiPatch(`/admin/users/${select.dataset.id}/status`, { status: select.value });
          showToast('User status updated', 'success');
        } catch (err) {
          showToast(err.message, 'error');
          select.value = users.find(u => u.id == select.dataset.id)?.status || 'active';
        }
      });
    });
  };

  const renderRisk = (events, pagination) => {
    container.innerHTML = `
      <h1 style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin-bottom: 1.5rem;">Risk Events</h1>
      ${events.length === 0 ? '<p style="color: var(--theme-text-secondary);">No risk events.</p>' : `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${events.map(e => `
            <div class="card" style="padding: 1rem; border: 1px solid var(--theme-border);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                <span class="badge badge--warning">${e.risk_type || 'risk'}</span>
                <span style="font-size: var(--text-xs); color: var(--theme-text-tertiary);">${formatDate(e.created_at)}</span>
              </div>
              <p style="color: var(--theme-text-secondary); font-size: var(--text-sm); margin: 0 0 0.5rem;">${e.description || 'No description'}</p>
              <div style="display: flex; gap: 0.5rem;">
                <span class="badge badge--primary">${e.status}</span>
                ${e.status !== 'resolved' ? `<button class="btn btn--primary btn--sm resolve-risk" data-id="${e.id}">Resolve</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;

    container.querySelectorAll('.resolve-risk').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await apiPatch(`/admin/risk/${btn.dataset.id}/resolve`, { status: 'resolved' });
          showToast('Risk event resolved', 'success');
          loadTab('risk');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  };

  const renderAudit = (logs, pagination) => {
    container.innerHTML = `
      <h1 style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin-bottom: 1.5rem;">Audit Logs</h1>
      ${logs.length === 0 ? '<p style="color: var(--theme-text-secondary);">No audit logs.</p>' : `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
            <thead>
              <tr style="border-bottom: 1px solid var(--theme-border);">
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Action</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Target</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">When</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr style="border-bottom: 1px solid var(--theme-border);">
                  <td style="padding: 0.75rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">${l.action}</td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${l.target_type} #${l.target_id}</td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${formatDate(l.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  };

  const renderFees = (fees) => {
    container.innerHTML = `
      <h1 style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin-bottom: 1.5rem;">Fee Configuration</h1>
      ${fees.length === 0 ? '<p style="color: var(--theme-text-secondary);">No fee rules configured.</p>' : `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
            <thead>
              <tr style="border-bottom: 1px solid var(--theme-border);">
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Name</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Type</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Value</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Category</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Active</th>
              </tr>
            </thead>
            <tbody>
              ${fees.map(f => `
                <tr style="border-bottom: 1px solid var(--theme-border);">
                  <td style="padding: 0.75rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">${f.name}</td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${f.type}</td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${f.calculation_type === 'percentage' ? `${f.value}%` : `₦${Number(f.value).toLocaleString()}`}</td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${f.category_id || 'All'}</td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${f.active ? 'Yes' : 'No'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  };

  const tabs = ['users', 'risk', 'audit', 'fees'];
  container.innerHTML = `
    <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--theme-border); padding-bottom: 0.5rem;">
      ${tabs.map(t => `<button class="btn btn--${currentTab === t ? 'primary' : 'ghost'} btn--sm tab-btn" data-tab="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`).join('')}
    </div>
    <div id="tab-content"></div>
  `;

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => loadTab(btn.dataset.tab));
  });

  const tabContent = document.getElementById('tab-content');
  if (tabContent) {
    const observer = new MutationObserver(() => {
      if (tabContent.innerHTML) {
        container.innerHTML += `<div id="tab-content" style="display: none;"></div>`;
        document.getElementById('tab-content').innerHTML = tabContent.innerHTML;
        document.getElementById('tab-content').style.display = 'block';
      }
    });
    observer.observe(tabContent, { childList: true });
  }

  loadTab(currentTab);
};
