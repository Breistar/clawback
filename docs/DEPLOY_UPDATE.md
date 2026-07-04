# Actualizar el deploy en Vultr

Guía para **subir cambios nuevos** al servidor de demo después del deploy inicial.  
El VPS **no se actualiza solo** desde GitHub: hay que entrar por SSH, hacer `git pull` y reconstruir el contenedor.

> Deploy inicial (primera vez): ver [DOCKER.md](DOCKER.md).  
> Spec del proyecto: [HACKATHON.md](../HACKATHON.md).

---

## Qué necesitas antes de empezar

| Dato | Dónde lo encuentras |
|------|---------------------|
| **IP del servidor** | Panel Vultr → instancia `clawback` → Overview |
| **Usuario** | `root` |
| **Password** | Panel Vultr → icono del ojo junto a la contraseña |
| **Código en GitHub** | Los cambios deben estar en `main` de `Breistar/clawback` (o el remoto que hayas clonado) |

**Importante:** el archivo `.env` del servidor **no está en Git**. Contiene tu `VULTR_INFERENCE_API_KEY`. `git pull` no lo borra, pero **nunca** copies `.env.example` encima sin querer.

---

## Flujo estándar (actualización desde GitHub)

Usa esto cada vez que alguien del equipo haya hecho **push a `main`**.

### 1. Conectarte por SSH

Desde **PowerShell** (Windows) o terminal (Mac/Linux):

```bash
ssh root@TU-IP
```

Ejemplo con la instancia de demo:

```bash
ssh root@108.61.209.3
```

- Escribe `yes` si pregunta por el fingerprint (solo la primera vez).
- Pega el password de root cuando lo pida.
- PREGUNTAR POR EL password AL EQUIPO

### 2. Ir al proyecto y traer cambios

```bash
cd ~/clawback

git fetch origin
git pull origin main
```

