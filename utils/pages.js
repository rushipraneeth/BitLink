export function renderPasswordPage(shortCode, fullShortUrl, error = null) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Protected Link — BitLink</title>
  
  <script>
    (function() {
      const theme = localStorage.getItem('klip_theme') || 'light';
      document.documentElement.setAttribute('data-theme', theme);
    })();
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F5F7FB;
      --card-bg: #FFFFFF;
      --border: #E2E8F0;
      --text: #172033;
      --muted: #64748B;
      --primary: #4F46E5;
      --primary-hover: #4338CA;
      --primary-subtle: #EEF2FF;
      --accent: #0D9488;
      --danger: #EF4444;
      --danger-bg: #FEF2F2;
      --danger-border: #FECACA;
      --radius: 12px;
    }
    [data-theme="dark"] {
      --bg: #0F172A;
      --card-bg: #1E293B;
      --border: #334155;
      --text: #F1F5F9;
      --muted: #94A3B8;
      --primary: #818CF8;
      --primary-hover: #6366F1;
      --primary-subtle: rgba(129, 140, 248, 0.14);
      --accent: #2DD4BF;
      --danger: #F87171;
      --danger-bg: rgba(248, 113, 113, 0.12);
      --danger-border: rgba(248, 113, 113, 0.25);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
      padding: 20px;
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.2s ease, color 0.2s ease;
      position: relative;
    }
    .theme-toggle-corner {
      position: absolute;
      top: 20px;
      right: 20px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--muted);
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .theme-toggle-corner:hover {
      color: var(--primary);
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03);
      width: 100%;
      max-width: 440px;
      padding: 36px 32px;
      text-align: center;
      animation: fadeIn 0.25s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .icon-wrapper {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary-subtle);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      color: var(--primary);
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      color: var(--text);
    }
    .description {
      font-size: 0.9rem;
      color: var(--muted);
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .alias-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--primary-subtle);
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.825rem;
      color: var(--primary);
      margin-top: 8px;
      word-break: break-all;
    }
    .form-group {
      text-align: left;
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text);
    }
    .input-wrapper {
      position: relative;
    }
    input[type="password"], input[type="text"] {
      width: 100%;
      padding: 12px 42px 12px 14px;
      font-size: 0.95rem;
      font-family: inherit;
      border: 1px solid var(--border);
      border-radius: 8px;
      outline: none;
      transition: all 0.15s ease;
      background: var(--card-bg);
      color: var(--text);
    }
    input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }
    .toggle-pwd {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
    }
    .toggle-pwd:hover { color: var(--text); }
    .btn {
      width: 100%;
      padding: 12px;
      background: var(--primary);
      color: #FFFFFF;
      font-weight: 600;
      font-size: 0.925rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s ease, box-shadow 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
    }
    .btn:hover {
      background: var(--primary-hover);
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.35);
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }
    .error-box {
      background: var(--danger-bg);
      border: 1px solid var(--danger-border);
      color: var(--danger);
      font-size: 0.85rem;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 18px;
      text-align: left;
      display: ${error ? 'flex' : 'none'};
      align-items: center;
      gap: 8px;
    }
    .spinner {
      display: none;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .footer-note {
      margin-top: 24px;
      font-size: 0.8rem;
      color: var(--muted);
    }
    .footer-note a {
      color: var(--primary);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  </style>
</head>
<body>
  <button class="theme-toggle-corner" id="themeToggleCorner" title="Toggle Theme" aria-label="Toggle Theme">
    <svg id="themeIconSun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
    <svg id="themeIconMoon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
  </button>

  <div class="card">
    <div class="icon-wrapper">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </div>
    <h1>Password Protected Link</h1>
    <p class="description">
      This shortened destination is protected with a password. Please enter the password to continue.
      <br>
      <span class="alias-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        ${escapeHtml(fullShortUrl || '/' + shortCode)}
      </span>
    </p>

    <div id="errorBox" class="error-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
      <span id="errorMsg">${escapeHtml(error || '')}</span>
    </div>

    <form id="verifyForm">
      <div class="form-group">
        <label for="password">Password</label>
        <div class="input-wrapper">
          <input type="password" id="password" name="password" placeholder="Enter link password" required autofocus autocomplete="current-password">
          <button type="button" class="toggle-pwd" id="togglePwd" title="Show/Hide Password">
            <svg id="eyeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      <button type="submit" class="btn" id="submitBtn">
        <span class="spinner" id="spinner"></span>
        <span id="btnText">Unlock & Continue</span>
      </button>
    </form>

    <div class="footer-note">
      Powered by <a href="/">BitLink URL Shortener</a>
    </div>
  </div>

  <script>
    const form = document.getElementById('verifyForm');
    const pwdInput = document.getElementById('password');
    const toggleBtn = document.getElementById('togglePwd');
    const submitBtn = document.getElementById('submitBtn');
    const spinner = document.getElementById('spinner');
    const btnText = document.getElementById('btnText');
    const errorBox = document.getElementById('errorBox');
    const errorMsg = document.getElementById('errorMsg');
    const shortCode = ${JSON.stringify(shortCode)};

    // Theme Toggle Handler
    const themeBtn = document.getElementById('themeToggleCorner');
    const sunIcon = document.getElementById('themeIconSun');
    const moonIcon = document.getElementById('themeIconMoon');
    function syncThemeIcon() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      sunIcon.style.display = isDark ? 'block' : 'none';
      moonIcon.style.display = isDark ? 'none' : 'block';
    }
    syncThemeIcon();
    themeBtn?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('klip_theme', next);
      syncThemeIcon();
    });

    toggleBtn.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = pwdInput.value.trim();
      if (!password) return;

      submitBtn.disabled = true;
      spinner.style.display = 'inline-block';
      btnText.textContent = 'Verifying...';
      errorBox.style.display = 'none';

      try {
        const res = await fetch('/verify/' + encodeURIComponent(shortCode), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });

        const data = await res.json();

        if (res.ok && data.targetURL) {
          btnText.textContent = 'Redirecting...';
          window.location.replace(data.targetURL);
        } else {
          errorMsg.textContent = data.error || 'Incorrect password. Please try again.';
          errorBox.style.display = 'flex';
          submitBtn.disabled = false;
          spinner.style.display = 'none';
          btnText.textContent = 'Unlock & Continue';
          pwdInput.select();
        }
      } catch (err) {
        errorMsg.textContent = 'Network error. Please try again.';
        errorBox.style.display = 'flex';
        submitBtn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = 'Unlock & Continue';
      }
    });
  </script>
