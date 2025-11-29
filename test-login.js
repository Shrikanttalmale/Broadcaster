const http = require('http');

function testLogin(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: username,
      password: password
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: JSON.parse(data)
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('\n🔐 Testing Admin Login...\n');
  
  try {
    console.log('Test 1: Login with username "admin" and password "password"');
    const result = await testLogin('admin', 'password');
    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.body, null, 2));
    
    if (result.status === 200) {
      console.log('\n✅ LOGIN SUCCESSFUL');
    } else {
      console.log('\n❌ LOGIN FAILED');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

run();
