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

// API_PORT, not PORT: dev-preview tooling injects PORT for the web server
const port = Number(process.env.API_PORT ?? 3001);
app.listen(port, '0.0.0.0', () => {
  console.log(`clawback api → http://localhost:${port}`);
  if (!hasVultrKey()) console.log('⚠ no VULTR_INFERENCE_API_KEY — audit runs as a scripted replay');
});
