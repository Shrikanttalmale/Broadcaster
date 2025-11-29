const Database = require('better-sqlite3');
const db = new Database('api/broadcaster.db');

try {
  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  
  console.log('\n========== DATABASE TABLES ==========\n');
  
  for (const table of tables) {
    const tableName = table.name;
    
    // Get row count
    const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    const rowCount = countResult.count;
    
    // Get column info
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const columnNames = columns.map(c => c.name).join(', ');
    
    console.log(`📋 TABLE: ${tableName}`);
    console.log(`   Rows: ${rowCount}`);
    console.log(`   Columns: ${columnNames}`);
    
    // Show sample data if table has rows
    if (rowCount > 0) {
      const sampleRows = db.prepare(`SELECT * FROM ${tableName} LIMIT 3`).all();
      console.log(`   Sample Data:`);
      sampleRows.forEach((row, idx) => {
        console.log(`     [${idx + 1}] ${JSON.stringify(row, null, 2).split('\n').join('\n          ')}`);
      });
    }
    console.log();
  }
  
  db.close();
} catch (err) {
  console.error('Error:', err.message);
  db.close();
  process.exit(1);
}
