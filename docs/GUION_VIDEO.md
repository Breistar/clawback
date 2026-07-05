# 🎬 Guion del video — 60 segundos / Video script — 60 seconds

**Dueño / Owner: Rodo.** Se graba la pantalla del navegador con la app + voz en inglés encima. Navegador limpio a pantalla completa, zoom 110–125%, `npm run seed` fresco antes de grabar (para que el countdown diga ~36h). Cada toma se graba 2–3 veces por separado y se edita.

**La historia:** el hotel pierde dinero por dos coladeras → el agente atrapa la #1 (cobros indebidos) → atrapa la #2 (clientes fieles vía OTA) → y aprende cuando lo corriges → cifra final.

---

## TOMA 1 (0:00–0:08) — El problema
**Se ve:** placas de texto hechas en el editor (no es la app): "17% of every booking" → "Billed as booked — not as stayed" → "Dispute window: 48 hours".
**Voz (EN):** *"Independent hotels run on Booking and Expedia — and pay up to 20% commission on every single booking."* → *"But here's the catch: they bill you as booked — not as stayed. No-shows, early departures, unprocessed corrections… all invoiced. And you get 48 hours to fight back."* (Situación 0:00–0:06 + Complicación 0:06–0:14)

## TOMA 2 (0:08–0:14) — Aparece Clawback
**Se ve:** pantalla Overview quieta 2 seg (las 3 tarjetas legibles) → el mouse viaja lento y directo → click en **▶ Run Full Audit**.
**Voz (EN):** *"Meet Clawback — the AI agent that audits every OTA booking, invoice and commission. Watch it work."* (línea de Ari)

## TOMA 3 (0:14–0:26) — El agente pensando en vivo ⭐
**Se ve:** pestaña Agent con la auditoría REAL corriendo: el plan, un evento "VultronRetriever ranked… score…", y la alerta roja del no-show con $1,850 y el countdown. Grabar la corrida completa (3–4 min) y usar los mejores 12 seg (acelerar máx 1.5x). Grabar 2–3 corridas, usar la más limpia.
**Voz (EN):** *"It reads your actual contracts and catches money before it leaks: this no-show isn't marked — 36 hours left, $1,850 on the line."*

## TOMA 4 (0:26–0:38) — Los casos gemelos ⭐ el corazón
**Contexto:** dos huéspedes reservaron 7 noches y se fueron al día 5 — idénticos en la factura. Al A el hotel le devolvió las noches no usadas (tarifa flexible) → la comisión de más SE DISPUTA ($756). Al B el hotel se quedó todo (no reembolsable) → la comisión es correcta → NO SE DISPUTA. Un detector tonto marcaría ambos; el agente sigue EL DINERO. Eso es criterio.
**Se ve:** tabla de Disputes con la fila #1284 (DISPUTABLE · $756) y la #1310 (NOT DISPUTABLE) juntas → zoom → click en el chip **BKG-§4.2** → se abre el contrato → 2 seg quieto.
**Voz (EN):** *"Same symptom, opposite verdicts: this stay gets $756 back — this one doesn't, because the hotel kept the money. Every decision cites its evidence."*
**Conector:** cerramos la fuga #1; la voz abre la #2 con "And it also finds…". Opcional: mini-placa "Leak #1 ✓ → Leak #2: your loyal guests".

## TOMA 5 (0:38–0:47) — Carlos
**Se ve:** pestaña Win-Back, la tarjeta de Carlos entera: ★ CHAMPION, "Commission burned: $2,480 per visit", su oferta personalizada.
**Voz (EN):** *"It even finds the loyal guests you're still paying commission for — and writes the offer that brings them direct."*

## TOMA 6 (0:47–0:55) — El agente aprende ⭐ el remate
**Se ve (una sola toma sin cortes):** en Chat se teclea *"don't dispute 1284, it was a special agreement with the guest"* → Enter → respuesta del agente → banner verde **✓ RULE LEARNED** → corte a Overview: el total disputable bajó de **$2,876 a $2,120**. (Funcionalidad ya implementada y probada ✓. Tras grabar, resetear con `POST /api/seed/reset` + re-correr la auditoría.)
**Voz (EN):** *"Correct it once — it learns forever. Next audit, the rule applies itself."*

## TOMA 7 (0:55–1:00) — Cierre
**Se ve:** Report quieto 2 seg con la cifra grande → funde a placa final: logo + "Built in 48 hours on Vultr Serverless Inference" + "Clawback — claw your money back."
**Voz (EN):** *"Born from a real hotel in Oaxaca. **Stop paying for bookings that never happened. Clawback — claw your money back.**"* (cierre de Ari — mostrar la frase TAMBIÉN escrita en la placa final)

---

## Dependencias
| Toma | Bloqueada por |
|---|---|
| 1 y placas de 7 | Nadie — Rodo puede ya |
| 2, 3, 4, 5, 7 | Diseño de Ari (orden: Agent → Disputes → Overview → Win-Back → Report) |
| 6 | ✅ Nada — ya implementada y probada |
