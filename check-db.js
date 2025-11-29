#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'api', 'broadcaster.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  
  console.log('\n========== DATABASE CONTENTS ==========\n');
  
  // Get all tables
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    let completed = 0;
    
    tables.forEach(table => {
      const tableName = table.name;
      
      // Get row count
      db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, result) => {
        const count = result ? result.count : 0;
        console.log(`📋 ${tableName}: ${count} rows`);
        
        if (count > 0) {
          db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
            if (rows) {
              rows.forEach((row, idx) => {
                console.log(`   Row ${idx + 1}:`, row);
              });
            }
            completed++;
            if (completed === tables.length) {
              db.close();
              process.exit(0);
            }
          });
        } else {
          completed++;
          if (completed === tables.length) {
            db.close();
            process.exit(0);
          }
        }
      });
    });
  });
});
