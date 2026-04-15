# 🗺️ PLAN: shopping-dashboard.md

> **Projeto:** Cardápio Baby  
> **Tipo:** WEB (React + TypeScript + Firebase + TailwindCSS v4)  
> **Agent Principal:** `frontend-specialist`  
> **Skills:** `frontend-design`, `react-best-practices`, `clean-code`  
> **Data:** 2026-04-14  
> **Status:** 🟡 PLANEJAMENTO

---

## 📋 Overview

Implementação de duas features de alto valor para o **Cardápio Baby**:

1. **🛒 Lista de Compras Inteligente** — calcular quantidades automaticamente com base no número de crianças por grupo, agrupar itens por categoria de mercado e permitir compartilhamento
2. **📊 Dashboard Nutricional** — transformar dados já existentes em relatórios visuais, gráficos de variedade alimentar, histórico mensal e exportação PDF

**Por que agora:**
- ListaDeCompras já existe mas é estática — este plano a torna dinâmica e útil
- Snapshots de menu já são salvos — o Dashboard apenas os visualiza, sem novo modelo de dados
- Nenhuma das duas features altera a arquitetura existente (Firebase Firestore + storage.ts)

---

## ✅ Success Criteria

| Critério | Verificação |
|---|---|
| Lista calcula quantidades por grupo | Número de crianças × porção da receita |
| Lista agrupa por categoria de mercado | Hortifrúti / Laticínios / Carnes / Grãos / Outros |
| Lista pode ser compartilhada | Botão de copiar/WhatsApp com texto formatado |
| Dashboard mostra gráfico de distribuição | Gráfico de pizza/barras por categoria de alimento |
| Dashboard mostra histórico de meses | Comparativo entre snapshots salvos |
| Dashboard exporta relatório PDF | PDF do cardápio mensal com identidade visual |
| Nenhuma regressão nas features existentes | Build sem erros, navegação intacta |

---

## 🛠️ Tech Stack

| Tecnologia | Uso | Justificativa |
|---|---|---|
| React 19 + TypeScript | Base existente | Manter consistência |
| TailwindCSS v4 | Estilização | Já instalado |
| Recharts | Gráficos | Leve, declarativo, bom com React |
| jsPDF + html2canvas | Exportação PDF | Melhor suporte a layout HTML→PDF |
| firebase/firestore | Persistência | Já configurado |
| `storage.ts` | Caminho de acesso a dados | Já abstrai Firestore |

> **Nota:** Recharts e jsPDF são as únicas novas dependências. Verificar se jspdf já está no projeto antes de instalar.

---

## 📁 Estrutura de Arquivos Afetados/Criados

```
src/
├── pages/
│   ├── ShoppingList.tsx         ← MODIFICAR (lógica inteligente)
│   ├── Dashboard.tsx            ← CRIAR (extrair de App.tsx + expandir)
│   └── Reports.tsx              ← CRIAR (relatórios e PDF)
├── components/
│   ├── charts/
│   │   ├── CategoryPieChart.tsx ← CRIAR
│   │   └── MonthlyBarChart.tsx  ← CRIAR
│   ├── ShoppingGroup.tsx        ← CRIAR (grupo de compras por categoria de mercado)
│   └── ReportPreview.tsx        ← CRIAR (visualização antes de imprimir)
├── services/
│   ├── storage.ts               ← MODIFICAR (adicionar getGroupCapacity)
│   └── shoppingCalculator.ts   ← CRIAR (lógica de cálculo de quantidades)
├── types.ts                     ← MODIFICAR (adicionar GroupCapacity, ShoppingItem)
App.tsx                          ← MODIFICAR (adicionar rota /reports, extrair Dashboard)
```

---

## 🔗 Dependency Graph

```
T1 (tipos) → T2 (storage) → T3 (calculator) → T4 (ShoppingList)
                                              → T5 (charts)     → T6 (Dashboard)
                                              → T7 (ReportPreview) → T8 (Reports)
T9 (instalar deps) → T4, T5, T7, T8
T10 (App.tsx + rotas) → T6, T8 (fase final)
T11 (verificação) → todos
```

---

## 📋 Task Breakdown

### 🔧 FASE 0 — Preparação

---

#### T0.1 — Instalar Dependências
- **Agent:** `frontend-specialist`
- **Skill:** `react-best-practices`
- **Priority:** P0 (blocker)
- **Dependencies:** nenhuma

