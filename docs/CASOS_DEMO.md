# 🚨 CASOS DEL DEMO — LECTURA URGENTE

**Los 7 casos sembrados, explicados en cristiano · Team GROVA**

> Este documento existe porque "S0, D1, D2..." no le dice nada a nadie. Aquí está qué es cada caso, qué pasó en la historia, qué debe decidir el agente y por qué importa en el demo. **Léelo antes que cualquier código.** Si durante el desarrollo alguien dice "el D2 no está saliendo", esta página es donde vienes a ver de qué habla.

---

## La regla de oro que gobierna TODO el proyecto

> **La comisión sigue al dinero que el hotel SE QUEDÓ, no a las noches que el huésped durmió.**

Como la propina: se calcula sobre la cuenta final, no sobre lo que ordenaste. Si el hotel devolvió dinero, la comisión baja. Si el hotel se quedó todo (tarifa no reembolsable), la comisión completa es correcta *aunque el huésped no haya dormido ahí*. Esta regla es la que separa los casos disputables de los no disputables. Grábatela.

**Las dos tarifas que existen en el demo:**
- **FLEX** (flexible): si el huésped se va antes o no llega, el hotel le **devuelve** lo no usado.
- **NR** (no reembolsable): el huésped pagó por adelantado y el hotel **se queda todo**, pase lo que pase.

---

## S0 — "El no-show de anoche" (la alarma en vivo) 🔴

**Reserva #1327 · Booking · el momento de urgencia del demo**

**La historia:** anoche un huésped (J. Fernández) simplemente no llegó al hotel. Recepción lo registró como no-show en el PMS (el sistema interno). Pero **nadie ha ido al portal de Booking a declararlo**.

**El problema:** el contrato de Booking (cláusula §5.1) da **48 horas** desde el check-in para marcar un no-show en su portal. Si se marca a tiempo → no se cobra comisión. Si nadie lo marca → Booking factura como si el huésped se hubiera hospedado: **$1,850 de comisión por una habitación vacía**.

**Lo que hace el agente:** lo detecta en su barrido diario (fase Sentinel), lee el contrato para saber cuánta ventana queda (**36 horas**), calcula el dinero en riesgo y grita: *"márcalo AHORA"*.

**Por qué importa en el demo:** es el momento de urgencia. El countdown en pantalla ("⏱ 36h left — $1,850 at risk") demuestra por qué esto no se puede hacer a mano: las ventanas son cortísimas y nadie las vigila.

**Piénsalo como:** ver un cargo raro en tu tarjeta y reportarlo el mismo día, antes de que se consolide.

---

## D1 — "Se fue antes y le cobraron completo" (el disputable obvio) ✅

**Reserva #1284 · Booking · tarifa FLEX · se recuperan ~$756**

**La historia:** un huésped (A. Robles) reservó **7 noches** pero se fue al día **5**. Como su tarifa era FLEX, el hotel le devolvió el dinero de las 2 noches no usadas. El hotel solo se quedó con el pago de 5 noches.

**El problema:** la factura de Booking cobró comisión **sobre las 7 noches** — incluyendo dinero que el hotel nunca se quedó.

**Lo que hace el agente:** ve la línea sospechosa en la factura → jala el registro del PMS (confirma: durmió 5, se le devolvieron 2) → lee la cláusula §4.2 del contrato ("comisión solo sobre lo retenido") → lee la política de tarifas del hotel → recalcula → **DISPUTABLE, confianza ALTA, sobrecobro de $756**, con las 4 evidencias citadas.

**Por qué importa en el demo:** es la cadena de investigación completa visible en el glass brain — un hallazgo dispara la siguiente búsqueda (factura → PMS → contrato → política → calculadora). Eso es lo que el track llama "retrieves more than once".

---

## D2 — "Lo marcamos a tiempo... y nos cobraron igual" (el elegante) 💎

**Reserva #1298 · Booking · se recuperan $2,120 completos**

