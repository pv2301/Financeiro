import { Item, Recipe, MenuDay, GroupConfig, GroupCapacity, ShoppingItem, MenuAnalytics, UnitType } from '../types';

// ---------------------------------------------------------------------------
// Default unit of measure per food category
// ---------------------------------------------------------------------------
const DEFAULT_UNIT: Record<string, UnitType> = {
  'Fruta':   'kg',
  'Verdura': 'kg',
  'Legume':  'kg',
  'Carne':   'kg',
  'Peixe':   'kg',
  'Ovo':     'un',
  'Leite':   'L',
  'Queijo':  'kg',
  'Iogurte': 'un',
  'Cereal':  'kg',
  'Arroz':   'kg',
  'Feijão':  'kg',
  'Macarrão':'kg',
  'Pão':     'un',
  'Suco':    'L',
};

// ---------------------------------------------------------------------------
// Default portion per child per meal-day (in the unit above)
// ---------------------------------------------------------------------------
const DEFAULT_PORTION: Record<string, number> = {
  'Fruta':   0.15,  // 150 g
  'Verdura': 0.08,  // 80 g
  'Legume':  0.10,  // 100 g
  'Carne':   0.12,  // 120 g
  'Peixe':   0.12,
  'Ovo':     1,     // 1 unit
  'Leite':   0.2,   // 200 ml = 0.2 L
  'Queijo':  0.03,  // 30 g
  'Iogurte': 1,
  'Cereal':  0.08,
  'Arroz':   0.08,
  'Feijão':  0.06,
  'Macarrão':0.08,
  'Pão':     2,     // 2 slices/units
  'Suco':    0.15,  // 150 ml
};

// ---------------------------------------------------------------------------
// Market category grouping for display in accordions
// ---------------------------------------------------------------------------
export const MARKET_CATEGORY_MAP: Record<string, string> = {
  'Fruta':    'Hortifrúti',
  'Verdura':  'Hortifrúti',
  'Legume':   'Hortifrúti',
  'Carne':    'Carnes e Proteínas',
  'Peixe':    'Carnes e Proteínas',
  'Ovo':      'Carnes e Proteínas',
  'Leite':    'Laticínios',
  'Queijo':   'Laticínios',
  'Iogurte':  'Laticínios',
  'Cereal':   'Grãos e Cereais',
  'Arroz':    'Grãos e Cereais',
  'Feijão':   'Grãos e Cereais',
  'Macarrão': 'Grãos e Cereais',
  'Pão':      'Padaria',
  'Suco':     'Bebidas',
};

