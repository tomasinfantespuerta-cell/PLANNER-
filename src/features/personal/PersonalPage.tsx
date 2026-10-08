import { useState } from 'react'
import { MenuPage } from '../menu/MenuPage'
import { RecipesPage } from '../recipes/RecipesPage'
import { ShoppingPage } from '../shopping/ShoppingPage'

type Section = 'menu' | 'compra' | 'recetas'
const KEY = 'comidas-casa.yo.seccion'
const SECTIONS: Array<[Section, string, string]> = [
  ['menu', '📅', 'Mi menú'],
  ['compra', '🛒', 'Mi compra'],
  ['recetas', '📖', 'Mis recetas'],
]

function readSection(): Section {
  try {
    const s = localStorage.getItem(KEY)
    return s === 'compra' || s === 'recetas' ? s : 'menu'
  } catch {
    return 'menu'
  }
}

/** Pestaña «Yo»: menú, lista de la compra y recetas personales. */
export function PersonalPage({ go }: { go: (path: string) => void }) {
  const [section, setSection] = useState<Section>(readSection)
  const choose = (s: Section) => {
    setSection(s)
    try {
      localStorage.setItem(KEY, s)
    } catch {
      /* sin almacenamiento */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-crema-oscuro p-1" role="tablist">
        {SECTIONS.map(([id, icon, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={section === id}
            onClick={() => choose(id)}
            className={`flex min-h-16 flex-col items-center justify-center rounded-xl px-1 text-base leading-tight font-bold ${
              section === id ? 'bg-white text-terra shadow-sm' : 'text-gris'
            }`}
          >
            <span aria-hidden className="text-xl">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {section === 'menu' && (
        <>
          <button
            onClick={() => go('yo/ideas')}
            className="flex min-h-14 items-center justify-between rounded-2xl border-2 border-terra bg-terra-claro px-4 text-left text-lg font-bold text-terra-oscuro"
          >
            <span>✨ Ideas saludables de la semana</span>
            <span aria-hidden>›</span>
          </button>
          <MenuPage go={go} scope="yo" />
        </>
      )}
      {section === 'compra' && <ShoppingPage list="yo" />}
      {section === 'recetas' && <RecipesPage go={go} mine />}
    </div>
  )
}
