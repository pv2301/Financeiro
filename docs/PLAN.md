# PLAN — Financeiro Baby: Tarefas Pendentes

> **Status:** AGUARDANDO APROVAÇÃO  
> **Data:** 2026-04-21  
> **Agentes:** `project-planner`, `frontend-specialist`, `backend-specialist`

---

## Diagnóstico do Estado Atual

| Página | Estado | Problemas |
|--------|--------|-----------|
| `Snacks.tsx` | ❌ Vazio | Apenas header, sem CRUD, sem segmentos |
| `Students.tsx` | ⚠️ Parcial | Sem filtros por turma, sem popup de confirmação, sem distinção visual de desconto |
| `Classes.tsx` | ✅ OK | Mas dias letivos devem migrar para Fechamento Mensal |
| `MonthlyProcessing.tsx` | ⚠️ Desatualizado | Usa tipos antigos, não gera campos novos do Invoice |
| `Invoices.tsx` | ⚠️ Parcial | Sem importação bancária |
| `Reports.tsx` | ✅ OK | Dashboard + export Excel funcionando |

### Dias Letivos — Situação Atual
- **Onde estão:** `ClassInfo.scholasticDays` (por turma)
- **Onde devem estar:** Página Fechamento Mensal, Passo 1, como parâmetro global
- **Razão:** Dias letivos são iguais para todas as turmas no mesmo mês

### Tabela de Serviços — Análise da Imagem
3 segmentos com serviços e preços DIFERENTES:

| Segmento | Serviços |
|----------|----------|
| **Berçário** (Baby, Ninho) | INTEGRAL, Lanche, Almoço, Ceia |
| **Ed. Infantil** (Maternal, Grupo 1/2/3) | Lanche Coletivo, Lanche Integral, Almoço, Ceia |
| **Fundamental** (1º a 4º Ano) | Lanche Coletivo, Lanche Integral, Almoço |

---

## 7 Tarefas de Execução

### TASK 1 — Reestruturar Tabela de Serviços
- Substituir tipo `Snack` por `ServiceItem` com `priceBySegment`
- Layout em 3 blocos visuais por segmento
- CRUD com preços editáveis inline + popup de confirmação

### TASK 2 — Refatorar Alunos
- Filtros: por turma, ordem A-Z, com desconto
- Badges visuais: Funcionário (verde) vs Acordo (azul)
- Popup de confirmação em vez de `window.confirm()`

### TASK 3 — Migrar Dias Letivos para Fechamento Mensal
- Remover `scholasticDays` de ClassInfo
- Grid de 12 meses no Passo 1 do MonthlyProcessing
- Banner: "8/12 meses configurados | Total: 196 dias"
- Salvar em `fin_config/global`

### TASK 4 — Corrigir MonthlyProcessing para novos tipos
- Preencher todos campos novos do Invoice
- Implementar cálculo correto para cada modelo de cobrança
- Usar `scholasticDays` do config global

### TASK 5 — Importação Bancária no Invoices
- Botão "Importar Baixa Bancária" + modal
- Chama `processPaymentImport()` já existente
- Exibe resultado com divergências

### TASK 6 — ConfirmDialog reutilizável
- Componente modal para substituir `window.confirm()`
- Usar em todas as páginas

### TASK 7 — Build + Deploy + Verificação

## Ordem: TASK 6,1,2 (paralelo) → TASK 3 → TASK 4 → TASK 5 → TASK 7

---

## Perguntas antes de iniciar:
1. Os dias letivos são iguais para TODAS as turmas no mesmo mês?
2. A taxa de emissão do boleto é valor fixo global ou varia por turma?
3. A coluna "Idades" no Berçário influencia o preço ou é informativa?
4. Os segmentos são exatamente 3 (Berçário, Ed. Infantil, Fundamental)?
