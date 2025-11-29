#!/usr/bin/env node

const http = require('http');

async function runTests() {
  console.log('\n========== TESTING BROADCAST SYSTEM ==========\n');

  try {
    // Test 1: Health Check
    console.log('TEST 1: Health Check');
    const health = await makeRequest('GET', '/health');
    console.log('✓ Server running\n');

    // Test 2: Login
    console.log('TEST 2: Authentication');
    const loginResp = await makeRequest('POST', '/api/v1/auth/login', {
      username: 'admin',
      password: 'password',
    });
    const token = loginResp.data.accessToken;
    console.log('✓ Login successful\n');

    // Test 3: Create Template
    console.log('TEST 3: Create Template');
    const templateResp = await makeRequest('POST', '/api/v1/templates', {
      name: 'Welcome Template',
      body: 'Hello {{name}}, your phone is {{phoneNumber}}',
      subject: 'Welcome',
      category: 'greeting',
    }, token);
    const templateId = templateResp.data.template.id;
    console.log(`✓ Template created: ${templateId}`);
    console.log(`  Variables: ${templateResp.data.template.variables.join(', ')}\n`);

    // Test 4: Get Template
    console.log('TEST 4: Get Template');
    const getTemplate = await makeRequest('GET', `/api/v1/templates/${templateId}`, null, token);
    console.log(`✓ Template retrieved: ${getTemplate.data.template.name}\n`);

    // Test 5: Create Campaign
    console.log('TEST 5: Create Campaign');
    const campaignResp = await makeRequest('POST', '/api/v1/campaigns', {
      name: 'Test Campaign',
      description: 'Testing broadcast system',
      templateId: templateId,
      delayMin: 2000,
      delayMax: 5000,
      throttlePerMinute: 20,
      retryAttempts: 2,
    }, token);
    const campaignId = campaignResp.data.campaign.id;
    console.log(`✓ Campaign created: ${campaignId}`);
    console.log(`  Status: ${campaignResp.data.campaign.status}\n`);

    // Test 6: Get Campaign
    console.log('TEST 6: Get Campaign');
    const getCampaign = await makeRequest('GET', `/api/v1/campaigns/${campaignId}`, null, token);
    console.log(`✓ Campaign retrieved: ${getCampaign.data.campaign.name}\n`);

    // Test 7: Get Broadcast Queue Status
    console.log('TEST 7: Broadcast Queue Status');
    const queueStatus = await makeRequest('GET', '/api/v1/broadcast/queue-status', null, token);
    console.log(`✓ Queue Status:`);
    console.log(`  Total queued: ${queueStatus.data.totalQueued}`);
    console.log(`  Is processing: ${queueStatus.data.isProcessing}\n`);

    // Test 8: Get Scheduler Stats
    console.log('TEST 8: Scheduler Statistics');
    const schedulerStats = await makeRequest('GET', '/api/v1/scheduler/stats', null, token);
    console.log(`✓ Scheduler Stats:`);
    console.log(`  Total schedules: ${schedulerStats.data.totalSchedules}`);
    console.log(`  Active schedules: ${schedulerStats.data.activeSchedules}`);
    console.log(`  Total executions: ${schedulerStats.data.totalExecutions}\n`);

    console.log('========== ALL TESTS COMPLETED ==========\n');
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    process.exit(1);
  }
}

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || data}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

runTests();
