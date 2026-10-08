import { useEffect, useState } from 'react'
import { MenuPage } from './features/menu/MenuPage'
import { IdeaDetail } from './features/ideas/IdeaDetail'
import { IdeasPage } from './features/ideas/IdeasPage'
import { PersonalPage } from './features/personal/PersonalPage'
import { useSeedRecipes } from './features/recipes/hooks'
import { usePersonalEnabled } from './lib/personal'
import { RecipeDetail } from './features/recipes/RecipeDetail'
import { RecipeEditor } from './features/recipes/RecipeEditor'
import { RecipesPage } from './features/recipes/RecipesPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { ShoppingPage } from './features/shopping/ShoppingPage'
import { clearHousehold, loadHousehold, saveHousehold, type Household } from './household/session'
import { WelcomePage } from './household/WelcomePage'
import { DEMO_MODE, SUPABASE_CONFIGURED, SUPABASE_ERROR } from './lib/supabase'
import { AjustesPlanner } from './planner/AjustesPlanner'
import { DineroPage } from './planner/DineroPage'
import { HoyPage } from './planner/HoyPage'
import { useImportarDinero } from './planner/hooks'
import { ListasPage } from './planner/ListasPage'
import { SemanaPage } from './planner/SemanaPage'
import { EngineProvider, useEngine, useHasEngine } from './sync/EngineProvider'
import { BottomNav, COMIDA_TABS, type ComidaTab, type Tab } from './ui/BottomNav'
import { FeedbackProvider } from './ui/feedback'
import { SyncBadge } from './ui/SyncBadge'

const PLANNER_TABS = ['hoy', 'semana', 'dinero', 'listas'] as const
const TABS: Tab[] = [...PLANNER_TABS, ...COMIDA_TABS]
const TAB_TITLES: Record<Tab, string> = {
  hoy: 'Hoy',
  semana: 'Mi semana',
  dinero: 'Cuentas claras',
  listas: 'Listas',
  menu: 'Menú semanal',
  compra: 'La compra',
  recetas: 'Recetas',
  yo: 'Lo mío',
}
const LAST_TAB_KEY = 'planner.ultima-pestana'
const LAST_COMIDA_KEY = 'planner.ultima-comida'

interface Route {
  path: string
  tab: Tab | null
  /** Pantallas "hijas" con botón Volver. */
  page: 'lista' | 'ajustes' | 'receta' | 'editar-receta' | 'nueva-receta' | 'ideas' | 'idea' | 'ideas-yo'
  id: string | null
}

function leer(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function guardar(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* sin almacenamiento */
  }
}

function lastTab(): Tab {
  const t = leer(LAST_TAB_KEY) as Tab | null
  return t && TABS.includes(t) ? t : 'hoy'
}

function lastComida(): ComidaTab {
  const t = leer(LAST_COMIDA_KEY) as ComidaTab | null
  return t && COMIDA_TABS.includes(t) ? t : 'menu'
}

const esComida = (t: Tab | null): t is ComidaTab => !!t && (COMIDA_TABS as readonly string[]).includes(t)

