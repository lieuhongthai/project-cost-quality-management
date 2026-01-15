/**
 * One-time script to drop the members table to fix schema mismatch.
 * Run with: npx ts-node src/database/drop-members-table.ts
 */
import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

async function dropMembersTable() {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'project_cost_quality',
    logging: console.log,
  });

  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected successfully.');

    console.log('Dropping members table...');
    await sequelize.query('DROP TABLE IF EXISTS members CASCADE;');
    console.log('Members table dropped successfully.');

    console.log('\nYou can now restart the backend server.');
    console.log('The members table will be recreated with the correct schema.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

dropMembersTable();
