export type Category = string;

export interface Restriction {
  id: string;
  nome: string;
}

export interface Item {
  id: string;
  nome: string;
  categoria: Category;
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
}

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