/** Market category display order */
export const MARKET_CATEGORY_ORDER = [
  'Hortifrúti',
  'Carnes e Proteínas',
  'Laticínios',
  'Grãos e Cereais',
  'Padaria',
  'Bebidas',
  'Outros',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getDefaultUnit(categoria: string): UnitType {
  return DEFAULT_UNIT[categoria] ?? 'un';
}

export function getDefaultPortion(categoria: string): number {
  return DEFAULT_PORTION[categoria] ?? 1;
}

export function getMarketCategory(categoria: string): string {
  return MARKET_CATEGORY_MAP[categoria] ?? 'Outros';
}

/**
 * Formats a numeric quantity with its unit for display.
 * kg/L values are rounded to 2 decimal places; unit values use Math.ceil.
 */
export function formatQuantity(value: number, unit: UnitType): string {
  const isCount = unit === 'un' || unit === 'cx' || unit === 'pct' || unit === 'porcao';
  if (isCount) {
    return `${Math.ceil(value)} ${unit}`;
  }
  // Weights and volumes: round to 2 decimals, trim trailing zeros
  const rounded = Math.round(value * 100) / 100;
  return `${rounded.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${unit}`;
}

// ---------------------------------------------------------------------------
// Key fields in a MenuDay that reference item/recipe IDs
// ---------------------------------------------------------------------------
const MENU_DAY_ITEM_FIELDS = [
  'frutaId',
  'lancheManhaId',
  'sucoManhaId',
  'entradaId',
  'pratoPrincipalId',
  'acompanhamentoId',
  'lancheTardeId',
  'sucoTardeId',
  'ceiaId',
] as const;

// ---------------------------------------------------------------------------
// Main calculation function
// ---------------------------------------------------------------------------

interface CalculateParams {
  /** Menu days filtered to the selected period */
  menuDays: MenuDay[];
  items: Item[];
  recipes: Recipe[];
  groups: GroupConfig[];
  capacities: GroupCapacity[];
  /** Per-item overrides edited inline on ShoppingList: { [itemId]: { unitType, portionSize } } */
  portionOverrides: Record<string, { unitType: UnitType; portionSize: number }>;
}

/**
 * Calculates the smart shopping list for a given set of menu days.
 * Returns one ShoppingItem per unique food item, summed across all groups.
 */
export function calculateShoppingList({
  menuDays,
  items,
  groups,
  capacities,
  portionOverrides,
}: CalculateParams): ShoppingItem[] {
  // Build lookup maps for O(1) access
  const itemMap = new Map(items.map(i => [i.id, i]));
  const capacityMap = new Map(capacities.map(c => [c.groupId, c.childrenCount]));

  // Accumulator: itemId → ShoppingItem (mutable during build)
  const acc = new Map<string, ShoppingItem & { _groupMap: Map<string, number> }>();

  for (const day of menuDays) {
    for (const group of groups) {
      const children = capacityMap.get(group.id) ?? 0;
      if (children === 0) continue;

      // Find which columns belong to this group
      const groupCols = group.colunas.map(c => c.categoria);

      for (const field of MENU_DAY_ITEM_FIELDS) {
        const itemId = day[field] as string | undefined;
        if (!itemId) continue;

        const item = itemMap.get(itemId);
        if (!item) continue;

        // Check if this item's category belongs to this group's columns
        const itemCategory = item.categoria;
        const belongsToGroup = groupCols.some(col =>
          col === itemCategory || item.categorias?.includes(col)
        );
        if (!belongsToGroup) continue;

        // Determine unit and portion (override → item field → category default)
        const override = portionOverrides[itemId];
        const unitType: UnitType = override?.unitType ?? item.unitType ?? getDefaultUnit(itemCategory);
        const portionSize = override?.portionSize ?? item.portionSize ?? getDefaultPortion(itemCategory);

        const contribution = children * portionSize;

        if (!acc.has(itemId)) {
          acc.set(itemId, {
            itemId,
            nome: item.nome,
            categoria: itemCategory,
            marketCategory: getMarketCategory(itemCategory),
            quantidadeTotal: 0,
            unitType,
            portionSize,
            grupos: [],
            _groupMap: new Map(),
          });
        }

        const entry = acc.get(itemId)!;
        entry.quantidadeTotal += contribution;

        // Accumulate per-group contribution
        const prev = entry._groupMap.get(group.id) ?? 0;
        entry._groupMap.set(group.id, prev + contribution);
      }
    }
  }

  // Convert accumulator to final ShoppingItem[], building grupos array
  const groupNameMap = new Map(groups.map(g => [g.id, g.nomeCurto || g.nomeCompleto]));

  const result: ShoppingItem[] = [];
  for (const [, entry] of acc) {
    const { _groupMap, ...rest } = entry;
    rest.grupos = Array.from(_groupMap.entries()).map(([gId, qty]) => ({
      nomeGrupo: groupNameMap.get(gId) ?? gId,
      quantidade: qty,
    }));
    result.push(rest);
  }

  // Sort by marketCategory order, then alphabetically
  result.sort((a, b) => {
    const orderA = MARKET_CATEGORY_ORDER.indexOf(a.marketCategory);
    const orderB = MARKET_CATEGORY_ORDER.indexOf(b.marketCategory);
    const catDiff = (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
    if (catDiff !== 0) return catDiff;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });

  return result;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

/**
 * Computes nutritional analytics for a given set of menu days.
 */
export function computeMenuAnalytics(
  menuDays: MenuDay[],
  items: Item[],
  monthYear: string
): MenuAnalytics {
  const itemMap = new Map(items.map(i => [i.id, i]));
  const categoriaCount: Record<string, number> = {};
  const itemCount: Record<string, number> = {};

  for (const day of menuDays) {
    for (const field of MENU_DAY_ITEM_FIELDS) {
      const itemId = day[field] as string | undefined;
      if (!itemId) continue;
      const item = itemMap.get(itemId);
      if (!item) continue;

      const cat = item.categoria;
      categoriaCount[cat] = (categoriaCount[cat] ?? 0) + 1;
      itemCount[item.nome] = (itemCount[item.nome] ?? 0) + 1;
    }
  }

  // Top 5 items by appearance
  const topItens = Object.entries(itemCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome, aparicoes]) => ({ nome, aparicoes }));

  // Simple alert heuristics
  const alertas: string[] = [];
  const total = Object.values(categoriaCount).reduce((s, v) => s + v, 0);
  if (total > 0) {
    const grainCats = ['Cereal', 'Arroz', 'Feijão', 'Macarrão'];
    const grainCount = grainCats.reduce((s, c) => s + (categoriaCount[c] ?? 0), 0);
    if (grainCount / total > 0.4) alertas.push('Alta frequência de carboidratos no período');

    const vegCats = ['Verdura', 'Legume'];
    const vegCount = vegCats.reduce((s, c) => s + (categoriaCount[c] ?? 0), 0);
    if (vegCount / total < 0.15) alertas.push('Baixa presença de vegetais no cardápio');

    const fruitCount = categoriaCount['Fruta'] ?? 0;
    if (fruitCount / total < 0.1) alertas.push('Poucas frutas no período');
  }

  return {
    monthYear,
    totalDias: menuDays.length,
    categoriaDistribuicao: categoriaCount,
    topItens,
    alertas,
  };
}
