import 'dotenv/config';
import http from 'http';
import app from '../index.js';

let server;
const PORT = 8002;

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        ...options
      },
      (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch (e) {}
          resolve({ status: res.statusCode, headers: res.headers, raw: body, body: json });
        });
      }
    );
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runE2ETests() {
  server = app.listen(PORT);
  console.log(`E2E test server listening on port ${PORT}...`);

  try {
    // 1. Static HTML homepage
    console.log('\n--- 1. Testing GET / (Homepage) ---');
    const homeRes = await request({ path: '/', method: 'GET', headers: { 'Accept': 'text/html' } });
    console.log('GET / status:', homeRes.status, 'HTML length:', homeRes.raw.length);
    if (homeRes.status !== 200 || !homeRes.raw.includes('Klip')) throw new Error('GET / did not serve index.html');

    // 2. Static CSS
    console.log('\n--- 2. Testing GET /styles.css ---');
    const cssRes = await request({ path: '/styles.css', method: 'GET' });
    console.log('GET /styles.css status:', cssRes.status, 'Content-Type:', cssRes.headers['content-type']);
    if (cssRes.status !== 200 || !cssRes.raw.includes('--font-sans')) throw new Error('GET /styles.css failed');

    // 3. Static JS
    console.log('\n--- 3. Testing GET /app.js ---');
    const jsRes = await request({ path: '/app.js', method: 'GET' });
    console.log('GET /app.js status:', jsRes.status, 'Content-Type:', jsRes.headers['content-type']);
    if (jsRes.status !== 200 || !jsRes.raw.includes('state')) throw new Error('GET /app.js failed');

    // 4. SPA Routes
    console.log('\n--- 4. Testing SPA Routes (/dashboard, /links, /analytics, /settings) ---');
    for (const r of ['/dashboard', '/links', '/analytics', '/settings']) {
      const rRes = await request({ path: r, method: 'GET', headers: { 'Accept': 'text/html' } });
      if (rRes.status !== 200 || !rRes.raw.includes('Klip')) {
        throw new Error(`SPA route ${r} failed: status ${rRes.status}`);
      }
    }
    console.log('All 4 SPA routes serve index.html properly!');

    // 5. Create a user session for link tests
    console.log('\n--- 5. Setup User for Link Workflow ---');
    const email = `e2e_${Date.now()}@test.com`;
    const signup = await request(
      { path: '/user/signup', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { firstName: 'EndToEnd', lastName: 'Tester', email, password: 'Pass1234Secure' }
    );
    const token = signup.body.token;

    // 6. Create custom alias with password and future expiration
    console.log('\n--- 6. Create Password Protected Link ---');
    const secretCode = `vault-${Date.now()}`;
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const createRes = await request(
      {
        path: '/shorten',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      },
      {
        url: 'https://docs.github.com',
        code: secretCode,
        password: 'TopSecretPassword99',
        expiresAt: futureDate
      }
    );
    console.log('Created short link:', createRes.body.shortCode, 'isPasswordProtected:', createRes.body.isPasswordProtected);
    if (!createRes.body.isPasswordProtected) throw new Error('Password protection was not enabled');

    // 7. Visiting password protected link directly in browser (GET /:code)
    console.log('\n--- 7. Visiting Protected Link (Browser GET) ---');
    const visitRes = await request({
      path: `/${secretCode}`,
      method: 'GET',
      headers: { 'Accept': 'text/html,application/xhtml+xml' }
    });
    console.log('Visit protected link status:', visitRes.status);
    if (visitRes.status !== 200 || !visitRes.raw.includes('Password Protected Link')) {
      throw new Error('Did not render Password Verification page');
    }

    // 8. Visiting password verification page directly (GET /verify/:code)
    console.log('\n--- 8. Visiting GET /verify/:code ---');
    const verifyPageRes = await request({
      path: `/verify/${secretCode}`,
      method: 'GET',
      headers: { 'Accept': 'text/html' }
    });
    console.log('Verify page status:', verifyPageRes.status);
    if (verifyPageRes.status !== 200 || !verifyPageRes.raw.includes('Unlock & Continue')) {
      throw new Error('Verify page did not render properly');
    }

    // 9. Submitting wrong password (POST /verify/:code)
    console.log('\n--- 9. Submitting Wrong Password ---');
    const wrongVerify = await request(
      { path: `/verify/${secretCode}`, method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { password: 'IncorrectGuess' }
    );
    console.log('Wrong password response status:', wrongVerify.status);
    if (wrongVerify.status !== 401) throw new Error('Wrong password did not return 401');

    // 10. Submitting correct password (POST /verify/:code)
    console.log('\n--- 10. Submitting Correct Password ---');
    const correctVerify = await request(
      { path: `/verify/${secretCode}`, method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { password: 'TopSecretPassword99' }
    );
    console.log('Correct password response:', correctVerify.body);
    if (correctVerify.status !== 200 || correctVerify.body.targetURL !== 'https://docs.github.com') {
      throw new Error('Correct password verification failed');
    }

    // 11. Create an Expired Link to test expiration behavior
    console.log('\n--- 11. Testing Expired Link Handling ---');
    const expiredCode = `expired-${Date.now()}`;
    // Insert a link with past expiration in the database directly
    const { default: db } = await import('../db/index.js');
    const { urlsTable } = await import('../models/index.js');
    await db.insert(urlsTable).values({
      shortCode: expiredCode,
      targetURL: 'https://old-expired-site.com',
      userId: signup.body.data.userId,
      expiresAt: new Date(Date.now() - 60000), // 1 minute in the past
      clicks: 0
    });

    // Visiting expired link in browser
    const expiredVisit = await request({
      path: `/${expiredCode}`,
      method: 'GET',
      headers: { 'Accept': 'text/html' }
    });
    console.log('Expired visit status:', expiredVisit.status);
    if (expiredVisit.status !== 410 || !expiredVisit.raw.includes('This Link Has Expired')) {
      throw new Error('Expired link did not return status 410 with expired page');
    }

    // 12. Visiting expired link via API
    const expiredApi = await request({
      path: `/${expiredCode}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    console.log('Expired API status:', expiredApi.status, expiredApi.body);
    if (expiredApi.status !== 410 || !expiredApi.body.expired) {
      throw new Error('Expired link API check failed');
    }

    // 13. QR Code Downloads & Formatting
    console.log('\n--- 13. Testing QR Code PNG & Download Headers ---');
    const qrPng = await request({ path: `/qr/${secretCode}`, method: 'GET' });
    console.log('QR PNG status:', qrPng.status, 'Content-Type:', qrPng.headers['content-type']);
    if (qrPng.status !== 200 || qrPng.headers['content-type'] !== 'image/png') {
      throw new Error('QR PNG generation failed');
    }

    const qrDownload = await request({ path: `/qr/${secretCode}?download=1`, method: 'GET' });
    console.log('QR Download Content-Disposition:', qrDownload.headers['content-disposition']);
    if (!qrDownload.headers['content-disposition']?.includes('attachment')) {
      throw new Error('QR download header missing');
    }

    console.log('\n=======================================');
    console.log('ALL E2E WORKFLOW TESTS PASSED CLEANLY!');
    console.log('=======================================\n');
  } catch (err) {
    console.error('E2E test failed:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    process.exit(process.exitCode || 0);
  }
}

runE2ETests();