**INPUT:** `package.json` atual  
**OUTPUT:** Recharts e jsPDF/html2canvas instalados  
**VERIFY:** `npm install` sem erros; imports funcionam em arquivo de teste

```bash
npm install recharts jspdf html2canvas
```

> Verificar se `@types/recharts` é necessário (Recharts tem tipos built-in desde v2).

---

#### T0.2 — Atualizar Tipos (`types.ts`)
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`
- **Priority:** P0 (blocker de todos os outros)
- **Dependencies:** nenhuma

**INPUT:** `src/types.ts` atual  
**OUTPUT:** Novos tipos adicionados sem quebrar os existentes

Adicionar:
```typescript
// Capacidade de crianças por grupo
export interface GroupCapacity {
  groupId: string;
  childrenCount: number;
}
```

Atualizar também o tipo `Item` para incluir campos opcionais de unidade e porção:
```typescript
// Adicionar ao interface Item existente:
export interface Item {
  // ... campos existentes ...
  unitType?: UnitType;         // unidade de medida (kg, un, L...) — padrão por categoria
  portionSize?: number;        // qtd por criança por refeição (ex: 0.15 para 150g)
}

// Unidade de medida do item de compra
export type UnitType = 'kg' | 'g' | 'un' | 'L' | 'ml' | 'cx' | 'pct' | 'porcao';

// Item calculado da lista de compras
export interface ShoppingItem {
  itemId: string;
  nome: string;
  categoria: string;           // categoria do alimento (fruta, verdura, etc.)
  marketCategory: string;      // categoria de mercado (Hortifrúti, Laticínios, etc.)
  quantidadeTotal: number;     // soma de todos os grupos
  unitType: UnitType;          // unidade de medida do item (kg, un, L...)
  quantidadePorPorcao?: number; // ex: 0.15 (150g por criança)
  grupos: { nomeGrupo: string; quantidade: number; unit: UnitType }[];
}

// Dados de analytics do menu mensal
export interface MenuAnalytics {
  monthYear: string;
  totalDias: number;
  categoriaDistribuicao: Record<string, number>; // categoria → contagem
  topItens: { nome: string; aparicoes: number }[];
  alertas: string[];
}
```

**VERIFY:** `npm run lint` retorna 0 erros de tipo

---

### 🛒 FASE 1 — Lista de Compras Inteligente

---

#### T1.1 — Atualizar `storage.ts` para salvar capacidades de grupos
- **Agent:** `backend-specialist`
- **Skill:** `clean-code`
- **Priority:** P1
- **Dependencies:** T0.2

**INPUT:** `src/services/storage.ts`  
**OUTPUT:** Métodos `getGroupCapacities()` e `saveGroupCapacities()` adicionados ao objeto `storage`

Estratégia de storage: salvar no Firestore (userId → `groupCapacities/{groupId}`) espelhando o padrão já usado no arquivo.

> 🔑 **Decisão de UX confirmada:** A capacidade de crianças é editada na página **Grupos** (`/groups`), não na Lista de Compras. A Lista de Compras apenas **lê** esses valores para calcular.

**VERIFY:** Método existe e retorna `GroupCapacity[]`

---

#### T1.1b — Adicionar campo "Nº de Crianças" em `Groups.tsx`
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `clean-code`
- **Priority:** P1
- **Dependencies:** T1.1

**INPUT:** `src/pages/Groups.tsx` (60KB — tela de gestão de grupos já existente)  
**OUTPUT:** Campo numérico "Nº de Crianças" adicionado ao formulário/card de cada grupo

**UX:**
- Campo inline no card do grupo: `[Grupo Maternal A] — 🧒 Nº de Crianças: [10]`
- Salvo automaticamente ao perder o foco (on blur) via `storage.saveGroupCapacities()`
- Exibido sob o nome do grupo com badge discreto: `10 crianças`
- Se não preenchido: badge amarelo `⚠️ Capacidade não definida`

**VERIFY:** Alterar o número salva no Firestore; Lista de Compras reflete o novo valor ao recalcular

---

#### T1.2 — Criar `shoppingCalculator.ts`
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`
- **Priority:** P1
- **Dependencies:** T0.2

