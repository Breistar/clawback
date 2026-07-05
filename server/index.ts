import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// load the repo-root .env no matter which directory the server starts from
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
dotenv.config();
import { api } from './routes/index.ts';
import { hasVultrKey } from './agent/vultr.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', api);

// production: serve the built frontend from the same process
const dist = path.resolve(here, '../web/dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// API_PORT, not PORT: dev-preview tooling injects PORT for the web server.
// Default 3002 locally so clawback-prototype can keep :3001 without stealing chat requests.
const port = Number(process.env.API_PORT ?? 3002);
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
const server = app.listen(port, host, () => {
  console.log(`clawback api → http://${host}:${port}  (health: /api/health)`);
  if (!hasVultrKey()) console.log('⚠ no VULTR_INFERENCE_API_KEY — audit runs as a scripted replay');
});
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ Port ${port} already in use. Stop the other process or set API_PORT in .env`);
    process.exit(1);
  }
  throw err;
});
