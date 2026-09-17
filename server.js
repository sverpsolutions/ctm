// Root entrypoint for Hostinger / LiteSpeed / Passenger Node
const path = require('path');
const fs = require('fs');
let dotenv;
try {
  dotenv = require('dotenv');
} catch (e) {
  try {
    dotenv = require('./backend/node_modules/dotenv');
  } catch (e2) {}
}

const envFiles = [
  path.join(__dirname, '.env'),
  path.join(__dirname, 'backend/.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env')
];

for (const p of envFiles) {
  if (fs.existsSync(p) && dotenv) {
    dotenv.config({ path: p, override: true });
  }
}

// Fallback safety for live Linux production:
// Always ensure MySQL engine is selected if mssql is not explicitly requested.
if (!process.env.DB_ENGINE && process.platform === 'linux') {
  process.env.DB_ENGINE = 'mysql';
  process.env.MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'u153068796_ctm';
  process.env.MYSQL_USER = process.env.MYSQL_USER || 'u153068796_ctm';
  process.env.MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || 'Mci8yo@257';
  process.env.MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
  process.env.MYSQL_PORT = process.env.MYSQL_PORT || '3306';
}

require('./backend/dist/server.js');