**INPUT:** `MenuDay[]`, `Recipe[]`, `Item[]`, `GroupConfig[]`, `GroupCapacity[]`  
**OUTPUT:** `ShoppingItem[]` calculados e agrupados por categoria de mercado

**Lógica central:**
1. Para cada dia do menu selecionado, identificar quais itens/receitas estão em cada grupo
2. Multiplicar por `childrenCount` do grupo (capacidade cadastrada)
3. Converter usando `quantidadePorPorcao` do item (ex: 0.15 kg por criança)
4. Somar por item igual entre grupos diferentes — **respeitando a unidade** (não somar kg com unidades)
5. Mapear `categoria` do item → `marketCategory` (ex: "Fruta" → "Hortifrúti")

**Unidades suportadas e exibição:**
```typescript
// Unidade padrão por categoria (fallback quando o item não tem unidade definida)
const DEFAULT_UNIT_BY_CATEGORY: Record<string, UnitType> = {
  'Fruta':   'kg',   // bananas, maçãs → sempre em peso
  'Verdura': 'kg',   // alface, cenoura → peso
  'Legume':  'kg',   // batata, abobrinha → peso
  'Carne':   'kg',   // frango, carne moída → peso
  'Peixe':   'kg',   // peixe → peso
  'Ovo':     'un',   // ovos → unidade
  'Leite':   'L',    // leite → litro
  'Queijo':  'kg',   // queijo → peso
  'Iogurte': 'un',   // copinhos → unidade
  'Cereal':  'kg',   // arroz, feijão → peso
  'Pão':     'un',   // pão francês, fatias → unidade
  'Suco':    'L',    // suco → litro
  'default': 'un'    // fallback genérico
};

// Quantidade padrão por porção infantil (por criança, por refeição)
const DEFAULT_PORTION_BY_CATEGORY: Record<string, number> = {
  'Fruta':   0.15,  // 150g de fruta por criança
  'Verdura': 0.08,  // 80g de verdura por criança
  'Legume':  0.10,  // 100g
  'Carne':   0.12,  // 120g
  'Peixe':   0.12,  // 120g
  'Ovo':     1,     // 1 ovo por criança
  'Leite':   0.2,   // 200ml = 0.2L
  'Queijo':  0.03,  // 30g
  'Iogurte': 1,     // 1 copinho por criança
  'Cereal':  0.08,  // 80g de arroz
  'Pão':     2,     // 2 fatias/unidades
  'default': 1
};
```

> ⚠️ **Regra de negócio:** O nutricionista pode **sobrescrever** a unidade e porção padrão de cada item individualmente (armazenado no `Item` via campo `unitType` e `portionSize`). Os valores acima são apenas defaults.

**Mapeamento de categorias de mercado:**
```typescript
const MARKET_CATEGORY_MAP: Record<string, string> = {
  'Fruta': 'Hortifrúti',
  'Verdura': 'Hortifrúti',
  'Legume': 'Hortifrúti',
  'Carne': 'Carnes e Proteínas',
  'Peixe': 'Carnes e Proteínas',
  'Ovo': 'Carnes e Proteínas',
  'Leite': 'Laticínios',
  'Queijo': 'Laticínios',
  'Iogurte': 'Laticínios',
  'Cereal': 'Grãos e Cereais',
  'Pão': 'Padaria',
  'Suco': 'Bebidas',
  // ... outros
  'default': 'Outros'
};
```

**VERIFY:** Função pura testável; dado um menu de 5 dias com 2 grupos de 10 crianças cada, retorna lista correta com quantidades corretas

---

#### T1.3 — Refatorar `ShoppingList.tsx`
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `react-best-practices`
- **Priority:** P1
- **Dependencies:** T1.1b, T1.2

**INPUT:** `src/pages/ShoppingList.tsx` atual (versão estática)  
**OUTPUT:** Componente completamente refatorado com:

1. **Seletor de período:** picker de mês/semana a calcular
2. **Lista calculada:** agrupada por categorias de mercado com totais
3. **Configuração de porção/unidade por item:** editável inline na própria lista
4. **Checkboxes de compra:** marcar itens já comprados (localStorage)
5. **Botão Compartilhar:** copia texto formatado para clipboard → abre WhatsApp com mensagem pré-formatada
6. **Botão Imprimir:** mantém o comportamento existente de `?print=1`

