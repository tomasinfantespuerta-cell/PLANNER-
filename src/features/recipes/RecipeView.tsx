import { useEffect, useState, type ReactNode } from 'react'
import { usePersonalEnabled } from '../../lib/personal'
import { ChoiceSheet } from '../../ui/ChoiceSheet'
import { PutInMenuSheet } from '../menu/PutInMenuSheet'
import type { ListId } from '../shopping/logic'
import { useAddToShopping } from '../shopping/useAddToShopping'
import { difficultyLabel, formatMinutes, ingredientsForShopping, type Recipe } from './logic'
import { isFavorite, nutritionFromTags } from './nutrition'
import { RecipeImage } from './RecipeImage'

interface Props {
  recipe: Recipe
  /** Botón extra encima de los demás (p. ej. «Guardar en el recetario»). */
  extraAction?: ReactNode
  /** Botones al final (editar, borrar…). */
  footer?: ReactNode
  /** Para ideas aún no guardadas. */
  ensureSaved?: () => Promise<string>
  onToggleFavorite?: () => void
}

function NutritionBox({ tags }: { tags: string[] }) {
  const n = nutritionFromTags(tags)
  if (!n) return null
  const items = [
    { label: 'Calorías', value: `${n.kcal}`, unit: 'kcal', cls: 'bg-terra text-white' },
    { label: 'Proteínas', value: `${n.protein}`, unit: 'g', cls: 'bg-white' },
    { label: 'Hidratos', value: `${n.carbs}`, unit: 'g', cls: 'bg-white' },
    { label: 'Grasas', value: `${n.fat}`, unit: 'g', cls: 'bg-white' },
  ]
  return (
    <section className="rounded-3xl border-2 border-borde bg-crema-oscuro/60 p-4" aria-label="Valor nutricional por ración">
      <h3 className="mb-3 text-base font-bold text-gris">Por ración (aproximado)</h3>
      <dl className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <div key={it.label} className={`flex min-w-0 flex-col rounded-2xl px-4 py-2 ${it.cls}`}>
            <dt className={`text-base font-semibold ${it.cls.includes('text-white') ? 'text-white/90' : 'text-gris'}`}>{it.label}</dt>
            <dd className="whitespace-nowrap">
              <span className="text-2xl font-extrabold">{it.value}</span>
              <span className="ml-1 text-sm font-semibold">{it.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Mantiene la pantalla encendida mientras se cocina con la receta abierta. */
function useKeepScreenOn() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    let cancelled = false
    const request = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
        const l = await wl?.request('screen')
        if (cancelled) void l?.release()
        else lock = l ?? null
      } catch {
        /* no soportado o sin permiso: no pasa nada */
      }
    }
    void request()
    const onVisible = () => document.visibilityState === 'visible' && void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
    }
  }, [])
}

export function RecipeView({ recipe, extraAction, footer, ensureSaved, onToggleFavorite }: Props) {
  const favorite = isFavorite(recipe.tags)
  const personal = usePersonalEnabled()
  const addToShopping = useAddToShopping()
  const [choosingDay, setChoosingDay] = useState(false)
  const [choosingList, setChoosingList] = useState(false)
  useKeepScreenOn()

  const add = (list: ListId) => void addToShopping(ingredientsForShopping(recipe), list)

  const meta = [
    formatMinutes(recipe.prep_minutes) && `⏱ ${formatMinutes(recipe.prep_minutes)}`,
    difficultyLabel(recipe.difficulty) && `👩‍🍳 ${difficultyLabel(recipe.difficulty)}`,
    recipe.servings && `🍽 ${recipe.servings} ${recipe.servings === 1 ? 'ración' : 'raciones'}`,
    recipe.tags?.includes('saludable') && '🥗 Saludable',
  ].filter(Boolean) as string[]

  return (
    <article className="flex flex-col gap-5">
      {recipe.photo_path && <RecipeImage recipe={recipe} className="aspect-[4/3] w-full rounded-3xl" />}
      <div>
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 text-2xl leading-tight font-extrabold">{recipe.title}</h2>
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              aria-pressed={favorite}
              aria-label={favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 text-3xl ${
                favorite ? 'border-aviso bg-aviso-claro text-aviso' : 'border-borde bg-white text-gris'
              }`}
            >
              {favorite ? '★' : '☆'}
            </button>
          )}
        </div>
        {meta.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {meta.map((m) => (
              <li key={m} className="rounded-full bg-crema-oscuro px-3 py-1 text-base font-semibold">{m}</li>
            ))}
          </ul>
        )}
      </div>

      <NutritionBox tags={recipe.tags ?? []} />

      <div className="flex flex-col gap-3">
        {extraAction}
        <button
          onClick={() => (personal ? setChoosingList(true) : add('familia'))}
          className="min-h-16 rounded-2xl bg-terra px-4 text-lg font-bold text-white active:scale-[0.98]"
        >
          🛒 Añadir ingredientes a la compra
        </button>
        <button onClick={() => setChoosingDay(true)} className="min-h-16 rounded-2xl bg-oliva px-4 text-lg font-bold text-white active:scale-[0.98]">
          📅 Poner en el menú
        </button>
      </div>

      {recipe.ingredients?.length > 0 && (
        <section className="rounded-3xl border-2 border-borde bg-white p-5">
          <h3 className="mb-3 text-xl font-bold">Ingredientes</h3>
          <ul className="flex flex-col gap-2">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="flex gap-3 text-lg leading-snug">
                <span aria-hidden className="text-terra">•</span>
                <span>
                  <strong className="font-semibold">{ing.name}</strong>
                  {ing.quantity && <span className="text-gris"> — {ing.quantity}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.steps?.length > 0 && (
        <section className="rounded-3xl border-2 border-borde bg-white p-5">
          <h3 className="mb-3 text-xl font-bold">Preparación</h3>
          <ol className="flex flex-col gap-4">
            {recipe.steps.map((step, idx) => (
              <li key={idx} className="flex gap-3 text-lg leading-snug">
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terra text-base font-bold text-white">
                  {idx + 1}
                </span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {recipe.notes && (
        <section className="rounded-3xl bg-aviso-claro p-5 text-lg">
          <h3 className="mb-1 font-bold">Notas</h3>
          <p className="whitespace-pre-line">{recipe.notes}</p>
        </section>
      )}

      {footer}

      {choosingDay && <PutInMenuSheet recipe={recipe} ensureSaved={ensureSaved} onClose={() => setChoosingDay(false)} />}
      {choosingList && (
        <ChoiceSheet<ListId>
          title="¿A qué lista?"
          options={[
            { id: 'familia', label: '🛒 Compra familiar', hint: 'La de toda la casa' },
            { id: 'yo', label: '🥗 Mi compra', hint: 'Tu lista personal' },
          ]}
          onChoose={add}
          onClose={() => setChoosingList(false)}
        />
      )}
    </article>
  )
}
