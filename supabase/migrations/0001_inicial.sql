-- =====================================================================
-- Comidas de casa · esquema inicial
-- Pega este archivo entero en Supabase → SQL Editor → Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Casas y miembros
-- ---------------------------------------------------------------------
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null default 'Casa',
  created_at  timestamptz not null default now()
);

-- Cada móvil inicia una sesión anónima de Supabase (auth.users) y queda
-- como miembro de la casa al introducir el código.
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index if not exists household_members_user_idx on public.household_members(user_id);

-- ---------------------------------------------------------------------
-- Datos sincronizados. Todas las tablas siguen el mismo patrón:
--   · clave (household_id, id) con el id generado en el móvil → reintentar
--     un envío nunca duplica;
--   · updated_at lo pone SIEMPRE el servidor (trigger) → sirve para saber
--     qué versión es más nueva y para descargar solo lo cambiado;
--   · deleted_at = borrado "suave" → se puede deshacer y lo borrado no
--     reaparece aunque otro móvil sin conexión lo edite.
-- ---------------------------------------------------------------------
create table if not exists public.shopping_items (
  household_id uuid not null references public.households(id) on delete cascade,
  id           uuid not null,
  name         text not null check (length(btrim(name)) > 0),
  name_norm    text not null default '',
  quantity     text,
  category     text not null default 'otros',
  checked      boolean not null default false,
  checked_at   timestamptz,
  -- Clave de orden ("fractional indexing"). Se compara byte a byte.
  position     text collate "C" not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  primary key (household_id, id)
);
create index if not exists shopping_items_sync_idx on public.shopping_items(household_id, updated_at);

create table if not exists public.recipes (
  household_id uuid not null references public.households(id) on delete cascade,
  id           uuid not null,
  title        text not null check (length(btrim(title)) > 0),
  photo_path   text,
  prep_minutes integer check (prep_minutes is null or prep_minutes >= 0),
  difficulty   text check (difficulty is null or difficulty in ('facil', 'media', 'dificil')),
  servings     integer check (servings is null or servings > 0),
  tags         text[] not null default '{}',
  -- [{ "name": "Lentejas", "quantity": "300 g", "category": "despensa" }, ...]
  ingredients  jsonb not null default '[]'::jsonb,
  -- ["Lavar las lentejas...", "Sofreír..."]
  steps        jsonb not null default '[]'::jsonb,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  primary key (household_id, id)
);
create index if not exists recipes_sync_idx on public.recipes(household_id, updated_at);

-- Un registro por día (id = 'AAAA-MM-DD'). Las semanas se calculan a partir
-- de las fechas, así el historial se conserva solo.
create table if not exists public.menu_days (
  household_id uuid not null references public.households(id) on delete cascade,
  id           text not null check (id ~ '^\d{4}-\d{2}-\d{2}$'),
  dish_text    text,
  recipe_id    uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  primary key (household_id, id)
);
create index if not exists menu_days_sync_idx on public.menu_days(household_id, updated_at);

-- ---------------------------------------------------------------------
-- updated_at automático (hora del servidor, nunca la del móvil)
-- ---------------------------------------------------------------------
create or replace function public.touch_row()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := clock_timestamp();
  if tg_op = 'UPDATE' then
    new.created_at   := old.created_at;
    new.household_id := old.household_id;
  end if;
  return new;
end;
$$;

drop trigger if exists touch_shopping_items on public.shopping_items;
create trigger touch_shopping_items before insert or update on public.shopping_items
  for each row execute function public.touch_row();

drop trigger if exists touch_recipes on public.recipes;
create trigger touch_recipes before insert or update on public.recipes
  for each row execute function public.touch_row();

drop trigger if exists touch_menu_days on public.menu_days;
create trigger touch_menu_days before insert or update on public.menu_days
  for each row execute function public.touch_row();

-- ---------------------------------------------------------------------
-- Permisos (Row Level Security): cada móvil solo ve los datos de su casa
-- ---------------------------------------------------------------------
create or replace function public.is_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.shopping_items    enable row level security;
alter table public.recipes           enable row level security;
alter table public.menu_days         enable row level security;

