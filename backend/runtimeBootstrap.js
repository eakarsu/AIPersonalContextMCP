const fs = require('fs');
const path = require('path');
const pool = require('./config/database');
const { hashPassword } = require('./security/password');

async function bootstrapRuntime() {
  if (String(process.env.MIGRATE_ON_START).toLowerCase() !== 'true') return;

  const migrationsDir = path.join(__dirname, 'migrations');
  for (const filename of fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
    await pool.query(fs.readFileSync(path.join(migrationsDir, filename), 'utf8'));
  }

  const email = process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const name = process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator';
  if (!email || !password) throw new Error('runtime admin credentials are required');

  const passwordHash = await hashPassword(password);
  await pool.query(
    `INSERT INTO users (email, password, name, role)
     VALUES ($1, $2, $3, 'commander')
     ON CONFLICT (email) DO UPDATE
     SET password = EXCLUDED.password, name = EXCLUDED.name, role = EXCLUDED.role`,
    [email, passwordHash, name]
  );
}

module.exports = { bootstrapRuntime };
