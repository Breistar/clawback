# GUÍA DEV — Clawback

**Para el equipo de desarrollo · léela completa antes de tocar código (15 min)**

> Jerarquía de documentos: [HACKATHON.md](../HACKATHON.md) manda (spec cerrada, en inglés). [CLAUDE.md](../CLAUDE.md) es el contexto para las IAs (Claude Code / Cursor lo cargan solos). Esta guía es para ti: te explica el qué, el porqué y el paso a paso. Si esta guía contradice a HACKATHON.md, gana HACKATHON.md.
>
> 🚨 **LECTURA URGENTE junto con esta guía: [CASOS_DEMO.md](CASOS_DEMO.md)** — los 7 casos del demo (S0, D1–D4, W, LR) explicados en lenguaje humano, con la chuleta rápida. Todo el proyecto gira alrededor de esos casos; nadie debería preguntar "¿qué era el D2?" después de leerlo.

---

## 1. Qué estamos construyendo (2 minutos)

**Clawback** es un agente de IA para hoteles independientes que audita su relación con Booking y Expedia. El hotel pierde dinero por dos lados y el agente ataca ambos:

| Módulo | Qué hace | Analogía |
|---|---|---|
| **Sentinel** (diario) | Detecta eventos de ayer (no-shows, salidas anticipadas) que nadie marcó en el portal de la OTA. Si no se marcan a tiempo, se facturan. | Reportar un cargo raro de tu tarjeta el mismo día |
| **Auditor** (mensual) | Cruza la factura mensual de la OTA línea por línea contra el PMS, el extranet y el contrato. Encuentra cobros indebidos y arma memos de disputa. | Revisar tu estado de cuenta a fin de mes |
| **Win-Back** | Encuentra huéspedes recurrentes que siguen reservando por OTA (pagando 15–17% de comisión) y arma ofertas para convertirlos a reserva directa. | Dejar de pagarle comisión al Tinder por citas con tu esposa |

**Lo que los jueces evalúan** (track Vultr): que sea un *agente de verdad* — que planea, que un hallazgo dispara la siguiente búsqueda, que usa herramientas, que decide con evidencia citada, y que entrega algo usable. Nuestros 4 momentos ganadores:

1. **Glass brain**: el razonamiento del agente se ve EN VIVO en pantalla, con citas clickeables.
2. **D1 vs D4**: dos reservas con el mismo síntoma (7 noches reservadas, 5 dormidas) y diagnóstico opuesto — una disputable, otra no, porque *la comisión sigue al dinero que el hotel retuvo* (FLEX reembolsa → se disputa; NR retiene todo → el cobro es válido). Este contraste es el corazón del demo.
3. **Confianza con porqué**: el agente dice "MEDIUM — falta el registro de check-out, verificar antes de enviar". Sabe lo que no sabe.
4. **Regla aprendida**: el gerente corrige por chat → banner verde "✓ RULE LEARNED" → la regla se aplica a futuras auditorías.

**Regla de oro del proyecto: el demo está coreografiado.** Los datos sintéticos tienen los errores sembrados a propósito (casos S0, D1, D2, D3, D4, W, LR — ver HACKATHON.md §7). No inventes casos nuevos; haz que esos brillen.

---

## 2. Qué YA está construido (Fase 0 — no lo rehagas, extiéndelo)

Todo el esqueleto corre de punta a punta. Compruébalo tú mismo:

```bash
npm install
npm run seed     # crea la base de datos con la coreografía
npm run dev      # abre http://localhost:5173 → Agent → Run Full Audit
```

Sin `ANTHROPIC_API_KEY` verás una **reproducción scripted** de la auditoría completa (sirve para desarrollar frontend sin quemar API). Con la key en `.env`, corre el loop real de Claude.

### Mapa del repo

```
├── HACKATHON.md          ← LA spec. Scope cerrado.
├── CLAUDE.md             ← contexto auto-cargado por Claude Code / Cursor
├── data/documents/       ← contratos OTA + políticas (markdown que el agente LEE)
├── server/
│   ├── index.ts          ← Express + static serve (API_PORT=3001)
│   ├── agent/
│   │   ├── loop.ts       ← loop de tool-use de Anthropic, 3 fases, emite eventos SSE
│   │   ├── tools.ts      ← las 13 herramientas (leen SQLite/markdown, escriben hallazgos)
│   │   ├── prompts.ts    ← system prompts (audit + chat)
│   │   └── fakeFeed.ts   ← reproducción scripted (fallback sin API key)
│   ├── db/
│   │   ├── schema.sql    ← 8 tablas
│   │   └── seed.ts       ← TODOS los datos sintéticos, casos etiquetados S0/D1/.../LR
│   └── routes/           ← API (§8): audit, disputes, winback, report, chat, rules, documents
└── web/src/
    ├── screens/          ← las 6 pantallas (todas renderizan con datos reales ya)
    └── lib/useAuditStream.tsx  ← conexión SSE única compartida
```

