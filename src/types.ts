export type Category = string;

/** Supported purchase units for shopping list items */
export type UnitType = 'kg' | 'g' | 'un' | 'L' | 'ml' | 'cx' | 'pct' | 'porcao';

export interface Restriction {
  id: string;
  nome: string;
}

export interface Item {
  id: string;
  nome: string;
  categoria: Category;       // primary category (backward compat)
  categorias?: Category[];   // all categories (when item belongs to multiple)
  contemOvo: boolean;
  contemLactose: boolean;
  contemGluten: boolean;
  receitaVinculadaId?: string;
  corFundo?: string;
  negrito?: boolean;
  /** Purchase unit override (defaults derived from categoria in shoppingCalculator) */
  unitType?: UnitType;
  /** Quantity per child per meal (e.g. 0.15 for 150g). Defaults from categoria. */
  portionSize?: number;
}

export interface Recipe {
  id: string;
  nome: string;
  ingredientes: string;
  modoPreparo: string;
  porcoes: number;
  itemVinculadoId?: string;
  fotoUrl?: string;
}

export interface Substitution {
  id: string;
  itemOriginalId: string;
  restricao: string;
  itemSubstitutoId: string;
  grupoDestino: string;
  observacao?: string;
}

export interface MenuDay {
  id: string;
  data: string; // ISO string
  diaSemana: string;
  isFeriado?: boolean;
  [key: string]: string | boolean | undefined;
}

export interface MenuColumn {
  categoria: string;
  subcategoria?: string; // display name override; items still sourced from `categoria`
}

export type CategorySubcategories = Record<string, string[]>;
// ex: { "Lanche": ["Lanche Manhã", "Lanche Tarde"] }

export interface GroupConfig {
  id: string;
  nomeCurto: string;
  nomeCompleto: string;
  colunas: MenuColumn[];
  cor: string;
  restricao?: string;
}

export interface MenuSnapshot {
  id: string;
  label: string;      // ex: "Abril 2026"
  monthYear: string;  // ex: "2026-04"
  menuDays: MenuDay[];
  createdAt: string;  // ISO
}

/** Number of children registered for a group — configured in Groups page */
export interface GroupCapacity {
  groupId: string;
  childrenCount: number;
}

/** A calculated line-item in the smart shopping list */
export interface ShoppingItem {
  itemId: string;
  nome: string;
  categoria: string;
  /** Market grouping, e.g. "Hortifrúti", "Laticínios" */
  marketCategory: string;
  /** Total quantity across all groups for the selected period */
  quantidadeTotal: number;
  /** Unit of measure used for this item */
  unitType: UnitType;
  /** Quantity per child per meal-day for this item */
  portionSize: number;
  /** Per-group detail breakdown */
  grupos: { nomeGrupo: string; quantidade: number }[];
}

/** Analytics computed from a set of MenuDays */
export interface MenuAnalytics {
  monthYear: string;
  totalDias: number;
  /** Category → occurrence count */
  categoriaDistribuicao: Record<string, number>;
  topItens: { nome: string; aparicoes: number }[];
  alertas: string[];
}
