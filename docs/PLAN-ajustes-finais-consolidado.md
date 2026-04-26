# PLAN-ajustes-finais-consolidado.md

Este plano mestre consolida todas as solicitações de estabilização, performance (cache) e refinamento de UX/UI.

## 🎯 Objetivos Principais
1. **Estabilização**: Corrigir edição em massa e erros de cálculo em Alunos.
2. **Performance**: Implementar cache LocalStorage para reduzir chamadas ao Firebase (evitar erro de cota).
3. **UX/UI**: Expandir layout para 100%, ajustar sidebar e remover colunas redundantes.
4. **Inteligência**: Adicionar Dashboard de Ticket Médio em Relatórios.

## 📋 Detalhamento das Tarefas

### 1. Infraestrutura & Performance (Cota Firebase)
- [ ] **Implementar Cache Layer**: No `finance.ts`, adicionar lógica de cache local para `getStudents`, `getClasses` e `getServices`.
    *   Validade do cache: 5 minutos ou até que uma ação de escrita (Save/Delete) ocorra.
    *   Objetivo: Reduzir leituras no Firebase em até 80%.

### 2. Estabilização de Alunos (Students.tsx)
- [ ] **Edição em Massa**: 
    *   Garantir fechamento imediato do modal.
    *   Adicionar tratamento de erro robusto.
- [ ] **Formato de Idade**: 
    *   Implementar `formatAge`: "X anos e Y meses" (tratando singular/plural e ocultando zeros).

### 3. Refinamento de Layout & Design (Global)
- [ ] **Sidebar (App.tsx)**:
    *   Largura: Expandir de `w-64` para `w-72`.
    *   Tipografia: Reduzir `tracking` e remover `truncate` nos menus.
- [ ] **Main Content**:
    *   Padding: Reduzir de `p-6` para `p-4` (ganho de ~10px de espaço).
    *   Largura: Remover `max-w-7xl`, permitindo `100%` da tela.
- [ ] **Limpeza de Colunas**:
    *   Remover coluna **Serviço** das páginas: *Fechamento Mensal*, *Financeiro* e do card de *Relatórios*.

### 4. Inteligência & Relatórios (Reports.tsx)
- [ ] **Ticket Médio Dashboard**:
    *   Implementar cálculo: `Total Recebido / Número de Boletos Pagos`.
    *   Exibir card destacado com este insight.
    *   Adicionar gráfico simples de tendência (opcional conforme espaço).

## 🏁 Critérios de Aceite
- [ ] Sistema não crasha por cota durante navegação repetitiva.
- [ ] Menus da sidebar totalmente legíveis.
- [ ] Edição em massa funciona com confirmação visual clara.
- [ ] Layout fluido e ocupando todo o espaço do monitor.