function parseRoute(): Route {
  const path = location.hash.replace(/^#\/?/, '')
  const parts = path.split('/').filter(Boolean)
  if (parts[0] === 'ajustes') return { path, tab: null, page: 'ajustes', id: null }
  if (parts[0] === 'yo' && parts[1] === 'ideas') return { path, tab: 'yo', page: 'ideas-yo', id: null }
  // «Mis recetas» (pestaña Yo): mismas pantallas, con vuelta a la pestaña Yo.
  if (parts[0] === 'yo' && parts[1] === 'recetas' && parts[2] === 'nueva') return { path, tab: 'yo', page: 'nueva-receta', id: null }
  if (parts[0] === 'yo' && parts[1] === 'recetas' && parts[2] && parts[3] === 'editar') return { path, tab: 'yo', page: 'editar-receta', id: parts[2] }
  if (parts[0] === 'yo' && parts[1] === 'recetas' && parts[2]) return { path, tab: 'yo', page: 'receta', id: parts[2] }
  if (parts[0] === 'recetas' && parts[1] === 'ideas' && parts[2]) return { path, tab: 'recetas', page: 'idea', id: parts[2] }
  if (parts[0] === 'recetas' && parts[1] === 'ideas') return { path, tab: 'recetas', page: 'ideas', id: null }
  if (parts[0] === 'recetas' && parts[1] === 'nueva') return { path, tab: 'recetas', page: 'nueva-receta', id: null }
  if (parts[0] === 'recetas' && parts[1] && parts[2] === 'editar') return { path, tab: 'recetas', page: 'editar-receta', id: parts[1] }
  if (parts[0] === 'recetas' && parts[1]) return { path, tab: 'recetas', page: 'receta', id: parts[1] }
  const tab = TABS.includes(parts[0] as Tab) ? (parts[0] as Tab) : lastTab()
  return { path: tab, tab, page: 'lista', id: null }
}

function useHashRoute(): [Route, (path: string) => void] {
  const [route, setRoute] = useState<Route>(parseRoute)
  useEffect(() => {
    const onHash = () => setRoute(parseRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return [route, (path) => (location.hash = `/${path}`)]
}

function titleOf(route: Route): string {
  switch (route.page) {
    case 'ajustes':
      return 'Ajustes'
    case 'receta':
      return 'Receta'
    case 'editar-receta':
      return 'Editar receta'
    case 'nueva-receta':
      return 'Nueva receta'
    case 'ideas':
    case 'ideas-yo':
      return 'Ideas'
    case 'idea':
      return 'Idea'
    default:
      return TAB_TITLES[route.tab ?? 'hoy']
  }
}

function parentOf(route: Route): string | null {
  switch (route.page) {
    case 'ajustes':
      return lastTab()
    case 'receta':
    case 'nueva-receta':
      return route.tab === 'yo' ? 'yo' : 'recetas'
    case 'ideas':
      return 'recetas'
    case 'idea':
      return 'recetas/ideas'
    case 'ideas-yo':
      return 'yo'
    case 'editar-receta':
      return `${route.tab === 'yo' ? 'yo/recetas' : 'recetas'}/${route.id}`
    default:
      return null
  }
}

/** Carga las recetas iniciales cuando la comida está conectada. */
function ComidaSeeder() {
  useSeedRecipes()
  return null
}

/** Pestañas de arriba dentro de «Comida»: las mismas que tenía la app de comida. */
function ComidaNav({ current, go, showPersonal }: { current: ComidaTab; go: (p: string) => void; showPersonal: boolean }) {
  const tabs: Array<[ComidaTab, string, string]> = [
    ['menu', '📅', 'Menú'],
    ['compra', '🛒', 'Compra'],
    ['recetas', '📖', 'Recetas'],
    ['yo', '🥗', 'Yo'],
  ]
  const visibles = showPersonal ? tabs : tabs.filter(([id]) => id !== 'yo')
  return (
    <div className="mb-4 grid gap-1 rounded-2xl bg-crema-oscuro p-1" style={{ gridTemplateColumns: `repeat(${visibles.length}, minmax(0, 1fr))` }}>
      {visibles.map(([id, icon, label]) => (
        <button
          key={id}
          onClick={() => go(id)}
          aria-current={current === id ? 'page' : undefined}
          className={`flex min-h-12 items-center justify-center gap-1 rounded-xl text-base font-bold ${current === id ? 'bg-white text-terra shadow-sm' : 'text-gris'}`}
        >
          <span aria-hidden>{icon}</span>
          {label}
        </button>
      ))}
    </div>
  )
}

function ComidaPages({ route, go, onReady }: { route: Route; go: (p: string) => void; onReady: (h: Household) => void }) {
  const hasEngine = useHasEngine()
  const personal = usePersonalEnabled()
  if (!SUPABASE_CONFIGURED && !DEMO_MODE) return <ConfigMissing />
  if (!hasEngine) return <WelcomePage embedded onReady={onReady} />
  const recipeBase = route.tab === 'yo' ? 'yo/recetas' : 'recetas'
  return (
    <>
      {route.page === 'lista' && esComida(route.tab) && <ComidaNav current={route.tab} go={go} showPersonal={personal} />}
      {route.page === 'lista' && route.tab === 'compra' && <ShoppingPage />}
      {route.page === 'lista' && route.tab === 'menu' && <MenuPage go={go} />}
      {route.page === 'lista' && route.tab === 'recetas' && <RecipesPage go={go} />}
      {route.page === 'lista' && route.tab === 'yo' && (personal ? <PersonalPage go={go} /> : <PersonalDisabled go={go} />)}
      {route.page === 'ideas' && <IdeasPage go={go} />}
      {route.page === 'ideas-yo' && <IdeasPage go={go} only="saludable" />}
      {route.page === 'idea' && route.id && <IdeaDetail slug={route.id} go={go} />}
      {route.page === 'receta' && route.id && <RecipeDetail key={route.path} id={route.id} go={go} base={recipeBase} />}
      {route.page === 'editar-receta' && route.id && <RecipeEditor id={route.id} go={go} base={recipeBase} />}
      {route.page === 'nueva-receta' && <RecipeEditor key={route.path} id={null} go={go} base={recipeBase} />}
    </>
  )
}

function ComidaSettings({ onLeave }: { onLeave: () => void }) {
  const engine = useEngine()
  const leave = async () => {
    engine.dispose()
    engine.db.close()
    await engine.db.delete().catch(() => {})
    onLeave()
  }
  return <SettingsPage onLeave={leave} />
}

function Shell({ onReady, onLeave }: { onReady: (h: Household) => void; onLeave: () => void }) {
  const [route, go] = useHashRoute()
  const hasEngine = useHasEngine()
  useImportarDinero()

  useEffect(() => {
    document.title = `${titleOf(route)} · Mi planner`
    window.scrollTo(0, 0)
    if (route.page === 'lista' && route.tab) {
      guardar(LAST_TAB_KEY, route.tab)
      if (esComida(route.tab)) guardar(LAST_COMIDA_KEY, route.tab)
    }
  }, [route.path, route.page, route.tab])

  const parent = parentOf(route)
  const comida = esComida(route.tab)

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      {hasEngine && <ComidaSeeder />}
      <header className="sticky top-0 z-20 border-b-2 border-borde bg-crema/95 px-4 pt-safe backdrop-blur">
        <div className="flex min-h-16 items-center gap-2">
          {parent ? (
            <>
              <button onClick={() => go(parent)} className="-ml-2 min-h-12 shrink-0 rounded-xl px-2 text-lg font-semibold text-terra">
                ‹ Volver
              </button>
              <h1 className="min-w-0 flex-1 truncate text-center text-lg font-bold">{titleOf(route)}</h1>
            </>
          ) : (
            <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold">{titleOf(route)}</h1>
          )}
          {comida && hasEngine && <SyncBadge />}
          {route.page !== 'ajustes' && (
            <button onClick={() => go('ajustes')} aria-label="Ajustes" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl">
              ⚙️
            </button>
          )}
        </div>
        {DEMO_MODE && comida && (
          <p className="-mx-4 bg-aviso-claro px-4 py-1 text-center text-sm font-semibold text-aviso">
            Modo prueba: los datos solo se guardan en este dispositivo
          </p>
        )}
      </header>

      <main className="flex-1 px-4 pt-4 pb-32">
        {route.page === 'lista' && route.tab === 'hoy' && <HoyPage go={go} />}
        {route.page === 'lista' && route.tab === 'semana' && <SemanaPage />}
        {route.page === 'lista' && route.tab === 'dinero' && <DineroPage />}
        {route.page === 'lista' && route.tab === 'listas' && <ListasPage />}
        {comida && <ComidaPages route={route} go={go} onReady={onReady} />}
        {route.page === 'ajustes' && (
          <div className="flex flex-col gap-6">
            <AjustesPlanner />
            {hasEngine && (
              <div className="flex flex-col gap-4">
                <h2 className="px-1 text-xl font-extrabold">🍽️ Comida</h2>
                <ComidaSettings onLeave={onLeave} />
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav current={comida ? 'comida' : (route.tab ?? '')} onChange={(t) => go(t === 'comida' ? lastComida() : t)} />
    </div>
  )
}

function PersonalDisabled({ go }: { go: (path: string) => void }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-4 text-center">
      <p className="text-lg text-gris">La sección personal no está activada en este móvil.</p>
      <button onClick={() => go('ajustes')} className="min-h-14 rounded-2xl bg-terra px-6 text-lg font-bold text-white">
        Ir a Ajustes
      </button>
    </div>
  )
}

function ConfigMissing() {
  return (
    <div className="flex flex-col gap-4 py-10 text-center">
      <h2 className="text-2xl font-bold">Falta conectar la comida</h2>
      <p className="text-lg text-gris">
        Añade <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (las mismas que la app de comida) en las variables de entorno de Vercel y vuelve a
        desplegar.
      </p>
      {SUPABASE_ERROR && <p className="rounded-2xl bg-aviso-claro p-3 text-left text-base break-words text-aviso">Error: {SUPABASE_ERROR}</p>}
    </div>
  )
}

export default function App() {
  const [household, setHousehold] = useState<Household | null>(loadHousehold)
  const onReady = (h: Household) => {
    saveHousehold(h)
    setHousehold(h)
  }
  const onLeave = () => {
    clearHousehold()
    setHousehold(null)
  }

  const shell = <Shell onReady={onReady} onLeave={onLeave} />
  return (
    <FeedbackProvider>
      {household && (SUPABASE_CONFIGURED || DEMO_MODE) ? (
        <EngineProvider key={household.id} household={household}>
          {shell}
        </EngineProvider>
      ) : (
        shell
      )}
    </FeedbackProvider>
  )
}
