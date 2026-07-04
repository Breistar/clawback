# Docker — Clawback

Un solo contenedor: **Express** sirve la API (`/api/*`) y el frontend React buildado. Puerto **80** (listo para abrir `http://TU-IP` en Vultr).

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2
- Archivo `.env` en la raíz del repo (copia de `.env.example`)

## Variables de entorno

| Variable | Obligatoria | Default | Uso |
|----------|-------------|---------|-----|
| `VULTR_INFERENCE_API_KEY` | No* | — | Agente en vivo (Vultr Serverless Inference). Sin ella: replay scripted del demo. |
| `API_PORT` | No | `80` en Docker | Lo fija `docker-compose.yml`; no hace falta tocarlo en deploy. |

\* Obligatoria para el demo **en vivo** ante jueces; el esqueleto funciona sin ella.

## Local (probar el mismo build que Vultr)

```bash
cp .env.example .env
# Edita .env → pega tu VULTR_INFERENCE_API_KEY

docker compose up -d --build
curl -s http://localhost/api/report    # debe responder JSON
```

Abre **http://localhost** → pestaña **Agent** → **Run Full Audit**.

### Comandos útiles

```bash
docker compose logs -f          # ver logs
docker compose down             # apagar
docker compose exec clawback npm run seed   # resetear demo (borra y re-seedea la DB)
docker compose down -v          # borrar volumen SQLite (próximo up = seed limpio)
```

Atajos npm (desde la raíz del repo):

```bash
npm run docker:up
npm run docker:down
npm run docker:logs
```

## Deploy en Vultr (resumen)

1. VPS: **Instances** → Cloud Compute Shared CPU → Europa → **Docker** (Marketplace) o Ubuntu + `curl -fsSL https://get.docker.com | sh`
2. Plan ~$10–12 (2 GB RAM), sin backups extras
3. SSH al servidor:

```bash
ssh root@TU-IP

git clone https://github.com/Breistar/clawback.git
cd clawback
cp .env.example .env
nano .env    # VULTR_INFERENCE_API_KEY=...

docker compose up -d --build
curl -s localhost/api/report
```

4. Navegador: **http://TU-IP** → Agent → Run Full Audit (~3 min)

## Cómo funciona por dentro

```
Dockerfile (multi-stage)
  builder  → npm ci → vite build → web/dist
  runner   → node_modules + server + dist + data/documents

entrypoint.sh
  si no existe server/db/clawback.db → npm run seed
  npm start  (Express en API_PORT, default 80)

volumen clawback-db
  persiste SQLite entre reinicios del contenedor
```

## Problemas frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| Puerto 80 ocupado en local | Para en Windows/IIS: `docker compose up` con `"8080:80"` en `ports` y abre `http://localhost:8080` |
| Audit scripted, no en vivo | Falta o está mal `VULTR_INFERENCE_API_KEY` en `.env` → `docker compose up -d --build` de nuevo |
| SSE se corta detrás de nginx | Si añades nginx delante, `proxy_buffering off` en `/api/audit/stream` o expón Express directo en :80 |
| Reset total del demo | `docker compose exec clawback npm run seed` |
