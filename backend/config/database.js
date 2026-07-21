const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { databaseUrl } = require('./security');

const pool = new Pool({ connectionString: databaseUrl() });
module.exports = pool;
