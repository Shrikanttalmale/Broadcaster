// Check database via debug endpoint
const testAPI = async () => {
  try {
    console.log('\n=== Testing API Debug Endpoint ===\n');
    
    // First, get the current user
    const meResp = await fetch('http://localhost:3001/api/v1/auth/me', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` || '' }
    });
    
    const meData = await meResp.json();
    console.log('Current user:', JSON.stringify(meData, null, 2));
    
    // Then check database
    const dbResp = await fetch('http://localhost:3001/api/v1/whatsapp/debug/db-check', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` || '' }
    });
    
    const dbData = await dbResp.json();
    console.log('\nDatabase contents:', JSON.stringify(dbData, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testAPI();
