# Mi planner

App (PWA instalable) que junta en un sitio el día a día de Tomás:

| Pestaña | Qué tiene |
|---|---|
| ☀️ **Hoy** | Tareas del día (las no hechas pasan solas al día siguiente), exámenes cercanos, acceso directo a la app del gym los días que toca, comida de hoy, horario de hoy con subbloques y lo que queda de dinero este mes |
| 🗓️ **Semana** | «Mi semana» tal cual (con modo exámenes). Cada bloque se abre y tiene **subbloques**; los que son hábito cuentan racha 🔥. Abajo, exámenes y entregas con cuenta atrás |
| 🍽️ **Comida** | La app «Comidas de casa» entera: menú semanal, compra, recetas (con las saludables e ideas) y la sección «Yo». Comparte datos con la app de la familia por el **código de casa** |
| 💶 **Dinero** | «Cuentas Claras»: ingresos, gastos fijos (se repiten cada mes) y variables. Datos importados el 8-oct-2026 |
| 📝 **Listas** | Pendientes sin fecha (con «→ Hoy»), cosas por comprar y notas rápidas |

El gimnasio sigue siendo su propia app: https://gym-seven-plum.vercel.app

## Datos

- **Comida:** Supabase, el mismo proyecto que la app de comida (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).
- **Todo lo demás:** en el móvil (IndexedDB, `src/planner/db.ts`). En Ajustes hay copia de seguridad (descargar / restaurar).

## Scripts

```bash
npm run dev        # desarrollo
npm test           # pruebas (Vitest)
npm run build      # compilación de producción
VITE_DEMO=1 npm run dev   # probar la comida sin Supabase
```

## Estructura

```
src/planner/        lo propio del planner (Hoy, Semana, Dinero, Listas, subbloques, exámenes)
src/features/       la app de comida (sin cambios de funcionamiento)
src/sync/           sincronización offline de la comida con Supabase
supabase/           SQL de la comida (ya aplicado en el proyecto de Supabase existente)
```
