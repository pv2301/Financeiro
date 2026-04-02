export type Category = string;

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
