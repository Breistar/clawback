# Deploy a Vultr — guía paso a paso (Nelson)

Objetivo: URL pública `http://<ip-del-servidor>` con la app corriendo, "Run Full Audit" funcionando para cualquier juez. Tiempo estimado: 20–30 min.

## 1. Crear el servidor (panel de Vultr, con TUS créditos)

1. [my.vultr.com](https://my.vultr.com) → botón **Deploy +** → **Deploy New Server**
2. Tipo: **Cloud Compute — Shared CPU** (el barato sirve de sobra)
3. Ubicación: cualquiera de Europa (París si aparece — puntos de estilo)
4. Imagen: pestaña **Marketplace Apps** → busca **Docker** (Docker on Ubuntu). Si no aparece, usa **Ubuntu 24.04** a secas y abajo está el paso extra
5. Plan: el de **$10–12/mes** (2 GB RAM) es suficiente
6. Quita los extras (backups, etc.) → **Deploy Now**
7. Espera ~2 min a que diga Running → copia la **IP** y el **password** de root que muestra el panel

## 2. Entrar al servidor

Desde tu terminal:
```bash
ssh root@<LA-IP>
# pega el password cuando lo pida
```

Si elegiste Ubuntu pelón (sin Docker), instala Docker primero:
```bash
curl -fsSL https://get.docker.com | sh
```

## 3. Bajar el proyecto y configurarlo

```bash
git clone https://github.com/Breistar/clawback.git
cd clawback
cp .env.example .env
nano .env      # pega la VULTR_INFERENCE_API_KEY real (pídesela a Breistar por DM)
               # guarda con Ctrl+O, Enter, y sal con Ctrl+X
```

## 4. Levantar

```bash
docker compose up -d --build
```

Tarda unos minutos la primera vez. Verifica:
```bash
curl -s localhost/api/report
```
Si responde JSON con números → está vivo.

## 5. Probar desde afuera

En tu navegador: `http://<LA-IP>` → debe cargar la app → pestaña Agent → **Run Full Audit** → el agente debe correr completo (~3 min) y llenar Disputes/Win-Back.

⚠️ Si la página carga pero el feed en vivo no avanza: es el streaming (SSE). Con esta configuración (Express directo en el puerto 80, sin nginx enfrente) NO debería pasar. Si algún día se pone nginx delante, necesita `proxy_buffering off`.

## 6. Actualizar cuando haya cambios nuevos en main

```bash
cd clawback && git pull && docker compose up -d --build
```

## 7. Reset para jueces (opcional)

`POST http://<LA-IP>/api/seed/reset` limpia hallazgos y reglas aprendidas por chat. La mañana de la evaluación conviene reconstruir (paso 6) para que el countdown del no-show diga ~36h.

## Checklist final

- [ ] `http://<IP>` carga la app
- [ ] Run Full Audit corre completo sin tocar nada
- [ ] Los chips de cita abren documentos
- [ ] El chat contesta
- [ ] La IP/URL pegada en el grupo para Rodo (QA + formulario de entrega)
