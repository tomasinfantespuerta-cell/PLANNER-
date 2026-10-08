import { useEffect, useRef, useState } from 'react'
import { guessCategory } from '../../lib/categories'
import { capitalize, newId } from '../../lib/text'
import { useEngine } from '../../sync/EngineProvider'
import { useFeedback } from '../../ui/feedback'
import { DIFFICULTIES, FILTERS, type Difficulty, type Recipe } from './logic'
import { useRecipe } from './hooks'
import { kcalFromMacros, nutritionFromTags, withMine, withNutrition } from './nutrition'
import { photoToDataUrl } from './photo'

interface Draft {
  title: string
  photo_path: string | null
  prep_minutes: string
  difficulty: Difficulty | null
  servings: string
  tags: string[]
  ingredients: Array<{ name: string; quantity: string }>
  steps: string[]
  kcal: string
  protein: string
  carbs: string
  fat: string
}

function toDraft(r: Recipe | null | undefined): Draft {
  const n = nutritionFromTags(r?.tags)
  return {
    kcal: n ? String(n.kcal) : '',
    protein: n ? String(n.protein) : '',
    carbs: n ? String(n.carbs) : '',
    fat: n ? String(n.fat) : '',
    title: r?.title ?? '',
    photo_path: r?.photo_path ?? null,
    prep_minutes: r?.prep_minutes ? String(r.prep_minutes) : '',
    difficulty: r?.difficulty ?? null,
    servings: r?.servings ? String(r.servings) : '',
    // Las etiquetas internas (favorita, nutrición) se conservan; la nutrición se edita aparte.
    tags: withNutrition(r?.tags, null),
    ingredients: (r?.ingredients?.length ? r.ingredients : [{ name: '', quantity: '' }]).map((i) => ({
      name: i.name ?? '',
      quantity: i.quantity ?? '',
    })),
    steps: r?.steps?.length ? [...r.steps] : [''],
  }
}

/** Si hay algún macro, completa lo que falte (las kcal se calculan si no se ponen). */
function draftNutrition(d: Draft) {
  const n = (s: string) => (s.trim() === '' ? null : Math.max(0, parseInt(s, 10) || 0))
  const [kcal, p, c, f] = [n(d.kcal), n(d.protein), n(d.carbs), n(d.fat)]
  if ([kcal, p, c, f].every((x) => x === null)) return null
  return {
    protein: p ?? 0,
    carbs: c ?? 0,
    fat: f ?? 0,
    kcal: kcal ?? kcalFromMacros(p ?? 0, c ?? 0, f ?? 0),
  }
}

