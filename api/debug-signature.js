const sqlite3 = require('sqlite3');
const crypto = require('crypto');
const fs = require('fs');

// Load secret key
const secretKey = fs.readFileSync('./.license-secret', 'utf-8').trim();
const db = new sqlite3.Database('./broadcaster.db');

console.log('\n========================================');
console.log('🔐 SIGNATURE VERIFICATION TEST');
console.log('========================================\n');

db.get("SELECT id, licenseKey, licenseType, validUntil, features, signature FROM licenses LIMIT 1;", (err, lic) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    return;
  }

  console.log('License Data in Database:');
  console.log('  id:', lic.id);
  console.log('  licenseKey:', lic.licenseKey);
  console.log('  licenseType:', lic.licenseType);
  console.log('  validUntil:', lic.validUntil);
  console.log('  features:', lic.features);
  console.log('  signature:', lic.signature);
  console.log();

  // Try with different date formats
  const attempts = [
    {
      name: 'Full ISO format (what CLI likely used)',
      data: {
        id: lic.id,
        licenseKey: lic.licenseKey,
        licenseType: lic.licenseType,
        expiryDate: lic.validUntil + 'T00:00:00.000Z', // Add time
        features: JSON.parse(lic.features)
      }
    },
    {
      name: 'With validUntil field (date only)',
      data: {
        id: lic.id,
        licenseKey: lic.licenseKey,
        licenseType: lic.licenseType,
        validUntil: lic.validUntil,
        features: JSON.parse(lic.features)
      }
    },
    {
      name: 'Just licenseKey and type',
      data: {
        licenseKey: lic.licenseKey,
        licenseType: lic.licenseType
      }
    }
  ];

  console.log('Testing signature generation:\n');

  attempts.forEach((attempt) => {
    const sig = crypto
      .createHmac('sha256', secretKey)
      .update(JSON.stringify(attempt.data))
      .digest('hex');

    const match = sig === lic.signature;
    console.log(`${match ? '✅' : '❌'} ${attempt.name}`);
    console.log(`   Expected: ${lic.signature.substring(0, 16)}...`);
    console.log(`   Got:      ${sig.substring(0, 16)}...`);
    console.log(`   Data: ${JSON.stringify(attempt.data).substring(0, 60)}...`);
    console.log();
  });

  db.close();
  console.log('========================================\n');
});