**La historia:** hubo un no-show y esta vez el hotel **SÍ hizo todo bien**: lo marcó en el portal de Booking dentro de la ventana de 48 horas (queda constancia: registro LOG-0709). No se le cobró nada al huésped.

**El problema:** la factura llegó cobrando la comisión completa **de todos modos** — $2,120. El sistema de Booking no procesó la corrección (error documentado en la industria: marcar no garantiza que se aplique).

**Lo que hace el agente:** ve el cobro → revisa el PMS (no-show) → revisa la bitácora del extranet (¡se marcó a tiempo, aquí está la prueba!) → **DISPUTABLE, confianza ALTA**: "el hotel cumplió; la OTA no aplicó la corrección".

**Por qué importa en el demo:** es la justificación de que existan DOS controles. Aunque el Sentinel funcione perfecto, el Auditor mensual sigue siendo necesario. *Es como reportar el cargo al banco... y que el reembolso nunca llegue: alguien tiene que revisar el estado de cuenta.*

---

## D3 — "Los números no cuadran, pero falta un papel" (la honestidad) 🟡

**Reserva #1305 · Expedia · ~$420 en juego · confianza MEDIA**

**La historia:** un huésped se hospedó 4 noches, todo normal. Al hotel le cobró $12,400.

**El problema:** Expedia calculó su comisión sobre **$15,200** — una cifra mayor a lo que el huésped realmente pagó. Diferencia de comisión: ~$420.

**El matiz (aquí está el punto):** cuando el agente va a confirmar la evidencia, descubre que **falta el registro de check-out en el PMS** (lo quitamos a propósito). Sin ese documento, la evidencia está incompleta.

**Lo que hace el agente:** NO manda la disputa a ciegas. Dice: **confianza MEDIA — "falta el registro de check-out, verificar con recepción antes de enviar"**. Ventana de Expedia: 14 días, hay tiempo.

**Por qué importa en el demo:** demuestra que el agente **sabe lo que no sabe**. Un sistema que dispara disputas sin evidencia completa hace quedar mal al hotel ante la OTA. Madurez, no debilidad.

---

## D4 — "Parece error pero NO lo es" (el momento de criterio) ⭐

**Reserva #1310 · Booking · tarifa NR · NO SE DISPUTA · el caso más importante del demo**

**La historia:** un huésped (R. Ortega) reservó **7 noches y se fue al día 5**. ¿Te suena? Es EXACTAMENTE el mismo síntoma que D1.

**La diferencia crucial:** su tarifa era **NR (no reembolsable)**. El hotel no le devolvió ni un peso — se quedó con el pago completo de las 7 noches.

**Lo que hace el agente:** ve el síntoma sospechoso → jala el PMS → ve la tarifa NR y cero reembolsos → aplica la regla de oro: *el hotel se quedó el dinero de 7 noches → la comisión sobre 7 noches es correcta* → **NOT_DISPUTABLE, confianza ALTA**. No se reclama nada.

**Por qué es EL momento del demo:** cualquier sistema tonto de alertas marcaría D1 y D4 como el mismo error (los dos "durmieron menos noches de las facturadas"). El agente los distingue porque no compara noches — sigue el dinero. **Mismo síntoma, diagnóstico opuesto.** Un detector de alarmas alarma todo; un auditor con juicio sabe cuándo NO actuar. Esto es lo que separa a Clawback de un query de base de datos, y es lo que los jueces premian.

**En el video, D1 y D4 van juntos siempre.** Nunca sacrificar este contraste (regla del HACKATHON.md).

---

## W — "Los clientes fieles que siguen pagando peaje" (Win-Back) 💌

**5 huéspedes recurrentes que siguen reservando por OTA**

**La historia:** en 18 meses de historial hay huéspedes que ya son clientes del hotel... pero siguen reservando por Booking/Expedia, y el hotel paga 15–17% de comisión **cada vez** por alguien que volvería igual. *Como pagarle comisión al Tinder por cada cita con tu esposa.*

**Los personajes sembrados:**