drop policy if exists "ver mi casa" on public.households;
create policy "ver mi casa" on public.households
  for select to authenticated using (public.is_member(id));

drop policy if exists "ver mis membresias" on public.household_members;
create policy "ver mis membresias" on public.household_members
  for select to authenticated using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['shopping_items', 'recipes', 'menu_days'] loop
    execute format('drop policy if exists "leer" on public.%I', t);
    execute format('drop policy if exists "crear" on public.%I', t);
    execute format('drop policy if exists "editar" on public.%I', t);
    execute format('create policy "leer" on public.%I for select to authenticated using (public.is_member(household_id))', t);
    execute format('create policy "crear" on public.%I for insert to authenticated with check (public.is_member(household_id))', t);
    execute format('create policy "editar" on public.%I for update to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id))', t);
    -- Sin política de DELETE: los borrados son "suaves" (deleted_at).
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Crear casa / unirse con código
-- ---------------------------------------------------------------------
create or replace function public.generate_household_code()
returns text
language plpgsql
volatile
as $$
declare
  words text[] := array[
    'ajo','arroz','atun','bacalao','berenjena','boniato','cacao','calabaza','canela','cebolla',
    'cereza','ciruela','coco','comino','croqueta','dorada','fresa','garbanzo','guisante','haba',
    'higo','hinojo','huevo','jamon','judia','kiwi','laurel','leche','lenteja','lima',
    'limon','lubina','maiz','mango','manzana','melon','membrillo','menta','merluza','miel',
    'mora','nabo','naranja','nata','nuez','oliva','oregano','paella','pan','papaya',
    'pasa','patata','pepino','pera','perejil','pimienta','pimiento','pina','pisto','platano',
    'pollo','puerro','queso','rabano','romero','sal','salmon','sandia','sardina','sepia',
    'seta','sopa','tomate','tomillo','torrija','trigo','trucha','turron','uva','vainilla',
    'yogur','zanahoria','azafran','albahaca','almendra','avellana','cafe','caldo','castana','chorizo',
    'churro','flan','gazpacho','lechuga','mandarina','natilla','pimenton','tortilla','uvas','fideo'
  ];
  n int := array_length(words, 1);
begin
  return words[1 + floor(random() * n)::int] || '-' ||
         words[1 + floor(random() * n)::int] || '-' ||
         lpad((floor(random() * 10000))::int::text, 4, '0');
end;
$$;

create or replace function public.normalize_household_code(p_code text)
returns text
language sql
immutable
as $$
  select regexp_replace(regexp_replace(lower(btrim(coalesce(p_code, ''))), '[^a-z0-9ñ]+', '-', 'g'), '(^-+|-+$)', '', 'g');
$$;

create or replace function public.create_household(p_name text default 'Casa')
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_code text;
  v_id   uuid;
begin
  if v_uid is null then
    raise exception 'Sin sesión' using errcode = '28000';
  end if;
  loop
    v_code := public.generate_household_code();
    exit when not exists (select 1 from public.households where code = v_code);
  end loop;
  insert into public.households (code, name)
    values (v_code, coalesce(nullif(btrim(p_name), ''), 'Casa'))
    returning id into v_id;
  insert into public.household_members (household_id, user_id) values (v_id, v_uid);
  return json_build_object('id', v_id, 'code', v_code, 'name', coalesce(nullif(btrim(p_name), ''), 'Casa'));
end;
$$;

create or replace function public.join_household(p_code text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_h   public.households%rowtype;
begin
  if v_uid is null then
    raise exception 'Sin sesión' using errcode = '28000';
  end if;
  select * into v_h from public.households where code = public.normalize_household_code(p_code);
  if not found then
    raise exception 'Código de casa no encontrado' using errcode = 'P0002';
  end if;
  insert into public.household_members (household_id, user_id)
    values (v_h.id, v_uid)
    on conflict do nothing;
  return json_build_object('id', v_h.id, 'code', v_h.code, 'name', v_h.name);
end;
$$;

revoke all on function public.create_household(text) from public, anon;
revoke all on function public.join_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;

-- ---------------------------------------------------------------------
-- Tiempo real
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['shopping_items', 'recipes', 'menu_days'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
