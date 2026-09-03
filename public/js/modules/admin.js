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

const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const initAdminPage = async () => {
  const container = document.getElementById('admin-content');
  if (!container) return;

  if (!isAuthenticated()) {
    window.location.href = '/auth';
    return;
  }

  try {
    const status = await apiGet('/users/admin-status');
    if (!status.data?.isAdmin) {
      container.innerHTML = `
        <div class="card" style="max-width: 480px; margin: 4rem auto; padding: 2rem; text-align: center;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-danger); margin-bottom: 1rem;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <h1 style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin-bottom: 0.5rem;">Access Denied</h1>
          <p style="color: var(--theme-text-secondary); margin-bottom: 1.5rem;">You do not have permission to access the admin dashboard.</p>
          <a href="/" class="btn btn--primary" style="text-decoration: none;">Return Home</a>
        </div>`;
      return;
    }
  } catch (err) {
    container.innerHTML = `<div class="alert alert--danger">${err.message || 'Unable to verify admin access.'}</div>`;
    return;
  }

  let currentTab = 'users';

  const setActiveTab = (tab) => {
    document.querySelectorAll('.admin-tab').forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('btn--primary', isActive);
      btn.classList.toggle('btn--ghost', !isActive);
      btn.style.color = isActive ? 'var(--color-white)' : 'var(--theme-text-secondary)';
    });
  };

  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => loadTab(btn.dataset.tab));
  });

  const loadTab = async (tab) => {
    currentTab = tab;
    setActiveTab(tab);
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
      } else if (tab === 'auth-codes') {
        const data = await apiGet('/authorization-codes');
        renderAuthCodes(data.data || []);
      } else if (tab === 'business-approvals') {
        const data = await apiGet('/business-submissions');
        renderBusinessApprovals(data.data || []);
      }
    } catch (err) {
      container.innerHTML = `<div class="alert alert--danger">${err.message}</div>`;
    }
  };

  loadTab('users');

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

  const renderAuthCodes = (codes) => {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
        <h1 style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin: 0;">Authorization Codes</h1>
        <button class="btn btn--primary btn--sm" id="generate-code-btn">Generate Code</button>
      </div>
      ${codes.length === 0 ? '<p style="color: var(--theme-text-secondary);">No authorization codes.</p>' : `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
            <thead>
              <tr style="border-bottom: 1px solid var(--theme-border);">
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Code</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Purpose</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Status</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Uses</th>
                <th style="text-align: left; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Expires</th>
                <th style="text-align: right; padding: 0.75rem; color: var(--theme-text-secondary); font-weight: var(--weight-medium);">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${codes.map(c => `
                <tr style="border-bottom: 1px solid var(--theme-border);">
                  <td style="padding: 0.75rem; color: var(--theme-text-primary); font-weight: var(--weight-medium);">${c.code || '••••••••'}</td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${c.purpose}</td>
                  <td style="padding: 0.75rem;"><span class="badge ${c.status === 'active' ? 'badge--success' : c.status === 'used' ? 'badge--primary' : 'badge--warning'}">${c.status}</span></td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${c.used_count || 0} / ${c.max_uses}</td>
                  <td style="padding: 0.75rem; color: var(--theme-text-secondary);">${formatDate(c.expires_at)}</td>
                  <td style="padding: 0.75rem; text-align: right;">
                    ${c.status === 'active' ? `<button class="btn btn--ghost btn--sm revoke-code" data-id="${c.id}" style="color: var(--color-danger);">Revoke</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;

    container.querySelectorAll('.revoke-code').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Revoke this authorization code?')) return;
        try {
          await apiDelete(`/authorization-codes/${btn.dataset.id}`);
          showToast('Code revoked', 'success');
          loadTab('auth-codes');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    const generateBtn = document.getElementById('generate-code-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 400; display: flex; align-items: center; justify-content: center; padding: 1rem;';
        modal.innerHTML = `
          <div class="card" style="width: 100%; max-width: 480px; padding: 1.5rem; background: var(--theme-card-bg); border-color: var(--theme-border);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
              <h3 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin: 0;">Generate Authorization Code</h3>
              <button class="btn btn--ghost btn--sm" id="close-modal" style="color: var(--theme-text-secondary);">✕</button>
            </div>
            <form id="generate-code-form">
              <div class="form-group">
                <label class="form-label" for="code-email">Intended Email (optional)</label>
                <input type="email" id="code-email" name="intendedEmail" class="form-input" placeholder="user@example.com" style="background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text);">
              </div>
              <div class="form-group">
                <label class="form-label" for="code-uses">Maximum Uses</label>
                <input type="number" id="code-uses" name="maxUses" class="form-input" value="1" min="1" style="background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text);">
              </div>
              <div class="form-group">
                <label class="form-label" for="code-expiry">Expires In (days)</label>
                <input type="number" id="code-expiry" name="expiresInDays" class="form-input" value="30" min="1" style="background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text);">
              </div>
              <div class="form-group">
                <label class="form-label" for="code-notes">Notes</label>
                <textarea id="code-notes" name="notes" rows="2" class="form-input" style="background: var(--theme-input-bg); border-color: var(--theme-input-border); color: var(--theme-input-text); resize: vertical;"></textarea>
              </div>
              <button type="submit" class="btn btn--primary btn--block">Generate Code</button>
            </form>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        document.getElementById('generate-code-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = e.target.querySelector('button[type="submit"]');
          btn.disabled = true;
          btn.innerHTML = 'Generating...';

          try {
            const formData = new FormData(e.target);
            const data = await apiPost('/authorization-codes', {
              intendedEmail: formData.get('intendedEmail') || null,
              maxUses: parseInt(formData.get('maxUses')) || 1,
              expiresInDays: parseInt(formData.get('expiresInDays')) || 30,
              notes: formData.get('notes') || null,
            });
            modal.remove();
            showGeneratedCodeModal(data.data.code);
            loadTab('auth-codes');
          } catch (err) {
            showToast(err.message, 'error');
          } finally {
            btn.disabled = false;
            btn.innerHTML = 'Generate Code';
          }
        });
      });
    }
  };

  const showGeneratedCodeModal = (code) => {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 400; display: flex; align-items: center; justify-content: center; padding: 1rem;';
    modal.innerHTML = `
      <div class="card" style="width: 100%; max-width: 480px; padding: 1.5rem; background: var(--theme-card-bg); border-color: var(--theme-border);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <h3 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin: 0;">Authorization Code Generated</h3>
          <button class="btn btn--ghost btn--sm" id="code-modal-close" style="color: var(--theme-text-secondary);">✕</button>
        </div>
        <p style="color: var(--theme-text-secondary); font-size: var(--text-sm); margin: 0 0 0.5rem;">Share this code with the user via WhatsApp (07051679159). It will not be shown again.</p>
        <div style="background: var(--theme-bg-secondary); border: 1px solid var(--theme-border); border-radius: 6px; padding: 1rem; margin: 0.75rem 0; display: flex; align-items: center; gap: 0.5rem;">
          <code id="generated-code-text" style="flex: 1; font-family: ui-monospace, SFMono-Regular, monospace; font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); letter-spacing: 0.05em; word-break: break-all;">${code}</code>
          <button class="btn btn--primary btn--sm" id="copy-code-btn" style="white-space: nowrap;">Copy</button>
        </div>
        <div style="background: var(--color-warning); color: var(--color-white); padding: 0.75rem; border-radius: 6px; font-size: var(--text-sm); margin: 0 0 1rem;">
          <strong>Important:</strong> Save this code now. For security reasons, only the hash is stored in the database.
        </div>
        <button class="btn btn--primary btn--block" id="code-modal-done">Done</button>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('code-modal-close').addEventListener('click', close);
    document.getElementById('code-modal-done').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    document.getElementById('copy-code-btn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code);
        const btn = document.getElementById('copy-code-btn');
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1500);
      } catch (e) {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch {}
        ta.remove();
        showToast('Code copied', 'success');
      }
    });
  };

  const renderBusinessApprovals = (submissions) => {
    container.innerHTML = `
      <h1 style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--theme-text-primary); margin-bottom: 1.5rem;">Business Approvals</h1>
      ${submissions.length === 0 ? '<p style="color: var(--theme-text-secondary);">No pending submissions.</p>' : `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${submissions.map(s => `
            <div class="card" style="padding: 1.5rem; border: 1px solid var(--theme-border);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                <div>
                  <h3 style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--theme-text-primary); margin: 0 0 0.25rem;">${s.business_name}</h3>
                  <p style="font-size: var(--text-sm); color: var(--theme-text-tertiary); margin: 0;">${s.category_name || 'No category'} · ${s.user_email || s.user_name || 'Unknown user'}</p>
                </div>
                <span class="badge badge--warning">${s.status}</span>
              </div>
              <p style="color: var(--theme-text-secondary); font-size: var(--text-sm); margin: 0 0 1rem;">${s.description || 'No description provided.'}</p>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn--primary btn--sm approve-submission" data-id="${s.id}">Approve</button>
                <button class="btn btn--ghost btn--sm request-changes" data-id="${s.id}" style="color: var(--color-warning);">Request Changes</button>
                <button class="btn btn--ghost btn--sm reject-submission" data-id="${s.id}" style="color: var(--color-danger);">Reject</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;

    container.querySelectorAll('.approve-submission').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await apiPatch(`/business-submissions/${btn.dataset.id}/status`, { status: 'approved' });
          showToast('Business approved', 'success');
          loadTab('business-approvals');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    container.querySelectorAll('.reject-submission').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reason = prompt('Rejection reason:');
        if (!reason) return;
        try {
          await apiPatch(`/business-submissions/${btn.dataset.id}/status`, { status: 'rejected', notes: reason });
          showToast('Business rejected', 'success');
          loadTab('business-approvals');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    container.querySelectorAll('.request-changes').forEach(btn => {
      btn.addEventListener('click', async () => {
        const notes = prompt('Changes requested:');
        if (!notes) return;
        try {
          await apiPatch(`/business-submissions/${btn.dataset.id}/status`, { status: 'changes_requested', notes });
          showToast('Changes requested', 'success');
          loadTab('business-approvals');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  };
};