### El flujo de datos (apréndetelo)

1. Botón **Run Full Audit** → `POST /api/audit/run`.
2. El agente corre sus 3 fases llamando tools; cada paso se emite por SSE a `/api/audit/stream`.
3. Las tools **leen** de SQLite (`reservations`, `invoice_lines`, `extranet_log`, `guests`, `stays`) y de los markdown de `data/documents/`.
4. Las tools **escriben** los resultados en SQLite (`disputes`, `offers`, `learned_rules`).
5. Las pantallas leen esas tablas vía `GET /api/...`. **El agente nunca calcula totales**: `/api/report` los suma de la tabla `disputes`. Así Overview = Disputes = Report siempre cuadran. No rompas esto.

### Citas (el sistema nervioso del demo)

Cada decisión cita ids: `BKG-§4.2` (contrato Booking), `EXP-§6.3` (Expedia), `POL-02` (política), `LAD-02` (escalera), `PMS-1284` (reserva), `LOG-0709` (extranet), `INV-L23` (línea de factura). `GET /api/documents/:id` resuelve cualquiera de ellos para el panel lateral. Si agregas texto que el agente emite, respeta esos formatos — el frontend los detecta por regex (`extractCitations` en `loop.ts`).

---

## 3. Qué falta — el paso a paso (mapeado al plan de bloques de HACKATHON.md §9)

Trabajen en este orden. Cada punto tiene su criterio de "quedó".

### Block 3 — El loop real (LA prioridad del sábado)

> ✅ **ARQUITECTURA CONFIRMADA (smoke test hecho el sábado en la mañana contra la API real):**
> - Endpoint: `https://api.vultrinference.com/v1` (compatible OpenAI, SDK `openai` de npm con `baseURL`). Key en `.env` como `VULTR_INFERENCE_API_KEY`.
> - **Razonamiento del agente:** `Qwen/Qwen3.6-27B` vía `/v1/chat/completions` — tool calling nativo **ya probado y funciona**. (Alternativas en el mismo endpoint: `moonshotai/Kimi-K2.6`, `deepseek-ai/DeepSeek-V4-Flash`.)
> - **Retrieval de documentos:** los VultronRetriever solo hacen ReRank (no chatean). Se usa `vultr/VultronRetrieverPrime-Qwen3.5-8B` vía `/v1/rerank` con `{model, query, documents[]}` — **ya probado: rankeó BKG-§4.2 primero** para la consulta de estancia acortada. Va DENTRO de `get_contract_clause`/`get_policy`: partir el md en secciones → rerank contra la consulta → devolver la sección top con su § id.
> - Claude NO va en el flujo principal. El diseño del loop del prototipo (tools, fases, SSE) se conserva idéntico.

- [ ] Implementar el loop con el cliente OpenAI → Vultr (`Qwen/Qwen3.6-27B` + tools).
- [ ] Implementar el rerank de VultronRetriever dentro de las tools de documentos y mostrarlo en el glass brain como evento `retrieve` ("VultronRetriever ranked §4.2 · score 6.8").
- [ ] Probar el loop sobre D1 y D4. **Quedó cuando:** en 10 corridas seguidas, D1 sale DISPUTABLE·HIGH con ~$756 y D4 sale NOT_DISPUTABLE las 10 veces, con las citas correctas. Con un modelo de 27B los prompts deben ser MÁS directivos que con Claude — se vale endurecer reglas explícitas ("if rate_plan is NR and amount_refunded is 0 → the commission is valid").
- [ ] Medir duración de la auditoría completa. Si pasa de ~3 min, recortar verbosidad del prompt.

### Block 4 — Sentinel + D2 + D3 + pantalla Disputes
- [ ] Countdown EN VIVO en Disputes y Overview (el deadline ya viene en `disputes.window_deadline`; falta el reloj que descuenta). **Quedó cuando:** el número de horas baja solo.
- [ ] Botón [Mark on extranet] para S0 (solo visual: cambia el status y quita la alerta).
- [ ] Modal de memo mejorado (ya existe básico).

