const http = require('http');

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAuth() {
  try {
    // Step 1: Check existing users
    console.log('\n=== Step 1: Checking existing users ===');
    const users = await makeRequest('GET', '/api/auth/debug/users');
    console.log('Existing users:', JSON.stringify(users.data, null, 2));

    // Step 2: Clear all users
    console.log('\n=== Step 2: Clearing all users ===');
    const clearResult = await makeRequest('POST', '/api/auth/debug/clear', {});
    console.log('Clear result:', JSON.stringify(clearResult.data, null, 2));

    // Step 3: Test password hashing
    console.log('\n=== Step 3: Testing password hashing ===');
    const testPw = await makeRequest('POST', '/api/auth/debug/test-password', { password: 'TestPassword123' });
    console.log('Password hash test:', JSON.stringify(testPw.data, null, 2));

    // Step 4: Register a new user
    console.log('\n=== Step 4: Registering new user ===');
    const registerResult = await makeRequest('POST', '/api/auth/register', {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'Test',
      lastName: 'User',
      studentId: 'STU001',
      department: 'Computer Science',
      year: '2nd'
    });
    console.log('Registration response status:', registerResult.status);
    console.log('Registration result:', JSON.stringify(registerResult.data, null, 2));

    // Step 5: Login with the new user
    console.log('\n=== Step 5: Logging in with new user ===');
    const loginResult = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'TestPassword123'
    });
    console.log('Login response status:', loginResult.status);
    console.log('Login result:', JSON.stringify(loginResult.data, null, 2));

    if (loginResult.status === 200 && loginResult.data.token) {
      console.log('\n✅ SUCCESS! Login worked correctly!');
    } else {
      console.log('\n❌ FAILED! Login did not work.');
      console.log('Check the server logs for more details.');
    }

  } catch (error) {
    console.error('ERROR:', error);
  }
  process.exit(0);
}

testAuth();
