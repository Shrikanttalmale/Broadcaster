const Database = require('better-sqlite3');

try {
  const db = new Database('api/broadcaster.db');
  
  console.log('\n=== WhatsApp Accounts in Database ===\n');
  
  const accounts = db.prepare('SELECT id, phoneNumber, userId, isActive, createdAt, lastLogin FROM whatsapp_accounts ORDER BY createdAt DESC').all();
  
  if (accounts.length === 0) {
    console.log('❌ No WhatsApp accounts found in database');
  } else {
    console.log(`✅ Found ${accounts.length} account(s):\n`);
    accounts.forEach((acc, idx) => {
      console.log(`[${idx + 1}]`);
      console.log(`   ID: ${acc.id}`);
      console.log(`   Phone: ${acc.phoneNumber}`);
      console.log(`   User ID: ${acc.userId}`);
      console.log(`   Active: ${acc.isActive}`);
      console.log(`   Created: ${acc.createdAt}`);
      console.log(`   Last Login: ${acc.lastLogin || 'Never'}`);
      console.log();
    });
  }
  
  db.close();
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