> 🔑 **Decisão de UX confirmada:**
> - **Grupos → Configurações:** Nº de crianças por grupo (editado em `Groups.tsx`)
> - **Lista de Compras:** Porção, unidade e peso por alimento (editado aqui inline)

**UX da Lista de Compras:**
- Accordion por categoria de mercado (Hortifrúti aberto por padrão)
- Badge com total de itens por categoria
- Contador de progresso: "12 de 28 comprados"
- Por item:
  ```
  ☐ Banana    3,6 kg    [✏️ 0,15 kg/criança ▾]   [un: kg ▾]
  ☐ Ovo      48 un      [✏️ 1 un/criança   ▾]   [un: un ▾]
  ☑ Leite    4,8 L      [✏️ 0,2 L/criança  ▾]   [un: L  ▾]  ✓
  ```
- Campo de porção e unidade são dropdowns/inputs **salvos por item** via `storage` (persistência entre sessões)
- Quantidade recalcula instantaneamente ao editar
- Itens em kg: soma contínua, exibe `1,5 kg`
- Itens em unidades: `Math.ceil`, exibe `24 un`

**VERIFY:** Editar porção de um item recalcula total; trocar unidade de kg para un atualiza exibição; valores persistem ao recarregar página

---

### 📊 FASE 2 — Dashboard Nutricional

---

#### T2.1 — Criar componente `CategoryPieChart.tsx`
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `react-best-practices`
- **Priority:** P2
- **Dependencies:** T0.1, T0.2

**INPUT:** `categoriaDistribuicao: Record<string, number>`  
**OUTPUT:** Gráfico de pizza (Recharts `PieChart`) com:
- Cores únicas por categoria (sem violeta/roxo — Purple Ban ativo)
- Legenda lateral
- Tooltip com nome e porcentagem
- Estado vazio elegante quando sem dados

**VERIFY:** Renderiza sem erros; exibe corretamente com dados mock

---

#### T2.2 — Criar componente `MonthlyBarChart.tsx`
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Priority:** P2
- **Dependencies:** T0.1, T0.2

**INPUT:** `MenuSnapshot[]` (histórico já salvo no Firestore)  
**OUTPUT:** Gráfico de barras horizontais (Recharts `BarChart`) comparando:
- Número de dias planejados por mês
- Variedade de categorias por mês

**VERIFY:** Renderiza com 3+ snapshots sem erros

---

#### T2.3 — Criar função `computeMenuAnalytics` em `shoppingCalculator.ts`
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`
- **Priority:** P2
- **Dependencies:** T1.2, T0.2

**INPUT:** `MenuDay[]`, `Item[]`, `Recipe[]`  
**OUTPUT:** `MenuAnalytics`

**Lógica:**
1. Percorrer todos os dias e todas as colunas (`pratoPrincipalId`, `frutaId`, etc.)
2. Contar aparições de cada categoria
3. Detectar alertas: "muita repetição de carboidratos", "poucos vegetais esta semana"
4. Top 5 itens mais usados

**VERIFY:** Dado um menu de 20 dias, `categoriaDistribuicao` retorna contagens corretas

---

#### T2.4 — Criar `Reports.tsx` (página de Relatórios + PDF)
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `react-best-practices`
- **Priority:** P2
- **Dependencies:** T2.1, T2.2, T2.3

**INPUT:** dados do Firestore via `storage`  
**OUTPUT:** Página completa com:

**Seção 1 — Análise do Mês Atual:**
- Gráfico de pizza: distribuição por categoria (`CategoryPieChart`)
- Cards de métricas: dias planejados, variedade de itens, alimento mais usado
- Lista de alertas nutricionais (gerada por T2.3)
- Top 5 alimentos da semana/mês

**Seção 2 — Histórico:**
- Gráfico de barras: comparativo meses (`MonthlyBarChart`)
- Selector de snapshot para comparar meses

**Seção 3 — Exportação PDF:**
- Botão "Exportar Relatório Mensal PDF"
- Usa `html2canvas` + `jsPDF` para capturar seção do DOM
- PDF inclui: logo, nome do nutricionista, cardápio do mês, data de geração
- Aplica identidade visual do app

**VERIFY:** PDF gerado com layout legível; gráficos visíveis no PDF

---

#### T2.5 — Extrair `Dashboard` para `pages/Dashboard.tsx`
- **Agent:** `frontend-specialist`
- **Skill:** `react-best-practices`, `clean-code`
- **Priority:** P2
- **Dependencies:** T2.3

**INPUT:** bloco `Dashboard` dentro de `App.tsx` (linhas 80-342)  
**OUTPUT:** Componente separado em `src/pages/Dashboard.tsx`

Melhorias ao extrair:
- Adicionar link "Ver Relatórios →" no card de Dias Planejados
- Adicionar preview rápido de `MenuAnalytics` (top 3 alertas) no sidebar do dashboard

**VERIFY:** Dashboard renderiza igual ao anterior; nenhuma funcionalidade existente quebrada

---

### 🔌 FASE 3 — Integração

---

#### T3.1 — Atualizar `App.tsx` com novas rotas
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`
- **Priority:** P3
- **Dependencies:** T2.4, T2.5, T1.3

