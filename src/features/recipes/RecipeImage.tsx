import type { Recipe } from './logic'

const EMOJI: Record<string, string> = { pescado: '🐟', carne: '🍗', legumbres: '🫘', verdura: '🥦', rapida: '⏱️', saludable: '🥗' }

/** Foto de la receta o, si no tiene, un dibujo sencillo según su tipo. */
export function RecipeImage({ recipe, className = '' }: { recipe: Pick<Recipe, 'photo_path' | 'tags' | 'title'>; className?: string }) {
  if (recipe.photo_path) {
    return <img src={recipe.photo_path} alt="" className={`object-cover ${className}`} />
  }
  const tags = (recipe.tags ?? []).filter((t) => t in EMOJI)
  const tag = tags.find((t) => t !== 'rapida' && t !== 'saludable') ?? tags[0]
  return (
    <div aria-hidden className={`flex items-center justify-center bg-terra-claro text-4xl ${className}`}>
      {(tag && EMOJI[tag]) || '🍲'}
    </div>
  )
}
