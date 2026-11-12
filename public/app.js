/**
 * KLIP URL SHORTENER — FRONTEND APPLICATION
 * Modern, Minimal, Interactive SPA
 */

// Application State
const state = {
  token: localStorage.getItem('klip_token') || null,
  user: JSON.parse(localStorage.getItem('klip_user') || 'null'),
  links: [],
  analytics: null,
  activeTab: 'dashboard',
  currentFilter: 'all',
  searchQuery: '',
};

// API Helper
const api = {
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
      const res = await fetch(endpoint, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      
      if (res.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/signup')) {
        // Token expired or invalid
        auth.logout();
        throw new Error('Your session has expired. Please sign in again.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  login(email, password) {
    return this.request('/user/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  signup(firstName, lastName, email, password) {
    return this.request('/user/signup', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, email, password })
    });
  },

  getMe() {
    return this.request('/user/me');
  },

  updateProfile(firstName, lastName) {
    return this.request('/user/me', {
      method: 'PATCH',
      body: JSON.stringify({ firstName, lastName })
    });
  },

  shorten(url, code, expiresAt, password) {
    return this.request('/shorten', {
      method: 'POST',
      body: JSON.stringify({ url, code, expiresAt, password })
    });
  },

  getLinks() {
    return this.request('/codes');
  },

  getAnalytics() {
    return this.request('/analytics');
  },

  deleteLink(id) {
    return this.request(`/${id}`, { method: 'DELETE' });
  }
};

// Auth Management
const auth = {
  init() {
    if (state.token) {
      this.hideAuthOverlay();
      this.refreshUser();
      app.init();
    } else {
      this.showAuthOverlay();
    }
  },

  async refreshUser() {
    try {
      const data = await api.getMe();
      if (data && data.user) {
        state.user = data.user;
        localStorage.setItem('klip_user', JSON.stringify(data.user));
        ui.renderUserProfile();
      }
    } catch (e) {
      console.warn('Could not refresh user profile:', e);
    }
  },

  setSession(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem('klip_token', token);
    localStorage.setItem('klip_user', JSON.stringify(user));
    this.hideAuthOverlay();
    ui.renderUserProfile();
    app.init();
  },

  logout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('klip_token');
    localStorage.removeItem('klip_user');
    this.showAuthOverlay();
    showToast('Signed out successfully.', 'info');
  },

  showAuthOverlay() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'flex';
  },

  hideAuthOverlay() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'none';
  }
};

