import mysql from 'mysql2/promise';
import 'dotenv/config';

export const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'taller_app', password: process.env.DB_PASSWORD || 'taller_app_2026',
  database: process.env.DB_NAME || 'taller_oro', waitForConnections: true, connectionLimit: 10
});