### Block 5 — Win-Back + Overview real + North Star
- [ ] Gráfica North Star con Recharts (el placeholder está en `Overview.tsx`, ya hay datos en `/api/report`). **Quedó cuando:** se ve la proyección 60% → 48%.
- [ ] Derivar `ota_share_today` del mix real de canales en `stays` (hoy es constante).
- [ ] Cuadrar los números: ajustar `seed.ts` para que la cifra trimestral memorable salga (~$47K MXN o la que el equipo decida). Los montos actuales son ejemplos.
- [ ] Línea "Source: hotel's own PMS guest records" en Win-Back (mitigación legal — ver abajo).

### Block 6 — Chat + regla aprendida + recomputar
- [ ] Chat real con API key (el endpoint ya existe y funciona; probarlo con interrogación y corrección).
- [ ] Al aprender una regla que exenta una disputa: marcar esa disputa `status='exempted'` y que `/api/report` sume solo `WHERE status='open'`. **Quedó cuando:** corriges por chat y el total del Overview baja al refrescar. (Versión simple; NO re-auditar todo.)

### Block 7 — Deploy a Vultr
- [ ] ⚠️ **NO esperar al domingo**: deployar el esqueleto tal como está HOY, el sábado en la mañana tras el workshop de Vultr. Valida better-sqlite3 en el VPS y el SSE (si hay nginx enfrente: `proxy_buffering off`, o exponer Express directo).
- [ ] El domingo el deploy es solo `git pull && docker compose up --build`.
- [ ] Probar `POST /api/seed/reset` en el server desplegado.

### Block 8 — Video + README
- [ ] El video manda: guion en HACKATHON.md §10. Se graban EXACTAMENTE esas tomas.
- [ ] README judge-facing según §11 (en inglés). Incluir la tabla "cómo cumplimos el track" y la defensa legal del Win-Back.

---

## 4. Reglas de juego (no negociables)

1. **Scope cerrado.** Si no está en HACKATHON.md, no se construye. Ninguna idea nueva entra el sábado.
2. **Orden de sacrificio** si un bloque se atrasa: Margin Report → D3 → botón Edit de Win-Back → animaciones de gráficas. **Nunca se sacrifica:** glass brain, contraste D1+D4, corrección por chat, deploy, video.
3. **El agente decide, el código suma.** Los totales siempre salen de SQLite, jamás del texto del LLM.
4. **Nunca** el nombre real del hotel cliente. Es "Hotel Casa Alaria".
5. `.env` nunca se commitea. La key va solo en local y en el VPS.
6. **La palabra "dashboard" está prohibida** en UI, código visible, README, video y descripción del submission — hay una categoría vetada por los organizadores ("any project where a dashboard is the main feature"). La pantalla se llama **Overview**, el proyecto es un **enterprise agent**, y toda cifra en pantalla se atribuye a la fase del agente que la produjo ("Sentinel caught it", "found by the Auditor").

---

## 5. Cómo vibe-codear este proyecto (Claude Code / Cursor)

El proyecto ya está preparado para eso: `CLAUDE.md` se carga solo en cada sesión y le da a la IA el contexto completo. Consejos:

- **Pide por bloque, no por feature suelta**: "Implementa el Block 4 según CLAUDE.md y HACKATHON.md §9" funciona mejor que pedir cosas aisladas — la IA ya sabe el orden y los criterios.
- **Los `TODO(Block N)` en el código son ganchos**: dile a la IA "busca los TODO(Block 5) y complétalos".
- **Exige verificación**: termina tus prompts con "corre `npm run typecheck` y prueba el endpoint con curl antes de darlo por hecho".
- **No dejes que la IA refactorice la Fase 0** salvo bug real: el esqueleto está probado; cada rewrite es riesgo sin premio a 48h del deadline.
- **Si la IA propone una feature nueva**, la respuesta es no (regla de juego #1).

---

## 6. Contexto que te van a preguntar los jueces (para que no te agarren en frío)

- **"¿Esto no lo hace un query SQL?"** → Un query encuentra discrepancias; no sabe cuál NO se disputa (D4) ni cuál necesita verificación (D3). El juicio es del agente.
- **"¿Win-Back no viola los términos de Booking / GDPR?"** → Usamos los datos del **PMS propio del hotel** (el huésped se hospedó ahí y dio sus datos al hotel). Todo mensaje pasa por aprobación humana.
- **"¿Y los datos reales cómo entrarían?"** → *"The agent's tools are the integration boundary — today they read our synthetic PMS; in production the same tools call the real one."*
- **"¿Modelo de negocio?"** → Success fee sobre disputas recuperadas + cuota mensual por Sentinel y Win-Back.

---

*Guía v1 · Si algo no está claro, pregunta en el grupo y se agrega aquí. Nadie construye lo que no entiende.*
