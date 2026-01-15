import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, saveDatabase, closeDatabase, dbPath } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const db = await initDatabase();

  // Read and execute schema
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = schema.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    try {
      db.run(stmt);
    } catch (err) {
      // Ignore "already exists" errors
      if (!err.message.includes('already exists')) {
        console.error(`Error executing: ${stmt.substring(0, 50)}...`);
        console.error(err.message);
      }
    }
  }

  // Save to disk
  saveDatabase();
  console.log(`Database initialized at: ${dbPath}`);

  // Verify tables
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  if (tables.length > 0) {
    console.log('Tables:', tables[0].values.map(v => v[0]).join(', '));
  }

  const views = db.exec("SELECT name FROM sqlite_master WHERE type='view'");
  if (views.length > 0) {
    console.log('Views:', views[0].values.map(v => v[0]).join(', '));
  }

  const categories = db.exec('SELECT name FROM categories');
  if (categories.length > 0) {
    console.log('Categories:', categories[0].values.map(v => v[0]).join(', '));
  }

  closeDatabase();
  console.log('Database initialization complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