function toRow(d: Draft): Record<string, unknown> {
  const num = (s: string) => {
    const n = parseInt(s, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return {
    title: capitalize(d.title),
    photo_path: d.photo_path,
    prep_minutes: num(d.prep_minutes),
    difficulty: d.difficulty,
    servings: num(d.servings),
    tags: withNutrition(d.tags, draftNutrition(d)),
    ingredients: d.ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({ name: capitalize(i.name), quantity: i.quantity.trim() || null, category: guessCategory(i.name) })),
    steps: d.steps.map((s) => s.trim()).filter(Boolean),
  }
}

/** Crear o editar una receta. Se guarda sola mientras se escribe. */
export function RecipeEditor({ id, go, base = 'recetas' }: { id: string | null; go: (path: string) => void; base?: string }) {
  const existing = useRecipe(id)
  if (id && existing === undefined) return <p className="p-6 text-center text-lg text-gris">Cargando…</p>
  return <EditorForm key={id ?? 'nueva'} initial={existing ?? null} go={go} base={base} />
}

function EditorForm({ initial, go, base }: { initial: Recipe | null; go: (path: string) => void; base: string }) {
  const engine = useEngine()
  const { showInfo } = useFeedback()
  const [draft, setDraft] = useState<Draft>(() => {
    const d = toDraft(initial)
    return !initial && base.startsWith('yo') ? { ...d, tags: withMine(d.tags, true) } : d
  })
  const [id] = useState(() => initial?.id ?? newId())
  const created = useRef(Boolean(initial))
  const lastSaved = useRef(initial ? JSON.stringify(toRow(toDraft(initial))) : '')
  const [busyPhoto, setBusyPhoto] = useState(false)

  const save = () => {
    const row = toRow(draft)
    if (!String(row.title).trim()) return
    const json = JSON.stringify(row)
    if (json === lastSaved.current) return
    lastSaved.current = json
    if (created.current) {
      void engine.update('recipes', id, row)
    } else {
      created.current = true
      void engine.insert('recipes', { ...row, id, deleted_at: null })
    }
  }
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const t = setTimeout(() => saveRef.current(), 600)
    return () => clearTimeout(t)
  }, [draft])
  useEffect(() => () => saveRef.current(), [])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    setBusyPhoto(true)
    try {
      set('photo_path', await photoToDataUrl(file))
    } catch {
      showInfo('No se pudo cargar la foto')
    } finally {
      setBusyPhoto(false)
    }
  }

  const done = () => {
    if (!draft.title.trim()) {
      go(base)
      return
    }
    save()
    go(`${base}/${id}`)
  }

  const input = 'min-h-14 w-full rounded-2xl border-2 border-borde bg-white px-4 text-lg placeholder:text-gris/60'
  const label = 'text-base font-semibold text-gris'

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className={label}>Nombre del plato</span>
        <input className={input} value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="Por ejemplo: Arroz con pollo" autoFocus={!initial} />
      </label>

      <section className="flex flex-col gap-2">
        <span className={label}>Foto (opcional)</span>
        {draft.photo_path && <img src={draft.photo_path} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 border-borde bg-white text-base font-semibold">
            📷 Hacer foto
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void onPhoto(e.target.files?.[0])} />
          </label>
          <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 border-borde bg-white text-base font-semibold">
            🖼️ De la galería
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => void onPhoto(e.target.files?.[0])} />
          </label>
        </div>
        {busyPhoto && <p className="text-base text-gris">Preparando la foto…</p>}
        {draft.photo_path && (
          <button onClick={() => set('photo_path', null)} className="min-h-12 text-base font-semibold text-terra underline">
            Quitar foto
          </button>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={label}>Minutos</span>
          <input className={input} inputMode="numeric" value={draft.prep_minutes} onChange={(e) => set('prep_minutes', e.target.value.replace(/\D/g, ''))} placeholder="45" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Raciones</span>
          <input className={input} inputMode="numeric" value={draft.servings} onChange={(e) => set('servings', e.target.value.replace(/\D/g, ''))} placeholder="4" />
        </label>
      </div>

      <fieldset>
        <legend className={`mb-2 ${label}`}>Dificultad</legend>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              onClick={() => set('difficulty', draft.difficulty === d.id ? null : d.id)}
              aria-pressed={draft.difficulty === d.id}
              className={`min-h-14 rounded-2xl border-2 text-base font-semibold ${draft.difficulty === d.id ? 'border-terra bg-terra-claro' : 'border-borde bg-white'}`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={`mb-2 ${label}`}>Tipo de plato</legend>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const on = draft.tags.includes(f.id)
            return (
              <button
                key={f.id}
                onClick={() => set('tags', on ? draft.tags.filter((t) => t !== f.id) : [...draft.tags, f.id])}
                aria-pressed={on}
                className={`min-h-12 rounded-full border-2 px-4 text-base font-semibold ${on ? 'border-terra bg-terra-claro' : 'border-borde bg-white'}`}
              >
                {f.emoji} {f.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className={`mb-1 ${label}`}>Por ración (opcional)</legend>
        <p className="mb-2 text-sm text-gris">Si pones proteínas, hidratos y grasas, las calorías se calculan solas.</p>
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ['kcal', 'Kcal'],
              ['protein', 'Prot. g'],
              ['carbs', 'Hidr. g'],
              ['fat', 'Grasa g'],
            ] as const
          ).map(([key, text]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-center text-sm font-semibold text-gris">{text}</span>
              <input
                className="min-h-14 w-full min-w-0 rounded-2xl border-2 border-borde bg-white px-1 text-center text-lg"
                inputMode="numeric"
                value={draft[key]}
                placeholder={key === 'kcal' && draftNutrition(draft) ? String(draftNutrition(draft)!.kcal) : '–'}
                onChange={(e) => set(key, e.target.value.replace(/\D/g, ''))}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <section className="flex flex-col gap-2">
        <span className={label}>Ingredientes</span>
        {draft.ingredients.map((ing, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              className={`${input} min-w-0 flex-[3]`}
              value={ing.name}
              aria-label={`Ingrediente ${idx + 1}`}
              placeholder="Ingrediente"
              onChange={(e) => set('ingredients', draft.ingredients.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
            />
            <input
              className={`${input} min-w-0 flex-[2]`}
              value={ing.quantity}
              aria-label={`Cantidad del ingrediente ${idx + 1}`}
              placeholder="Cantidad"
              onChange={(e) => set('ingredients', draft.ingredients.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))}
            />
            <button
              aria-label={`Quitar ingrediente ${idx + 1}`}
              onClick={() => set('ingredients', draft.ingredients.length > 1 ? draft.ingredients.filter((_, i) => i !== idx) : [{ name: '', quantity: '' }])}
              className="w-12 shrink-0 rounded-2xl text-xl text-gris"
            >
              ✕
            </button>
          </div>
        ))}
        <button onClick={() => set('ingredients', [...draft.ingredients, { name: '', quantity: '' }])} className="min-h-12 rounded-2xl border-2 border-dashed border-borde text-base font-semibold text-terra">
          + Añadir ingrediente
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <span className={label}>Pasos</span>
        {draft.steps.map((step, idx) => (
          <div key={idx} className="flex gap-2">
            <span aria-hidden className="mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terra text-base font-bold text-white">
              {idx + 1}
            </span>
            <textarea
              className="min-h-24 min-w-0 flex-1 rounded-2xl border-2 border-borde bg-white p-3 text-lg"
              value={step}
              aria-label={`Paso ${idx + 1}`}
              placeholder="Qué hay que hacer…"
              onChange={(e) => set('steps', draft.steps.map((x, i) => (i === idx ? e.target.value : x)))}
            />
            <button
              aria-label={`Quitar paso ${idx + 1}`}
              onClick={() => set('steps', draft.steps.length > 1 ? draft.steps.filter((_, i) => i !== idx) : [''])}
              className="w-12 shrink-0 rounded-2xl text-xl text-gris"
            >
              ✕
            </button>
          </div>
        ))}
        <button onClick={() => set('steps', [...draft.steps, ''])} className="min-h-12 rounded-2xl border-2 border-dashed border-borde text-base font-semibold text-terra">
          + Añadir paso
        </button>
      </section>

      <p className="text-center text-base text-gris">Los cambios se guardan solos.</p>
      <button onClick={done} className="min-h-16 rounded-2xl bg-terra text-xl font-bold text-white">
        Listo
      </button>
    </div>
  )
}
