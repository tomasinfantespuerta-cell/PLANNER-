/**
 * Calorías y macronutrientes APROXIMADOS por ración.
 *
 * Se guardan dentro de las etiquetas de la receta como "nutri:kcal|P|C|G"
 * (p. ej. "nutri:520|42|58|11"), así viajan con la receta, se sincronizan y
 * no hizo falta cambiar la base de datos. Las favoritas, igual: etiqueta
 * "favorita". Nadie lee estas etiquetas a mano: todo pasa por este archivo.
 */

export interface Nutrition {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const NUTRI_PREFIX = 'nutri:'
export const FAVORITE_TAG = 'favorita'
/** Recetas de «Mis recetas» (pestaña Yo): no salen en el recetario familiar. */
export const MINE_TAG = 'mia'

/** kcal a partir de los macros (4/4/9), redondeado a 5. */
export function kcalFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round((protein * 4 + carbs * 4 + fat * 9) / 5) * 5
}

export function nutritionFromTags(tags: string[] | null | undefined): Nutrition | null {
  const t = (tags ?? []).find((x) => x.startsWith(NUTRI_PREFIX))
  if (!t) return null
  const [kcal, protein, carbs, fat] = t.slice(NUTRI_PREFIX.length).split('|').map(Number)
  if ([kcal, protein, carbs, fat].some((n) => !Number.isFinite(n))) return null
  return { kcal, protein, carbs, fat }
}

/** Devuelve las etiquetas con la información nutricional puesta (o quitada, con null). */
export function withNutrition(tags: string[] | null | undefined, n: Nutrition | null): string[] {
  const rest = (tags ?? []).filter((x) => !x.startsWith(NUTRI_PREFIX))
  if (!n) return rest
  return [...rest, `${NUTRI_PREFIX}${Math.round(n.kcal)}|${Math.round(n.protein)}|${Math.round(n.carbs)}|${Math.round(n.fat)}`]
}

export function isFavorite(tags: string[] | null | undefined): boolean {
  return (tags ?? []).includes(FAVORITE_TAG)
}

export function isMine(tags: string[] | null | undefined): boolean {
  return (tags ?? []).includes(MINE_TAG)
}

export function withMine(tags: string[] | null | undefined, on: boolean): string[] {
  const rest = (tags ?? []).filter((x) => x !== MINE_TAG)
  return on ? [...rest, MINE_TAG] : rest
}

export function withFavorite(tags: string[] | null | undefined, on: boolean): string[] {
  const rest = (tags ?? []).filter((x) => x !== FAVORITE_TAG)
  return on ? [...rest, FAVORITE_TAG] : rest
}

/** Etiquetas "de verdad" (tipo de plato), sin las internas. */
export function visibleTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter((x) => !x.startsWith(NUTRI_PREFIX) && x !== FAVORITE_TAG && x !== MINE_TAG)
}

/**
 * Estimación por ración de las recetas escritas en la app: [proteínas, hidratos, grasas] en gramos.
 * Calculadas con las cantidades de cada receta y tablas de composición habituales.
 */
