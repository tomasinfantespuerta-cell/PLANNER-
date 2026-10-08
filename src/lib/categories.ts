import { normalizeName } from './text'

export interface Category {
  id: string
  label: string
  emoji: string
}

export const CATEGORIES: Category[] = [
  { id: 'fruta_verdura', label: 'Fruta y verdura', emoji: '🥬' },
  { id: 'carne_pescado', label: 'Carne y pescado', emoji: '🐟' },
  { id: 'lacteos_huevos', label: 'Lácteos y huevos', emoji: '🥛' },
  { id: 'panaderia', label: 'Panadería', emoji: '🥖' },
  { id: 'despensa', label: 'Despensa', emoji: '🥫' },
  { id: 'congelados', label: 'Congelados', emoji: '🧊' },
  { id: 'bebidas', label: 'Bebidas', emoji: '🧃' },
  { id: 'limpieza', label: 'Limpieza e higiene', emoji: '🧽' },
  { id: 'otros', label: 'Otros', emoji: '🛒' },
]

export const DEFAULT_CATEGORY = 'otros'

export function categoryById(id: string | null | undefined): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}

const KEYWORDS: Record<string, string[]> = {
  fruta_verdura: [
    'manzana', 'platano', 'naranja', 'mandarina', 'limon', 'pera', 'uva', 'fresa', 'melon', 'sandia',
    'kiwi', 'melocoton', 'piña', 'aguacate', 'tomate', 'lechuga', 'cebolla', 'ajo', 'patata', 'zanahoria',
    'pimiento', 'calabacin', 'berenjena', 'pepino', 'judia verde', 'judias verdes', 'espinaca', 'acelga',
    'puerro', 'calabaza', 'brocoli', 'coliflor', 'repollo', 'champiñon', 'seta', 'perejil', 'fruta', 'verdura',
    'alcachofa', 'apio', 'cebolleta', 'boniato', 'esparrago', 'rucula', 'canonigo', 'lima', 'mango', 'cilantro',
    'albahaca', 'hierbabuena', 'jengibre', 'col', 'lombarda', 'remolacha', 'nabo', 'rabano', 'escarola', 'judia',
  ],
  carne_pescado: [
    'pollo', 'ternera', 'cerdo', 'lomo', 'filete', 'carne', 'picada', 'chuleta', 'costilla', 'conejo',
    'cordero', 'pavo', 'hamburguesa', 'salchicha', 'chorizo', 'morcilla', 'jamon', 'panceta', 'tocino',
    'merluza', 'bacalao', 'salmon', 'atun fresco', 'sardina', 'boqueron', 'dorada', 'lubina', 'gamba',
    'langostino', 'calamar', 'sepia', 'mejillon', 'almeja', 'pescado', 'pechuga', 'muslo', 'contramuslo',
    'solomillo', 'caballa', 'trucha', 'rape', 'emperador', 'bonito', 'guanciale', 'lacon', 'morcillo', 'carrillada',
    'codillo', 'secreto', 'presa', 'pollo entero', 'alitas',
  ],
  lacteos_huevos: ['leche', 'yogur', 'queso', 'mantequilla', 'nata', 'huevo', 'natillas', 'flan', 'kefir', 'mozzarella', 'parmesano', 'pecorino', 'requeson', 'bechamel'],
  panaderia: ['pan', 'barra', 'baguette', 'pan de molde', 'bolleria', 'magdalena', 'galleta', 'tostada', 'picos'],
  despensa: [
    'arroz', 'pasta', 'macarron', 'espagueti', 'fideo', 'lenteja', 'garbanzo', 'alubia', 'judia blanca',
    'aceite', 'vinagre', 'sal', 'azucar', 'harina', 'pimenton', 'comino', 'laurel', 'especia', 'caldo',
    'tomate frito', 'atun', 'conserva', 'cafe', 'cacao', 'cereales', 'colacao', 'mermelada', 'miel',
    'aceituna', 'legumbre', 'pan rallado', 'levadura', 'chocolate', 'quinoa', 'cuscus', 'soja', 'leche de coco',
    'curry', 'pesto', 'maiz', 'tortillas de trigo', 'oregano', 'pimienta', 'canela', 'nuez moscada', 'tahini',
    'semillas', 'sesamo', 'nueces', 'almendra', 'pipas', 'avena', 'garam', 'tandoori', 'cayena', 'tomillo', 'romero',
    'mostaza', 'miel', 'azafran', 'fideos', 'lasana', 'canelones', 'noquis', 'masa de pizza', 'harina', 'maizena',
    'tomate triturado', 'tomate concentrado', 'ketchup', 'mayonesa', 'caldo', 'coco rallado',
  ],
  congelados: ['congelad', 'helado', 'guisantes', 'pizza', 'croqueta', 'varitas'],
  bebidas: ['agua', 'zumo', 'vino', 'cerveza', 'refresco', 'gaseosa', 'coca cola', 'batido'],
  limpieza: [
    'lejia', 'detergente', 'suavizante', 'lavavajillas', 'fregasuelos', 'friegasuelos', 'estropajo',
    'bayeta', 'papel higienico', 'papel de cocina', 'servilleta', 'champu', 'gel', 'jabon', 'pasta de dientes',
    'desodorante', 'bolsas de basura', 'limpiador', 'cepillo', 'compresas', 'pañuelos',
  ],
}

/** Adivina la categoría a partir del nombre ("Leche entera" → lácteos). */
export function guessCategory(name: string): string {
  const n = ` ${normalizeName(name)} `
  let best: { id: string; len: number } | null = null
  for (const [id, words] of Object.entries(KEYWORDS)) {
    for (const w of words) {
      const nw = normalizeName(w)
      // Coincidencia al inicio de palabra; la palabra clave más larga gana ("tomate frito" > "tomate").
      if (n.includes(` ${nw}`) && (!best || nw.length > best.len)) best = { id, len: nw.length }
    }
  }
  return best?.id ?? DEFAULT_CATEGORY
}
