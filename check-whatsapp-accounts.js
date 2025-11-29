// Simple script to check WhatsApp accounts without dependencies
const fs = require('fs');
const path = require('path');

// Check if database files exist
const dbPath = path.join(__dirname, 'broadcaster.db');
const dbApPath = path.join(__dirname, 'api', 'broadcaster.db');

console.log('\n=== Database Files Check ===\n');
console.log(`Root DB exists: ${fs.existsSync(dbPath)}`);
console.log(`API DB exists: ${fs.existsSync(dbApPath)}`);

// Try to read from the API using fetch
const testAPI = async () => {
  try {
    console.log('\n=== Testing API Endpoint ===\n');
    
    // Get token first (mock user)
    const loginResp = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password' })
    });
    
    const loginData = await loginResp.json();
    const token = loginData.data?.token;
    
    if (!token) {
      console.log('❌ Could not get auth token');
      console.log('Response:', loginData);
      return;
    }
    
    console.log('✅ Got auth token');
    
    // Get sessions
    const sessionsResp = await fetch('http://localhost:3001/api/v1/whatsapp/sessions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const sessionsData = await sessionsResp.json();
    console.log('\n✅ API Response:');
    console.log(JSON.stringify(sessionsData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testAPI();
