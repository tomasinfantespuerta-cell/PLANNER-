# Cómo poner en marcha «Comidas de casa»

Tardarás unos 15 minutos. Solo hace falta una cuenta gratuita en
[Supabase](https://supabase.com) y otra en [Vercel](https://vercel.com). Puedes
entrar en las dos con tu cuenta de GitHub.

---

## 1. Crear el proyecto en Supabase

1. Entra en <https://supabase.com/dashboard> → **New project**.
2. Rellena:
   - **Name:** `comidas-casa`
   - **Database password:** pulsa *Generate* y guárdala en algún sitio (no la vas a necesitar para la app).
   - **Region:** *West EU (Ireland)* o *Central EU (Frankfurt)*, la más cercana.
3. Pulsa **Create new project** y espera 1–2 minutos a que termine.

## 2. Crear las tablas

1. En el menú de la izquierda: **SQL Editor** → **New query**.
2. Abre el archivo [`supabase/migrations/0001_inicial.sql`](../supabase/migrations/0001_inicial.sql),
   copia **todo** su contenido y pégalo en el editor.
3. Pulsa **Run**. Debe decir *Success. No rows returned*.

Esto crea:

| Tabla | Para qué |
|---|---|
| `households` | Cada «casa» con su código |
| `household_members` | Qué móviles pertenecen a cada casa |
| `shopping_items` | Lista de la compra (con su orden guardado en `position`) |
| `recipes` | Recetario (se usará en la fase 2) |
| `menu_days` | Menú de cada día (fase 3) |

También crea los permisos (cada móvil solo ve los datos de su casa) y activa
el tiempo real para las tres tablas de datos.

> Se puede ejecutar más de una vez sin problema; no borra nada.

## 3. Activar el acceso anónimo

La app no pide email ni contraseña. Cada móvil entra con una sesión anónima que
el usuario no ve, y el código de casa decide qué datos comparte.

1. **Authentication** → **Sign In / Providers** (en algunas versiones: *Authentication → Settings*).
2. Activa **Allow anonymous sign-ins** y pulsa **Save**.

## 4. Copiar las claves

1. **Project Settings** (rueda dentada) → **API** (o **Data API** / **API Keys**).
2. Apunta estos dos valores:
   - **Project URL**, algo como `https://abcdefghijk.supabase.co`
   - **anon public** key (o la **publishable key**, que empieza por `sb_publishable_…`)

Estas claves pueden ir en la web sin problema: los permisos de la base de
datos (RLS) son los que protegen los datos. **Nunca** uses la `service_role` /
`secret` key en la app.

## 5. Probar en tu ordenador (opcional)

```bash
cp .env.example .env.local      # y pega ahí la URL y la clave
npm install
npm run dev                      # abre http://localhost:5173
npm test                         # pasa las pruebas
```

Para probar sin Supabase: `VITE_DEMO=1 npm run dev`. En ese modo los datos
solo se guardan en ese navegador.

## 6. Desplegar en Vercel

1. Entra en <https://vercel.com/new> e importa el repositorio `MENU-`
   desde GitHub.
2. En la pantalla de configuración:
   - **Framework Preset:** Vite. Normalmente lo detecta solo.
   - **Build Command:** `npm run build`. **Output Directory:** `dist`. Suelen venir ya puestos.
3. Despliega **Environment Variables** y añade:

   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | la Project URL del paso 4 |
   | `VITE_SUPABASE_ANON_KEY` | la anon / publishable key del paso 4 |

4. Pulsa **Deploy**. En un minuto tendrás una dirección tipo
   `https://comidas-casa.vercel.app`.

Cada vez que se suban cambios a la rama principal, Vercel vuelve a desplegar solo.
Si cambias las variables de entorno, pulsa **Redeploy** para que se apliquen.

## 7. Instalar en los móviles

1. Abre la dirección de Vercel en el móvil.
2. La primera persona pulsa **Crear casa nueva** y le sale el código (por ejemplo `pimenton-azafran-5361`).
3. La segunda persona pulsa **Tengo un código de casa** y lo escribe.
4. Para instalarla como app:
   - **Android (Chrome):** menú ⋮ → **Instalar aplicación** o **Añadir a pantalla de inicio**.
   - **iPhone (Safari):** botón compartir ⬆️ → **Añadir a pantalla de inicio**.

El código se puede volver a ver en cualquier momento en **⚙️ Ajustes**.

---

## Cómo funciona el guardado (para curiosos)

- Cada cambio se guarda primero **en el propio móvil** (IndexedDB) junto con una
  «cola de pendientes», y en ese mismo instante se envía a Supabase. Si no hay
  cobertura, la cola espera y se envía sola al volver la conexión, aunque se
  haya cerrado la app entre medias.
- Los identificadores se crean en el móvil, así que reenviar un cambio nunca
  crea duplicados.
- Cada cambio envía solo los campos modificados. Si una persona tacha un producto
  sin cobertura y la otra le cambia la cantidad, se conservan los dos cambios.
- El orden se guarda en el campo `position`. Mover un producto solo modifica ese
  producto, así el orden es idéntico en los dos móviles y al volver a abrir la app.
- Borrar no elimina la fila: la marca con `deleted_at`. Así funciona «Deshacer»
  y un móvil que estaba sin conexión no puede hacer reaparecer algo borrado.
- Supabase Realtime avisa al otro móvil de cada cambio al momento.

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| Pantalla «Falta configurar Supabase» | Faltan las variables de entorno en Vercel (paso 6) o no se volvió a desplegar tras añadirlas. |
| «Falta activar el acceso anónimo…» al crear la casa | Paso 3. |
| «No existe ninguna casa con ese código» | Revisa el código en ⚙️ Ajustes del otro móvil. Da igual escribirlo con mayúsculas o con espacios. |
| El otro móvil no se actualiza al instante | Comprueba que el paso 2 terminó sin errores (activa el tiempo real). De todas formas, la app vuelve a sincronizar al abrirla y cada minuto. |
