import 'dotenv/config';
import http from 'http';
import app from '../index.js';

let server;
const PORT = 8001; // test on port 8001 to avoid any port conflicts

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, raw: body });
          }
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

async function runTests() {
  server = app.listen(PORT);
  console.log(`Test server running on port ${PORT}`);

  try {
    const testEmail = `tester_${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    // 1. Sign Up
    console.log('\n--- 1. Testing Sign Up ---');
    const signupRes = await request(
      { path: '/user/signup', method: 'POST' },
      { firstName: 'Alice', lastName: 'Engineer', email: testEmail, password: testPassword }
    );
    console.log('Signup status:', signupRes.status);
    if (signupRes.status !== 201) throw new Error('Signup failed: ' + JSON.stringify(signupRes.body));
    const token = signupRes.body.token;
    console.log('Got token:', token ? 'YES' : 'NO');

    // 2. Login
    console.log('\n--- 2. Testing Login ---');
    const loginRes = await request(
      { path: '/user/login', method: 'POST' },
      { email: testEmail, password: testPassword }
    );
    console.log('Login status:', loginRes.status);
    if (loginRes.status !== 200) throw new Error('Login failed: ' + JSON.stringify(loginRes.body));

    // 3. User profile /user/me
    console.log('\n--- 3. Testing GET /user/me ---');
    const meRes = await request({
      path: '/user/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('GET /user/me:', meRes.body);
    if (meRes.body.user.email !== testEmail) throw new Error('GET /user/me mismatch');

    // 4. Update profile /user/me
    console.log('\n--- 4. Testing PATCH /user/me ---');
    const patchRes = await request(
      {
        path: '/user/me',
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      },
      { firstName: 'Alicia' }
    );
    console.log('PATCH /user/me result:', patchRes.body);
    if (patchRes.body.user.firstName !== 'Alicia') throw new Error('Profile update failed');

    // 5. Shorten URL with random alias
    console.log('\n--- 5. Testing POST /shorten (Random Alias) ---');
    const short1 = await request(
      {
        path: '/shorten',
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      },
      { url: 'https://linear.app' }
    );
    console.log('Short URL 1 created:', short1.body);
    if (short1.status !== 201 || !short1.body.shortCode) throw new Error('Random alias failed');

    // 6. Shorten URL with custom alias
    console.log('\n--- 6. Testing POST /shorten (Custom Alias) ---');
    const customAlias = `custom-${Date.now()}`;
    const short2 = await request(
      {
        path: '/shorten',
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      },
      { url: 'https://vercel.com', code: customAlias }
    );
    console.log('Short URL 2 created:', short2.body);
    if (short2.status !== 201 || short2.body.shortCode !== customAlias) throw new Error('Custom alias failed');

    // 7. Duplicate alias test (should return 409)
    console.log('\n--- 7. Testing Duplicate Alias (Expect 409) ---');
    const dupRes = await request(
      {
        path: '/shorten',
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      },
      { url: 'https://github.com', code: customAlias }
    );
    console.log('Duplicate status:', dupRes.status, dupRes.body);
    if (dupRes.status !== 409) throw new Error('Duplicate check did not return 409');

    // 8. Reserved keyword alias test (should return 400)
    console.log('\n--- 8. Testing Reserved Alias (Expect 400) ---');
    const reservedRes = await request(
      {
        path: '/shorten',
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      },
      { url: 'https://github.com', code: 'analytics' }
    );
    console.log('Reserved alias status:', reservedRes.status, reservedRes.body);
    if (reservedRes.status !== 400) throw new Error('Reserved alias check did not return 400');

    // 9. Shorten with Expiration Date
    console.log('\n--- 9. Testing Expiration Date ---');
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const short3 = await request(
      {
        path: '/shorten',
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      },
      { url: 'https://example.com/expiring', expiresAt: futureDate }
    );
    console.log('Short URL 3 (with expiration):', short3.body);
    if (short3.status !== 201 || !short3.body.expiresAt) throw new Error('Expiration date failed');

    // 10. Shorten with Password Protection
    console.log('\n--- 10. Testing Password Protection ---');
    const secretAlias = `secret-${Date.now()}`;
    const short4 = await request(
      {
        path: '/shorten',
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      },
      { url: 'https://secret.com/docs', code: secretAlias, password: 'MyLinkPassword!' }
    );
    console.log('Short URL 4 (password protected):', short4.body);
    if (short4.status !== 201 || !short4.body.isPasswordProtected) throw new Error('Password protection flag failed');

    // 11. Test Accessing Password-Protected URL
    console.log('\n--- 11. Testing Password Verification Flow ---');
    // Wrong password (should return 401)
    const wrongPwdRes = await request(
      { path: `/verify/${secretAlias}`, method: 'POST' },
      { password: 'WrongPassword' }
    );
    console.log('Wrong password status:', wrongPwdRes.status, wrongPwdRes.body);
    if (wrongPwdRes.status !== 401) throw new Error('Wrong password did not return 401');

    // Correct password (should return 200 with targetURL)
    const rightPwdRes = await request(
      { path: `/verify/${secretAlias}`, method: 'POST' },
      { password: 'MyLinkPassword!' }
    );
    console.log('Correct password status:', rightPwdRes.status, rightPwdRes.body);
    if (rightPwdRes.status !== 200 || rightPwdRes.body.targetURL !== 'https://secret.com/docs') {
      throw new Error('Correct password failed');
    }

    // 12. Test Unprotected Redirect & Click Increment
    console.log('\n--- 12. Testing Redirection and Click Count ---');
    const clickRes = await request({
      path: `/${customAlias}`,
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    console.log('Click response:', clickRes.body);
    if (clickRes.body.targetURL !== 'https://vercel.com') throw new Error('Redirect failed');

    // 13. Test GET /codes (Links List)
    console.log('\n--- 13. Testing GET /codes ---');
    const codesRes = await request({
      path: '/codes',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Total user links:', codesRes.body.codes.length);
    if (codesRes.body.codes.length < 4) throw new Error('User links count unexpected');

    // 14. Test GET /analytics
    console.log('\n--- 14. Testing GET /analytics ---');
    const analyticsRes = await request({
      path: '/analytics',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Analytics summary:', {
      totalLinks: analyticsRes.body.totalLinks,
      totalClicks: analyticsRes.body.totalClicks,
      topLinks: analyticsRes.body.topLinks.map(l => ({ code: l.shortCode, clicks: l.clicks }))
    });
    if (analyticsRes.body.totalClicks < 2) throw new Error('Clicks not tracked properly in analytics');

    // 15. Test QR Code JSON & Image endpoint
    console.log('\n--- 15. Testing QR Code endpoint ---');
    const qrRes = await request({
      path: `/qr/${customAlias}?format=json`,
      method: 'GET'
    });
    console.log('QR JSON response:', qrRes.body.shortCode, 'has qrCode:', Boolean(qrRes.body.qrCode));
    if (!qrRes.body.qrCode) throw new Error('QR code generation failed');

    // 16. Test DELETE
    console.log('\n--- 16. Testing DELETE /:id ---');
    const deleteRes = await request({
      path: `/${short1.body.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Delete status:', deleteRes.status, deleteRes.body);
    if (deleteRes.status !== 200 || !deleteRes.body.deleted) throw new Error('Delete failed');

    console.log('\n=======================================');
    console.log('ALL 16 BACKEND INTEGRATION TESTS PASSED!');
    console.log('=======================================\n');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
