import { useMemo } from 'react'
import { formatWeekRange, weekDates } from '../../lib/dates'
import { useEngine } from '../../sync/EngineProvider'
import { useFeedback } from '../../ui/feedback'
import { Sheet } from '../../ui/Sheet'
import { useRecipes } from '../recipes/hooks'
import { dishLabel, hasDish, pastWeeksWithDishes, planCopyWeek, type MenuDay, type MenuScope } from './logic'

interface Props {
  scope: MenuScope
  targetMonday: string
  byDate: Map<string, MenuDay>
  onClose: () => void
}

export function CopyWeekSheet({ scope, targetMonday, byDate, onClose }: Props) {
  const engine = useEngine()
  const { confirm, showUndo } = useFeedback()
  const recipes = useRecipes()
  const recipeMap = useMemo(() => new Map((recipes ?? []).map((r) => [r.id, r])), [recipes])
  const weeks = pastWeeksWithDishes(byDate, targetMonday).slice(0, 12)

  const copy = async (from: string) => {
    const targetHasDishes = weekDates(targetMonday).some((d) => hasDish(byDate.get(d)))
    if (targetHasDishes) {
      const ok = await confirm({
        title: '¿Reemplazar esta semana?',
        message: 'Los platos que ya hay se cambiarán por los de la semana elegida.',
        confirmLabel: 'Sí, reemplazar',
      })
      if (!ok) return
    }
    const undo = planCopyWeek(scope, targetMonday, targetMonday, byDate)
    await engine.mutate(planCopyWeek(scope, from, targetMonday, byDate))
    onClose()
    showUndo('Menú copiado', () => engine.mutate(undo))
  }

  return (
    <Sheet title="Copiar de otra semana" onClose={onClose}>
      {weeks.length === 0 ? (
        <p className="py-6 text-center text-lg text-gris">Todavía no hay semanas anteriores con platos.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {weeks.map((w) => {
            const preview = weekDates(w.monday)
              .map((d) => dishLabel(byDate.get(d), recipeMap))
              .filter(Boolean)
              .slice(0, 3)
            return (
              <li key={w.monday}>
                <button
                  onClick={() => void copy(w.monday)}
                  className="flex w-full flex-col gap-1 rounded-2xl border-2 border-borde bg-white p-4 text-left active:bg-terra-claro"
                >
                  <span className="text-lg font-bold">Semana del {formatWeekRange(w.monday)}</span>
                  <span className="text-base text-gris">
                    {preview.join(' · ')}
                    {w.count > preview.length ? '…' : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
