import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv to look for .env file in the server root directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// JWT Options
export const JWT_OPTIONS = {
    algorithm: 'HS256'
}; 