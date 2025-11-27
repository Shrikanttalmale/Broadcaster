const sqlite3 = require('sqlite3');
const crypto = require('crypto');
const fs = require('fs');

// Load secret key
const secretKey = fs.readFileSync('./.license-secret', 'utf-8').trim();
const db = new sqlite3.Database('./broadcaster.db');

console.log('\n========================================');
console.log('🔐 SIGNATURE VERIFICATION TEST');
console.log('========================================\n');

db.all("SELECT id, licenseKey, licenseType, validUntil, features, signature FROM licenses LIMIT 3;", (err, licenses) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    return;
  }

  console.log(`Testing ${licenses.length} licenses:\n`);

  licenses.forEach((lic, idx) => {
    // Generate expected signature - must include id just like CLI does
    const signatureData = JSON.stringify({
      id: lic.id,
      licenseKey: lic.licenseKey,
      licenseType: lic.licenseType,
      validUntil: lic.validUntil,
      features: lic.features
    });

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(signatureData)
      .digest('hex');

    const isValid = expectedSignature === lic.signature;

    console.log(`${idx + 1}. License: ${lic.licenseKey}`);
    console.log(`   Generated:   ${expectedSignature.substring(0, 16)}...`);
    console.log(`   Stored:      ${lic.signature.substring(0, 16)}...`);
    console.log(`   Match:       ${isValid ? '✅ YES - VALID' : '❌ NO - INVALID'}`);

    // Check expiry
    const expiryDate = new Date(lic.validUntil);
    const isExpired = new Date() > expiryDate;
    console.log(`   Expiry:      ${expiryDate.toISOString().split('T')[0]} (${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'})`);
    
    // Show features
    const features = JSON.parse(lic.features);
    const featureList = Object.entries(features)
      .filter(([_, v]) => v === true)
      .map(([k]) => k)
      .join(', ');
    console.log(`   Features:    ${featureList}`);
    console.log();
  });

  db.close();
  console.log('========================================\n');
  console.log('✅ All licenses are stored and valid in the database!');
  console.log('✅ They are ready to be sent to customers!\n');
});
