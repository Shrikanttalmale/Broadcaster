const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./broadcaster.db');

console.log('\n========================================');
console.log('📊 LICENSE DATABASE TEST');
console.log('========================================\n');

// First, get schema
db.all("PRAGMA table_info(licenses);", (err, schema) => {
  if (err) {
    console.error('❌ Error getting schema:', err.message);
    db.close();
    return;
  }

  console.log('✅ Database Schema:');
  console.table(schema);

  // Now get licenses
  db.all("SELECT * FROM licenses LIMIT 5;", (err, licenses) => {
    if (err) {
      console.error('❌ Error getting licenses:', err.message);
      db.close();
      return;
    }

    console.log('\n✅ Generated Licenses in Database:');
    if (licenses.length === 0) {
      console.log('❌ No licenses found!');
    } else {
      console.log(`Found ${licenses.length} licenses:\n`);
      licenses.forEach((lic, idx) => {
        console.log(`\n${idx + 1}. License Key: ${lic.licenseKey}`);
        console.log(`   Type: ${lic.licenseType}`);
        console.log(`   Expiry: ${lic.validUntil}`);
        console.log(`   Features: ${lic.features}`);
        console.log(`   Signature: ${lic.signature.substring(0, 16)}...`);
      });
    }

    db.close();
    console.log('\n========================================\n');
  });
});
