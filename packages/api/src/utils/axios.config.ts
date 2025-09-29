import axios from 'axios';
import dotenv from 'dotenv';

import { ApiKeyManager } from '../tools/api-key-manager.js';

dotenv.config();

const baseURL = process.env.SITE_URL;

const signature = ApiKeyManager.generate(process.env.API_SECRET!, process.env.API_KEY!);

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': process.env.API_KEY,
    'X-Api-Timestamp': Math.floor(Date.now() / 1000).toString(),
    'X-Api-Signature': signature,
  },
});

export default api;