**INPUT:** `App.tsx` atual  
**OUTPUT:**
- Import dos novos componentes `Dashboard`, `Reports`
- Nova rota `/reports` → `<Reports />`
- Dashboard extraído para import externo
- NavItem "Relatórios" adicionado ao sidebar (ícone: `BarChart3` do lucide)

**VERIFY:** Navegação funciona em todas as rotas sem erro 404

---

### ✅ FASE X — Verificação

---

#### TX.1 — Lint e Type Check
```bash
npm run lint
npx tsc --noEmit
```
**VERIFY:** Zero erros, zero warnings críticos

---

#### TX.2 — UX & Security Audit
```bash
python .agent/skills/frontend-design/scripts/ux_audit.py .
python .agent/skills/vulnerability-scanner/scripts/security_scan.py .
```

---

#### TX.3 — Build de Produção
```bash
npm run build
```
**VERIFY:** Build completa sem erros

---

#### TX.4 — Teste Manual das Features
- [ ] Lista de compras: cadastrar capacidade de 2 grupos, selecionar mês, validar quantidades
- [ ] Lista de compras: botão compartilhar abre WhatsApp com texto correto
- [ ] Dashboard: gráfico de pizza renderiza com dados reais
- [ ] Dashboard: histórico mostra snapshots anteriores
- [ ] PDF: gerado com logo e identidade visual

---

#### TX.5 — Compliance Check
- [ ] Nenhum código roxo/violeta (`#7c3aed`, `purple`, `violet`) nos novos arquivos
- [ ] Nenhum layout genérico/template — design segue identidade do Cardápio Baby

---

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| html2canvas não captura fontes web corretamente | Média | Usar `jsPDF.html()` como fallback; ou gerar PDF via dados brutos |
| Grupos sem capacidade cadastrada | Alta | Mostrar aviso inline e usar valor padrão 0 com estado vazio elegante |
| Recharts bundle size aumentar muito | Baixa | Importar apenas componentes usados (tree-shaking); verificar com `bundle_analyzer.py` |
| Snapshots sem dados suficientes para gráfico histórico | Alta | Estado vazio com CTA "Salve seu primeiro snapshot" |

---

## 📦 Ordem de Implementação Recomendada

```
PARALELO 1:
  T0.1 (instalar deps) + T0.2 (tipos)

DEPOIS:
  T1.1 (storage) — T1.2 (calculator) — T1.3 (ShoppingList)
  T2.1 (PieChart) — T2.2 (BarChart) — T2.3 (analytics)

DEPOIS:
  T2.4 (Reports page) — T2.5 (extrair Dashboard)

FINAL:
  T3.1 (App.tsx rotas)
  TX (verificação completa)
```

**Estimativa total:** ~4-6 horas de implementação focada

---

## 🔖 Notas para Implementação

1. **Purple Ban:** Usar apenas as cores da paleta existente — `brand-blue`, `brand-orange`, `brand-lime`, `brand-dark`
2. **Recharts colors:** Usar `['#1e3a5f', '#f97316', '#a3e635', '#334155', '#fb923c', '#65a30d']`
3. **PDF identity:** Capturar logo do `storage.getLogo()` e incluir no PDF
4. **Capacidade de grupos:** Exibida e editável diretamente na tela de Lista de Compras, não em Configurações
5. **Não criar nova página de Configurações** para capacidades — inline é a UX correta

---

*[  ] PHASE X COMPLETE — preencher após verificação final*