const MACROS: Record<string, [number, number, number]> = {
  // Recetario inicial (familia, 4 raciones)
  'lentejas-con-chorizo': [30, 62, 24],
  'tortilla-de-patatas': [12, 32, 24],
  'cocido-madrileno': [55, 85, 45],
  'garbanzos-con-espinacas': [17, 50, 18],
  'fabada-asturiana': [42, 58, 55],
  'merluza-en-salsa-verde': [40, 4, 19],
  'bacalao-con-tomate': [40, 18, 14],
  'pollo-al-ajillo': [45, 3, 28],
  'albondigas-en-salsa': [29, 19, 33],
  'paella-mixta': [40, 82, 26],
  'macarrones-con-chorizo': [27, 82, 30],
  'pisto-con-huevo': [9, 20, 27],
  'judias-verdes-con-patatas': [12, 30, 16],
  'crema-de-calabacin': [5, 14, 11],
  'lomo-con-pimientos': [45, 9, 26],
  // Recetario saludable
  'pollo-boniato-horno': [48, 45, 17],
  'pollo-arroz-verduras': [41, 68, 9],
  'ensalada-garbanzos-caballa': [32, 43, 34],
  'ensalada-lentejas': [27, 50, 20],
  'merluza-horno-verduras': [29, 24, 15],
  'salmon-horno-esparragos': [33, 32, 33],
  'lasana-berenjena': [30, 20, 18],
  'bowl-pollo-aguacate': [41, 60, 19],
  'tortilla-espinacas-champis': [16, 7, 17],
  'dorada-horno-limon': [38, 33, 21],
  'pavo-wok-verduras': [38, 18, 13],
  'quinoa-pollo-templada': [37, 46, 19],
  // Ideas saludables
  'pollo-curry-basmati': [42, 58, 11],
  'pollo-teriyaki-brocoli': [44, 62, 14],
  'fajitas-pollo': [45, 62, 10],
  'pollo-limon-judias': [37, 11, 9],
  'brochetas-pollo-yogur': [44, 17, 6],
  'pollo-cuscus-verduras': [42, 51, 10],
  'contramuslos-romero': [42, 34, 25],
  'cesar-ligera': [39, 20, 14],
  'wrap-pollo-aguacate': [30, 32, 19],
  'pollo-champis-espinacas': [42, 12, 12],
  'pollo-pimenton-garbanzos': [47, 45, 22],
  'burrito-bowl': [39, 72, 19],
  'albondigas-pollo-tomate': [30, 17, 13],
  'pechuga-rellena-espinacas': [46, 5, 14],
  'pollo-mostaza-miel': [45, 23, 12],
  'pollo-tandoori': [44, 10, 15],
  'hamburguesa-ternera-boniato': [37, 64, 17],
  'chili-pavo': [32, 37, 8],
  'solomillo-manzana': [43, 26, 13],
  'lomo-mostaza-verduras': [42, 15, 22],
  'ternera-brocoli': [39, 50, 13],
  'albondigas-ternera-horno': [30, 19, 14],
  'berenjenas-rellenas-carne': [34, 18, 19],
  'pimientos-rellenos-pavo': [28, 28, 13],
  'pastel-carne-coliflor': [31, 19, 18],
  'salmon-teriyaki': [35, 58, 21],
  'merluza-papillote': [28, 10, 9],
  'bacalao-pisto': [38, 26, 14],
  'lubina-panadera': [37, 36, 20],
  'atun-plancha-ensalada': [37, 10, 22],
  'poke-salmon': [31, 62, 31],
  'tacos-pescado': [36, 42, 7],
  'gambas-zoodles': [28, 9, 15],
  'sardinas-horno': [33, 33, 28],
  'merluza-tomate-pimientos': [38, 19, 10],
  'curry-pescado-coco': [33, 53, 12],
  'hamburguesa-salmon': [34, 14, 24],
  'sepia-plancha-arroz': [37, 45, 15],
  'salmon-costra-hierbas': [34, 19, 27],
  'bacalao-garbanzos-espinacas': [42, 46, 12],
  'ensalada-arroz-atun': [27, 58, 20],
  'hummus-bowl-pollo': [44, 42, 23],
  'garbanzos-curry-espinacas': [20, 86, 16],
  'dal-lentejas-rojas': [17, 48, 6],
  'chili-sin-carne': [17, 55, 6],
  'alubias-verduras': [21, 57, 10],
  'ensalada-alubias-atun': [30, 40, 15],
  'falafel-horno': [19, 52, 13],
  'burger-lentejas': [24, 53, 11],
  'lentejas-arroz-verduras': [18, 64, 10],
  'potaje-garbanzos-verduras': [21, 67, 16],
  'ensalada-garbanzos-pepino-queso': [21, 41, 23],
  'coliflor-curry-garbanzos': [22, 48, 19],
  'carbonara': [27, 66, 40],
  'pasta-pesto-pollo': [36, 56, 22],
  'ensalada-pasta-atun': [34, 62, 26],
  'bolonesa-pavo': [35, 70, 10],
  'pasta-gambas-calabacin': [31, 63, 14],
  'pizza-casera-integral': [45, 75, 21],
  'pizza-tortilla-express': [21, 30, 9],
  'risotto-champis': [14, 66, 11],
  'arroz-tres-delicias': [31, 49, 14],
  'arroz-verduras-gambas': [27, 72, 14],
  'macarrones-atun-tomate': [30, 62, 12],
  'lasana-calabacin-pollo': [33, 13, 12],
  'pasta-gratinada-verduras': [21, 73, 13],
  'pasta-salmon-espinacas': [34, 60, 20],
  'noquis-tomate-espinacas': [18, 74, 19],
  'shakshuka': [18, 37, 17],
  'frittata-verduras': [22, 9, 23],
  'calabacines-rellenos-atun': [25, 14, 14],
  'crema-calabaza': [8, 33, 10],
  'verduras-asadas-queso': [16, 25, 24],
  'quinoa-verduras-asadas': [14, 54, 31],
  'revuelto-setas-gambas': [34, 18, 17],
  'tortilla-patata-horno': [20, 38, 19],
  'huevos-plato-pisto': [18, 38, 17],
  'bowl-arroz-huevo-aguacate': [13, 58, 23],
  'ensalada-pollo-mango': [31, 30, 36],
  'salmorejo-huevo-atun': [17, 30, 23],
  'sopa-asiatica-pollo': [26, 50, 4],
  'musaka-ligera': [29, 18, 21],
  // Ideas familiares
  'arroz-al-horno': [24, 82, 41],
  'marmitako': [39, 40, 15],
  'patatas-riojana': [17, 48, 25],
  'carne-guisada-patatas': [42, 42, 20],
  'sopa-castellana': [18, 28, 21],
  'gazpacho': [3, 21, 20],
  'crema-verduras': [4, 19, 9],
  'arroz-cubana': [12, 95, 19],
  'canelones-carne': [34, 52, 42],
  'lasana-carne': [42, 72, 42],
  'croquetas-jamon': [20, 40, 40],
  'empanada-atun': [28, 70, 37],
  'calamares-tinta': [36, 57, 16],
  'merluza-romana': [39, 14, 18],
  'bacalao-vizcaina': [37, 19, 17],
  'trucha-navarra': [46, 38, 27],
  'conejo-ajillo': [38, 4, 25],
  'costillas-horno': [38, 35, 50],
  'carrillada-vino': [47, 49, 36],
  'filetes-ternera-salsa': [45, 16, 23],
  'flamenquines': [51, 25, 36],
  'huevos-flamenca': [26, 21, 27],
  'sopa-fideos-pollo': [19, 33, 6],
  'alubias-pintas': [35, 58, 43],
  'judias-almejas': [20, 42, 11],
  'potaje-vigilia': [35, 52, 17],
  'menestra': [14, 30, 13],
  'patatas-costillas': [21, 51, 30],
  'arroz-caldoso-pollo': [29, 72, 21],
  'fideua': [39, 76, 24],
  'pollo-asado-patatas': [52, 36, 35],
  'filetes-rusos': [30, 20, 38],
  'escalope-milanesa': [48, 22, 28],
  'pimientos-rellenos-carne': [20, 32, 25],
  'calabacines-gratinados': [22, 15, 29],
  'pollo-pepitoria': [50, 13, 37],
  'lomo-horno-patatas': [57, 36, 25],
  'boquerones-fritos': [41, 18, 25],
  'ensaladilla-rusa': [17, 38, 47],
  'garbanzos-langostinos': [35, 46, 15],
}

/** Información nutricional estimada de una receta escrita en la app (por su slug). */
export function nutritionForSlug(slug: string): Nutrition | null {
  const m = MACROS[slug]
  if (!m) return null
  const [protein, carbs, fat] = m
  return { kcal: kcalFromMacros(protein, carbs, fat), protein, carbs, fat }
}

export function knownNutritionSlugs(): string[] {
  return Object.keys(MACROS)
}