Si `git pull` muestra conflictos o cambios locales, **no fuerces**. Pega el error en el grupo o consulta la sección [Problemas frecuentes](#problemas-frecuentes).

### 3. Reconstruir y reiniciar el contenedor

Siempre que cambie código de `server/`, `web/`, `Dockerfile` o `docker-compose.yml`:

```bash
docker compose up -d --build
```

- `--build` recompila la imagen (frontend + dependencias).
- `-d` deja el contenedor corriendo en segundo plano.
- La primera vez después de cambios grandes puede tardar **3–5 minutos**.

### 4. Verificar que quedó bien

```bash
# Estado del contenedor
docker compose ps

# Debe decir "Up" y mapear 0.0.0.0:80->80/tcp
curl -s localhost/api/report
```

`curl` debe responder **JSON** con totales (números, `"month"`, etc.).

Sigue los logs si algo falla:

```bash
docker compose logs -f --tail=100
```

Salir de logs: **Ctrl+C**.

### 5. Probar en el navegador

Abre **http://TU-IP** (ej. `http://108.61.209.3`):

1. Pestaña **Agent** → **Run Full Audit**
2. Revisa **Disputes** y **Win-Back**

---

## Cuándo hace falta algo más que `git pull`

| Cambió… | Qué hacer además |
|---------|------------------|
| Solo lógica TS/React/CSS | `git pull` + `docker compose up -d --build` |
| `Dockerfile` o `docker-compose.yml` | Igual, pero el build tarda más |
| `.env` / API key | Editar en el servidor: `nano ~/clawback/.env` → `docker compose up -d --build` |
| Datos del demo (seed) | Ver [Resetear datos del demo](#resetear-datos-del-demo) |
| Código **aún no está en GitHub** | Ver [Plan B: subir archivos desde tu PC](#plan-b-subir-archivos-desde-tu-pc) |

---

## Resetear datos del demo

El volumen Docker guarda SQLite entre reinicios. Para volver a la coreografía original (S0, D1–D4, W, LR):

```bash
cd ~/clawback
docker compose exec clawback npm run seed
```

Para borrar **todo** el volumen y empezar de cero en el próximo arranque:

```bash
cd ~/clawback
docker compose down -v
docker compose up -d --build
```

(`down -v` borra reglas aprendidas por chat y disputas generadas en sesiones anteriores.)

---

## Plan B: subir archivos desde tu PC

Si los cambios **aún no están en GitHub** (push pendiente o sin permisos al repo), sube archivos con `scp` desde tu máquina local.

**Ventana 1 — servidor** (deja la sesión SSH abierta o no hace falta).

**Ventana 2 — PowerShell en tu PC:**

```powershell
cd "C:\Users\nelso\OneDrive\Documentos\Development\HACKATON\clawback"

# Archivos Docker / raíz (si cambiaron)
scp Dockerfile docker-compose.yml .dockerignore root@TU-IP:~/clawback/

# Entrypoint
scp -r docker root@TU-IP:~/clawback/

# Ejemplo: un archivo del server
scp server/index.ts root@TU-IP:~/clawback/server/
```

Luego en el **servidor**:

```bash
cd ~/clawback
docker compose up -d --build
curl -s localhost/api/report
```

---

## Editar variables de entorno en el servidor

```bash
cd ~/clawback
nano .env
```

Valores habituales:

```env
VULTR_INFERENCE_API_KEY=tu-key-real
API_PORT=3001
```

En Docker, **`API_PORT` lo fuerza `docker-compose.yml` a `80`** — no afecta al deploy aunque en `.env` diga `3001`.

Después de guardar (**Ctrl+O**, Enter, **Ctrl+X**):

```bash
docker compose up -d --build
```

---

## Comandos de referencia rápida

```bash
# Entrar
ssh root@TU-IP

# Actualizar código + redeploy
cd ~/clawback && git fetch origin && git pull origin main && docker compose up -d --build

# Ver logs
docker compose logs -f

# Parar la app (sin borrar datos)
docker compose down

# Arrancar de nuevo (sin rebuild)
docker compose up -d

# Ver qué commit está desplegado
cd ~/clawback && git log -1 --oneline
```

---

## Problemas frecuentes

| Síntoma | Qué hacer |
|---------|-----------|
| `Permission denied (publickey,password)` | Revisa IP y password en el panel Vultr |
| `git pull` → conflictos | `git status` → no borres `.env`. Pide ayuda al equipo o `git stash` si sabes usarlo |
| `Already up to date` pero falta código | El push no llegó a GitHub → usa [Plan B](#plan-b-subir-archivos-desde-tu-pc) |
| Build falla en `better-sqlite3` | `docker compose logs` → suele resolverse reintentando el build; verifica RAM (2 GB) |
| `curl localhost/api/report` vacío o error | `docker compose ps` — si no está `Up`, `docker compose logs` |
| Página carga pero audit scripted | Falta o está mal `VULTR_INFERENCE_API_KEY` en `.env` |
| Cambios de UI no se ven | Olvidaste `--build` → `docker compose up -d --build` |
| Puerto 80 ocupado | `docker compose down` y vuelve a subir; o revisa `docker ps` por otro contenedor |

---

## Checklist post-actualización

- [ ] `git log -1` muestra el commit esperado
- [ ] `docker compose ps` → contenedor `Up`, puerto `80`
- [ ] `curl -s localhost/api/report` → JSON válido
- [ ] Navegador → Agent → Run Full Audit completa (~3 min)
- [ ] IP (o dominio) comunicada al equipo para QA

---

## Nota sobre dominio propio

Apuntar un dominio (ej. `demo.tuhotel.com`) a la IP del VPS es solo **DNS** (registro A → `TU-IP`). No hace falta cambiar Docker para HTTP en puerto 80. HTTPS requiere un reverse proxy aparte (Caddy/nginx); fuera del scope de esta guía.