</body>
</html>`;
}

export function renderExpiredPage(shortCode, fullShortUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Expired — BitLink</title>
  
  <script>
    (function() {
      const theme = localStorage.getItem('klip_theme') || 'light';
      document.documentElement.setAttribute('data-theme', theme);
    })();
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F5F7FB;
      --card-bg: #FFFFFF;
      --border: #E2E8F0;
      --text: #172033;
      --muted: #64748B;
      --primary: #4F46E5;
      --primary-hover: #4338CA;
      --warning: #D97706;
      --warning-bg: #FFFBEB;
      --radius: 12px;
    }
    [data-theme="dark"] {
      --bg: #0F172A;
      --card-bg: #1E293B;
      --border: #334155;
      --text: #F1F5F9;
      --muted: #94A3B8;
      --primary: #818CF8;
      --primary-hover: #6366F1;
      --warning: #F59E0B;
      --warning-bg: rgba(245, 158, 11, 0.12);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
      padding: 20px;
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
      width: 100%;
      max-width: 440px;
      padding: 36px 32px;
      text-align: center;
    }
    .icon-wrapper {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--warning-bg);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      color: var(--warning);
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      color: var(--text);
    }
    .description {
      font-size: 0.9rem;
      color: var(--muted);
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .alias-badge {
      display: inline-block;
      background: var(--warning-bg);
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.825rem;
      color: var(--warning);
      margin-top: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      background: var(--primary);
      color: #FFFFFF;
      font-weight: 600;
      font-size: 0.925rem;
      border-radius: 8px;
      text-decoration: none;
      transition: background 0.15s ease, box-shadow 0.15s ease;
      width: 100%;
      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
    }
    .btn:hover {
      background: var(--primary-hover);
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.35);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    </div>
    <h1>This Link Has Expired</h1>
    <p class="description">
      The shortened URL you are attempting to reach has passed its scheduled expiration date and is no longer accepting redirects.
      <br>
      <span class="alias-badge">${escapeHtml(fullShortUrl || '/' + shortCode)}</span>
    </p>
    <a href="/" class="btn">Create Your Own Short Link</a>
  </div>
</body>
</html>`;
}

export function renderNotFoundPage(shortCode) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Not Found — BitLink</title>
  
  <script>
    (function() {
      const theme = localStorage.getItem('klip_theme') || 'light';
      document.documentElement.setAttribute('data-theme', theme);
    })();
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F5F7FB;
      --card-bg: #FFFFFF;
      --border: #E2E8F0;
      --text: #172033;
      --muted: #64748B;
      --primary: #4F46E5;
      --primary-hover: #4338CA;
      --radius: 12px;
      --danger: #EF4444;
      --danger-bg: #FEF2F2;
    }
    [data-theme="dark"] {
      --bg: #0F172A;
      --card-bg: #1E293B;
      --border: #334155;
      --text: #F1F5F9;
      --muted: #94A3B8;
      --primary: #818CF8;
      --primary-hover: #6366F1;
      --danger: #F87171;
      --danger-bg: rgba(248, 113, 113, 0.12);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
      padding: 20px;
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
      width: 100%;
      max-width: 440px;
      padding: 36px 32px;
      text-align: center;
    }
    .icon-wrapper {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--danger-bg);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      color: var(--danger);
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      color: var(--text);
    }
    .description {
      font-size: 0.9rem;
      color: var(--muted);
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      background: var(--primary);
      color: #FFFFFF;
      font-weight: 600;
      font-size: 0.925rem;
      border-radius: 8px;
      text-decoration: none;
      transition: background 0.15s ease, box-shadow 0.15s ease;
      width: 100%;
      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
    }
    .btn:hover {
      background: var(--primary-hover);
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.35);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/></svg>
    </div>
    <h1>Link Not Found</h1>
    <p class="description">
      The shortened link <strong>${escapeHtml(shortCode ? '/' + shortCode : '')}</strong> does not exist or has been removed.
    </p>
    <a href="/" class="btn">Return to Homepage</a>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