// UI Rendering & Interactivity
const ui = {
  renderUserProfile() {
    if (!state.user) return;
    const nameEls = document.querySelectorAll('.user-display-name');
    const emailEls = document.querySelectorAll('.user-display-email');
    const avatarEls = document.querySelectorAll('.user-display-avatar');

    const fullName = [state.user.firstName, state.user.lastName].filter(Boolean).join(' ') || 'User';
    const initials = (state.user.firstName?.[0] || 'U') + (state.user.lastName?.[0] || '');

    nameEls.forEach(el => el.textContent = fullName);
    emailEls.forEach(el => el.textContent = state.user.email);
    avatarEls.forEach(el => el.textContent = initials.toUpperCase());

    // Settings fields
    const settingsFirst = document.getElementById('settingsFirstName');
    const settingsLast = document.getElementById('settingsLastName');
    const settingsEmail = document.getElementById('settingsEmail');
    const settingsId = document.getElementById('settingsUserId');
    if (settingsFirst) settingsFirst.value = state.user.firstName || '';
    if (settingsLast) settingsLast.value = state.user.lastName || '';
    if (settingsEmail) settingsEmail.value = state.user.email || '';
    if (settingsId) settingsId.textContent = state.user.id || '—';
  },

  renderMetrics() {
    const totalLinks = state.links.length;
    const totalClicks = state.links.reduce((sum, l) => sum + (l.clicks || 0), 0);
    const activeLinks = state.links.filter(l => !l.isExpired).length;
    const protectedLinks = state.links.filter(l => l.isPasswordProtected).length;

    document.querySelectorAll('.stat-total-links').forEach(el => el.textContent = totalLinks);
    document.querySelectorAll('.stat-total-clicks').forEach(el => el.textContent = totalClicks);
    document.querySelectorAll('.stat-active-links').forEach(el => el.textContent = activeLinks);
    document.querySelectorAll('.stat-protected-links').forEach(el => el.textContent = protectedLinks);

    // Sidebar badge
    const badge = document.getElementById('sidebarLinksCount');
    if (badge) badge.textContent = totalLinks;
  },

  renderRecentLinks() {
    const container = document.getElementById('recentLinksTableBody');
    if (!container) return;

    const recent = state.links.slice(0, 5);

    if (recent.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <div class="empty-state-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <h3>No shortened links yet</h3>
            <p>Paste a long URL above to generate your first clean short link.</p>
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = recent.map(link => this.buildLinkRowHtml(link)).join('');
  },

  renderMyLinks() {
    const container = document.getElementById('myLinksTableBody');
    if (!container) return;

    let filtered = [...state.links];

    // Filter by tab
    if (state.currentFilter === 'active') {
      filtered = filtered.filter(l => !l.isExpired);
    } else if (state.currentFilter === 'expired') {
      filtered = filtered.filter(l => l.isExpired);
    } else if (state.currentFilter === 'protected') {
      filtered = filtered.filter(l => l.isPasswordProtected);
    }

    // Filter by search query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        l.shortCode.toLowerCase().includes(q) || 
        l.targetURL.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <h3>No links found</h3>
            <p>${state.searchQuery ? 'No links match your search query.' : 'No links under this filter.'}</p>
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = filtered.map(link => this.buildLinkRowHtml(link, true)).join('');
  },

  buildLinkRowHtml(link, isFullTable = false) {
    const origin = window.location.origin;
    const shortUrl = `${origin}/${link.shortCode}`;
    const dateFormatted = new Date(link.createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    let expirationHtml = '<span class="status-badge badge-active"><span class="status-dot"></span> Active</span>';
    if (link.isExpired) {
      expirationHtml = '<span class="status-badge badge-expired"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Expired</span>';
    } else if (link.expiresAt) {
      const expDate = new Date(link.expiresAt);
      const diffHours = Math.round((expDate - new Date()) / (1000 * 60 * 60));
      const expText = diffHours < 48 ? `${diffHours}h left` : expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      expirationHtml = `<span class="status-badge badge-active" title="Expires ${expDate.toLocaleString()}"><span class="status-dot"></span> ${expText}</span>`;
    }

    const passwordBadge = link.isPasswordProtected 
      ? `<span class="status-badge badge-protected" title="Password Protected"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Protected</span>`
      : '';

    return `
      <tr data-id="${link.id}">
        <td>
          <div class="shortcode-cell">
            <span class="shortcode-text">/${escapeHtml(link.shortCode)}</span>
            ${passwordBadge}
          </div>
        </td>
        <td>
          <div class="target-url-cell" title="${escapeHtml(link.targetURL)}">
            <a href="${escapeHtml(link.targetURL)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(link.targetURL)}
            </a>
          </div>
        </td>
        <td>
          <span class="clicks-badge">${link.clicks || 0}</span>
        </td>
        <td>
          ${expirationHtml}
        </td>
        ${isFullTable ? `<td><span style="color: var(--text-muted); font-size: 0.8rem;">${dateFormatted}</span></td>` : ''}
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-icon" onclick="copyToClipboard('${escapeHtml(shortUrl)}')" title="Copy Short Link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon" onclick="openQrModal('${escapeHtml(link.shortCode)}', '${escapeHtml(shortUrl)}')" title="View QR Code">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
            </button>
            <button class="btn btn-danger-ghost btn-icon" onclick="confirmDeleteLink('${link.id}', '${escapeHtml(link.shortCode)}')" title="Delete Link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  renderAnalytics(data) {
    if (!data) return;

    // Summary cards
    const totalClicks = data.totalClicks || 0;
    const totalLinks = data.totalLinks || 0;
    const avgClicks = totalLinks > 0 ? (totalClicks / totalLinks).toFixed(1) : 0;
    const activeRate = totalLinks > 0 ? Math.round((data.activeLinks / totalLinks) * 100) : 0;

    const elTotalClicks = document.getElementById('analyticsTotalClicks');
    const elTotalLinks = document.getElementById('analyticsTotalLinks');
    const elAvgClicks = document.getElementById('analyticsAvgClicks');
    const elActiveRate = document.getElementById('analyticsActiveRate');

    if (elTotalClicks) elTotalClicks.textContent = totalClicks;
    if (elTotalLinks) elTotalLinks.textContent = totalLinks;
    if (elAvgClicks) elAvgClicks.textContent = avgClicks;
    if (elActiveRate) elActiveRate.textContent = `${activeRate}%`;

    // Render Bar Chart
    this.renderBarChart(data.topLinks || []);

    // Render Leaderboard
    this.renderLeaderboard(data.topLinks || [], totalClicks);
  },

  renderBarChart(topLinks) {
    const container = document.getElementById('barChartContainer');
    if (!container) return;

    if (!topLinks || topLinks.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 32px 0;">
          <p>No click data yet. Share your shortened links to view real-time statistics.</p>
        </div>
      `;
      return;
    }

    const maxClicks = Math.max(...topLinks.map(l => l.clicks || 0), 1);

    const barsHtml = topLinks.slice(0, 8).map(link => {
      const clicks = link.clicks || 0;
      const heightPercent = Math.max(Math.round((clicks / maxClicks) * 100), 6);
      return `
        <div class="bar-col">
          <div class="bar-pill" style="height: ${heightPercent}%;">
            <div class="bar-tooltip">/${escapeHtml(link.shortCode)}: ${clicks} clicks</div>
          </div>
          <div class="bar-label" title="${escapeHtml(link.shortCode)}">/${escapeHtml(link.shortCode)}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="bar-chart-visual">
        ${barsHtml}
      </div>
    `;
  },

  renderLeaderboard(topLinks, totalClicks) {
    const container = document.getElementById('leaderboardContainer');
    if (!container) return;

    if (!topLinks || topLinks.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 24px 0;">
          <p>No link activity to display yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = topLinks.slice(0, 5).map((link, idx) => {
      const clicks = link.clicks || 0;
      const percent = totalClicks > 0 ? Math.round((clicks / totalClicks) * 100) : 0;
      return `
        <div class="leader-item">
          <div class="leader-rank">${idx + 1}</div>
          <div class="leader-info">
            <div class="leader-title">
              <span>/${escapeHtml(link.shortCode)}</span>
              ${link.isPasswordProtected ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : ''}
            </div>
            <div class="leader-url">${escapeHtml(link.targetURL)}</div>
          </div>
          <div class="leader-stats">
            <div class="leader-clicks">${clicks} <span style="font-weight: 500; font-size: 0.75rem; color: var(--text-muted);">clicks</span></div>
            <div class="leader-progress-bar">
              <div class="leader-progress-fill" style="width: ${percent}%;"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
};

// Core App Controller
const app = {
  async init() {
    this.setupEventListeners();
    await this.loadLinks();
    await this.loadAnalytics();
  },

  async loadLinks() {
    try {
      const data = await api.getLinks();
      state.links = data.codes || [];
      ui.renderMetrics();
      ui.renderRecentLinks();
      ui.renderMyLinks();
    } catch (err) {
      console.error('Failed to load links:', err);
    }
  },

  async loadAnalytics() {
    try {
      const data = await api.getAnalytics();
      state.analytics = data;
      ui.renderAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  },

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('appSidebar');
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    // Advanced options toggle
    const advBtn = document.getElementById('advancedToggleBtn');
    const advOpts = document.getElementById('advancedOptions');
    if (advBtn && advOpts) {
      advBtn.addEventListener('click', () => {
        advBtn.classList.toggle('open');
        advOpts.classList.toggle('show');
      });
    }

    // Password switch toggle
    const pwdSwitch = document.getElementById('pwdSwitch');
    const pwdContainer = document.getElementById('pwdInputContainer');
    const pwdField = document.getElementById('customPassword');
    if (pwdSwitch && pwdContainer) {
      pwdSwitch.addEventListener('change', () => {
        pwdContainer.classList.toggle('show', pwdSwitch.checked);
        if (pwdSwitch.checked) {
          pwdField?.focus();
        } else if (pwdField) {
          pwdField.value = '';
        }
      });
    }

    // Expiration preset buttons
    document.querySelectorAll('[data-preset-hours]').forEach(btn => {
      btn.addEventListener('click', () => {
        const hours = parseInt(btn.getAttribute('data-preset-hours'), 10);
        const expInput = document.getElementById('expirationInput');
        if (expInput) {
          const targetDate = new Date(Date.now() + hours * 60 * 60 * 1000);
          // Format for datetime-local: YYYY-MM-DDTHH:mm
          const tzOffset = targetDate.getTimezoneOffset() * 60000;
          const localISODate = new Date(targetDate.getTime() - tzOffset).toISOString().slice(0, 16);
          expInput.value = localISODate;
        }
      });
    });

    // Shorten Form submission
    const shortenForm = document.getElementById('shortenForm');
    if (shortenForm) {
      shortenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleShorten();
      });
    }

    // Table search
    const searchInput = document.getElementById('tableSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        ui.renderMyLinks();
      });
    }

    // Filter tabs
    document.querySelectorAll('[data-filter]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.currentFilter = tab.getAttribute('data-filter');
        ui.renderMyLinks();
      });
    });

    // Profile Settings Form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = document.getElementById('settingsFirstName')?.value.trim();
        const lastName = document.getElementById('settingsLastName')?.value.trim();
        const btn = document.getElementById('settingsSaveBtn');

        try {
          if (btn) btn.disabled = true;
          const data = await api.updateProfile(firstName, lastName);
          if (data && data.user) {
            state.user = { ...state.user, ...data.user };
            localStorage.setItem('klip_user', JSON.stringify(state.user));
            ui.renderUserProfile();
            showToast('Profile updated successfully!', 'success');
          }
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }

    // Close Modals on ESC
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeQrModal();
        closeDeleteModal();
      }
    });
  },

  switchTab(tabName) {
    state.activeTab = tabName;

    // Update nav links
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabName);
    });

    // Update panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    const targetPane = document.getElementById(`${tabName}Pane`);
    if (targetPane) targetPane.classList.add('active');

    // Update breadcrumb
    const crumb = document.getElementById('currentCrumbTitle');
    if (crumb) {
      crumb.textContent = tabName.charAt(0).toUpperCase() + tabName.slice(1);
    }

    // Close mobile sidebar if open
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');

    // Refresh data if analytics or links
    if (tabName === 'analytics') {
      this.loadAnalytics();
    } else if (tabName === 'links') {
      ui.renderMyLinks();
    }
  },

  async handleShorten() {
    const urlInput = document.getElementById('originalUrlInput');
    const aliasInput = document.getElementById('customAliasInput');
    const expInput = document.getElementById('expirationInput');
    const pwdSwitch = document.getElementById('pwdSwitch');
    const pwdInput = document.getElementById('customPassword');
    const submitBtn = document.getElementById('shortenSubmitBtn');
    const btnSpinner = document.getElementById('shortenSpinner');
    const btnText = document.getElementById('shortenBtnText');

    let url = urlInput.value.trim();
    if (!url) {
      showToast('Please enter a destination URL', 'error');
      urlInput.focus();
      return;
    }

    // Ensure scheme if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
      urlInput.value = url;
    }

    const code = aliasInput?.value.trim() || undefined;
    let expiresAt = expInput?.value ? new Date(expInput.value).toISOString() : undefined;
    const password = pwdSwitch?.checked ? pwdInput?.value.trim() : undefined;

    try {
      submitBtn.disabled = true;
      if (btnSpinner) btnSpinner.style.display = 'inline-block';
      if (btnText) btnText.textContent = 'Generating...';

      const result = await api.shorten(url, code, expiresAt, password);

      showToast('Short URL generated successfully!', 'success');

      // Display Result Card
      this.displayShortenResult(result);

      // Reset Inputs
      urlInput.value = '';
      if (aliasInput) aliasInput.value = '';
      if (expInput) expInput.value = '';
      if (pwdSwitch) pwdSwitch.checked = false;
      if (pwdInput) pwdInput.value = '';
      const pwdContainer = document.getElementById('pwdInputContainer');
      if (pwdContainer) pwdContainer.classList.remove('show');

      // Reload links in background
      await this.loadLinks();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      if (btnSpinner) btnSpinner.style.display = 'none';
      if (btnText) btnText.textContent = 'Shorten URL';
    }
  },

  displayShortenResult(data) {
    const card = document.getElementById('shortenResultCard');
    const shortUrlEl = document.getElementById('resultShortUrl');
    const targetUrlEl = document.getElementById('resultTargetUrl');
    const qrImgEl = document.getElementById('resultQrImage');
    const metaTagsEl = document.getElementById('resultMetaTags');

    if (!card) return;

    if (shortUrlEl) shortUrlEl.textContent = data.shortUrl;
    if (targetUrlEl) {
      targetUrlEl.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        ${escapeHtml(data.targetURL)}
      `;
    }
    if (qrImgEl && data.qrCode) {
      qrImgEl.src = data.qrCode;
    }

    if (metaTagsEl) {
      let tags = [];
      if (data.isPasswordProtected) {
        tags.push('<span class="status-badge badge-protected"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Password Protected</span>');
      }
      if (data.expiresAt) {
        const exp = new Date(data.expiresAt).toLocaleString();
        tags.push(`<span class="status-badge badge-active"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Expires ${exp}</span>`);
      }
      metaTagsEl.innerHTML = tags.join('');
    }

    // Configure copy button
    const copyBtn = document.getElementById('resultCopyBtn');
    if (copyBtn) {
      copyBtn.onclick = () => copyToClipboard(data.shortUrl);
    }

    // Configure download QR button
    const downloadBtn = document.getElementById('resultDownloadQrBtn');
    if (downloadBtn) {
      downloadBtn.onclick = () => downloadQrCode(data.shortCode);
    }

    // Open link button
    const openBtn = document.getElementById('resultOpenBtn');
    if (openBtn) {
      openBtn.onclick = () => window.open(data.shortUrl, '_blank');
    }

    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

// Clipboard Helper
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  }).catch(() => {
    // Fallback
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('Copied to clipboard!', 'success');
  });
}

// QR Code Modal
function openQrModal(shortCode, fullUrl) {
  const modal = document.getElementById('qrModal');
  const modalShortUrl = document.getElementById('modalQrShortUrl');
  const modalImg = document.getElementById('modalQrImage');
  const downloadBtn = document.getElementById('modalDownloadQrBtn');
  const copyBtn = document.getElementById('modalCopyUrlBtn');

  if (!modal) return;

  if (modalShortUrl) modalShortUrl.textContent = fullUrl;
  if (modalImg) modalImg.src = `/qr/${encodeURIComponent(shortCode)}`;
  
  if (downloadBtn) {
    downloadBtn.onclick = () => downloadQrCode(shortCode);
  }
  if (copyBtn) {
    copyBtn.onclick = () => copyToClipboard(fullUrl);
  }

  modal.classList.add('open');
}

function closeQrModal() {
  const modal = document.getElementById('qrModal');
  if (modal) modal.classList.remove('open');
}

function downloadQrCode(shortCode) {
  const link = document.createElement('a');
  link.href = `/qr/${encodeURIComponent(shortCode)}?download=1`;
  link.download = `qrcode-${shortCode}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Downloading QR code image...', 'info');
}

// Delete Confirmation Modal
let linkPendingDelete = null;

function confirmDeleteLink(id, shortCode) {
  linkPendingDelete = id;
  const modal = document.getElementById('deleteModal');
  const codeEl = document.getElementById('deleteModalCode');
  if (codeEl) codeEl.textContent = `/${shortCode}`;
  if (modal) modal.classList.add('open');
}

function closeDeleteModal() {
  linkPendingDelete = null;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.classList.remove('open');
}

async function executeDeleteLink() {
  if (!linkPendingDelete) return;
  const id = linkPendingDelete;
  closeDeleteModal();

  try {
    await api.deleteLink(id);
    showToast('Link deleted successfully.', 'success');
    await app.loadLinks();
    await app.loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Toast Notification System
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;

  let icon = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  `;
  if (type === 'error') {
    icon = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    `;
  } else if (type === 'info') {
    icon = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
    `;
  }

  toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

// HTML Escape Utility
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Theme Management
const themeManager = {
  init() {
    const saved = localStorage.getItem('klip_theme') || 'light';
    this.applyTheme(saved);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        this.applyTheme(next);
      });
    }
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('klip_theme', theme);

    const sunIcon = document.getElementById('themeSunIcon');
    const moonIcon = document.getElementById('themeMoonIcon');
    const toggleBtn = document.getElementById('themeToggleBtn');

    if (sunIcon && moonIcon) {
      if (theme === 'dark') {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
        if (toggleBtn) toggleBtn.setAttribute('title', 'Switch to Light Mode (Sun)');
      } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
        if (toggleBtn) toggleBtn.setAttribute('title', 'Switch to Dark Mode (Moon)');
      }
    }
  }
};

// Global Exports
window.auth = auth;
window.app = app;
window.themeManager = themeManager;
window.copyToClipboard = copyToClipboard;
window.openQrModal = openQrModal;
window.closeQrModal = closeQrModal;
window.downloadQrCode = downloadQrCode;
window.confirmDeleteLink = confirmDeleteLink;
window.closeDeleteModal = closeDeleteModal;
window.executeDeleteLink = executeDeleteLink;
window.showToast = showToast;

// Boot application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  themeManager.init();
  auth.init();

  // Auth form handlers
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');

  if (tabLogin && tabSignup) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      if (loginForm) loginForm.style.display = 'flex';
      if (signupForm) signupForm.style.display = 'none';
    });

    tabSignup.addEventListener('click', () => {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      if (loginForm) loginForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'flex';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value.trim();
      const password = document.getElementById('loginPassword')?.value;
      const btn = document.getElementById('loginSubmitBtn');

      try {
        if (btn) btn.disabled = true;
        const data = await api.login(email, password);
        auth.setSession(data.token, data.user);
        showToast(`Welcome back, ${data.user.firstName}!`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const firstName = document.getElementById('signupFirstName')?.value.trim();
      const lastName = document.getElementById('signupLastName')?.value.trim();
      const email = document.getElementById('signupEmail')?.value.trim();
      const password = document.getElementById('signupPassword')?.value;
      const btn = document.getElementById('signupSubmitBtn');

      try {
        if (btn) btn.disabled = true;
        const data = await api.signup(firstName, lastName, email, password);
        auth.setSession(data.token, data.user);
        showToast('Account created successfully!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // Quick Demo Login Button
  const demoBtn = document.getElementById('quickDemoBtn');
  if (demoBtn) {
    demoBtn.addEventListener('click', async () => {
      try {
        demoBtn.disabled = true;
        demoBtn.textContent = 'Signing into demo...';
        // Use existing test account or login
        const data = await api.login('praneeth@gmail.com', 'admin');
        auth.setSession(data.token, data.user);
        showToast('Logged into demo account!', 'success');
      } catch (err) {
        // If login failed, create a quick guest demo user
        try {
          const guestEmail = `guest_${Date.now()}@klip.dev`;
          const data = await api.signup('Demo', 'User', guestEmail, 'demo1234');
          auth.setSession(data.token, data.user);
          showToast('Created new demo session!', 'success');
        } catch (e) {
          showToast('Could not initiate demo. Please create an account.', 'error');
        }
      } finally {
        demoBtn.disabled = false;
        demoBtn.textContent = 'Explore with One-Click Demo';
      }
    });
  }
});
