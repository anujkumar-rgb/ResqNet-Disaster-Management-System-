import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticate } from './middleware/auth.js';

dotenv.config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected test route
app.get('/api/protected-test', authenticate, (req, res) => {
  res.json({ message: 'Authenticated successfully', user: (req as any).user });
});

app.listen(port, () => {
  console.log(`ResqNet Backend listening at http://localhost:${port}`);
});