| Huésped | Segmento | Su historia | Su oferta (según la escalera de beneficios) |
|---|---|---|---|
| **Carlos M.** | ★ CAMPEÓN | 5 estancias, la última hace 21 días, gasta ~$16,500 por visita, siempre Booking. Quema **$2,480 de comisión por visita**. | Upgrade a suite (verificando disponibilidad) + late checkout + precio preferencial en tours + mesa preferente. **SIN descuento** — ya viene igual, regalarle descuento es quemar margen. |
| **Laura R.** | LEAL | 3 estancias vía Expedia, gasta mucho en el restaurante. | Tarifa directa + welcome drink + **clase de cocina** (la venta cruzada sale de SU historial — por eso es personalizada, no plantilla). |
| **Miguel A.** | LEAL | 3 estancias vía Booking. | Tarifa directa + welcome drink. |
| **Sofia T.** | PROMETEDOR | 2 estancias recientes. | Tarifa directa endulzada para empujar la tercera visita. |
| **Roberto D.** | DORMIDO | Gastaba muchísimo (suites), no viene hace 8 meses. | Oferta de reactivación con gancho. |

**Por qué importa en el demo:** el agente no manda promociones genéricas — hace análisis RFM (recencia, frecuencia, gasto), calcula cuánta comisión quema cada huésped, y arma la oferta según las reglas escritas del hotel (la "escalera de beneficios", que también lee de un documento). Y la frase matadora para jueces: *nuestro Win-Back sabe cuánto cuesta cada huésped porque auditó las facturas — un CRM no sabe eso.*

---

## LR — "La regla que ya sabía" (la memoria) 🧠

**Una exención pre-sembrada en la base de datos**

**La historia:** antes de que empiece el demo, ya existe una regla aprendida guardada: *"las reservas de 'Corporativo Mixteca' tienen convenio corporativo con comisión negociada — nunca disputarlas"*.

**Lo que hace el agente:** al arrancar la auditoría, consulta sus reglas aprendidas y lo anuncia en su plan: *"1 exemption on file"*. 

**Por qué importa en el demo:** demuestra que las correcciones del gerente **persisten y se aplican solas** en cada auditoría futura. Es el gemelo del momento estrella del chat: el gerente corrige por chat → banner verde "✓ RULE LEARNED" → y si vuelves a correr la auditoría, el agente ya dice "2 exemptions on file" y los totales cambian. Mismos datos, resultado distinto, *porque aprendió*. Ese es el sello GROVA.

---

## Chuleta rápida (para pegar junto al monitor)

| Código | En una frase | Decisión esperada |
|---|---|---|
| **S0** | No-show de anoche sin marcar — quedan 36h | 🔴 ALERTA · $1,850 en riesgo |
| **D1** | Se fue antes, tarifa FLEX, le devolvieron 2 noches, cobraron comisión por 7 | ✅ DISPUTABLE · ALTA · $756 |
| **D2** | No-show marcado a tiempo, la OTA lo cobró igual | ✅ DISPUTABLE · ALTA · $2,120 |
| **D3** | Comisión sobre una cifra mayor a lo cobrado, pero falta el check-out | 🟡 VERIFICAR · MEDIA · $420 |
| **D4** | Se fue antes, pero tarifa NR: el hotel se quedó todo | ⛔ NO DISPUTABLE · ALTA · $0 |
| **W** | 5 huéspedes fieles reservando por OTA (Carlos el Campeón, etc.) | 💌 Ofertas por segmento |
| **LR** | Regla pre-guardada: convenio corporativo, no disputar | 🧠 "1 exemption on file" |

*Los montos son ejemplos — se ajustarán en el Block 5 para que la cifra trimestral cuadre. Los CASOS y sus decisiones no cambian jamás.*

---

*Dónde vive cada caso en el código: sembrados en `server/db/seed.ts` (buscar los comentarios S0/D1/D2/D3/D4/W/LR) · la versión scripted del demo en `server/agent/fakeFeed.ts` · la spec original en `HACKATHON.md` §7.*
