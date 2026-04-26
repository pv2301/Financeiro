# Plano de Implementação - Refinamento de Layout e Lógica Financeira

Este plano detalha as alterações para modernizar o fluxo de fechamento, ajustar espaçamentos globais e melhorar a transparência dos cálculos para o usuário final.

## 🛠️ Fase 1: Ajustes Globais e Layout

### 1.1 Espaçamento das Páginas
- **Arquivo:** `src/pages/*.tsx` (Dashboard, Students, Invoices, MonthlyProcessing, Classes, Snacks, Config)
- **Ação:** Alterar o padding do container principal de `p-4` (16px) para `p-6` (24px).
- **Contexto:** Aplicar em ambos os estados do menu (aberto/fechado).

### 1.2 Tooltips de Explicação (Help Icons)
- **Componente:** Criar ou utilizar um componente de Tooltip/Popover (usando `framer-motion` para suavidade).
- **Locais de Aplicação:**
  - **Líquido Final:** Explicar `(Bruto - Descontos + Taxas)`.
  - **Desc. Faltas:** Explicar `(Valor Diário * Dias de Falta)`.
  - **Taxa de Emissão:** Explicar que é o custo operacional fixo.
  - **Repasse Colégio:** Explicar a porcentagem de comissão sobre o bruto.
- **Comportamento:** Abrir ao hover e ao clique (fechando ao clicar fora).

## 📊 Fase 2: Fechamento Mensal (MonthlyProcessing.tsx)

### 2.1 Unificação de Passos (Wizard)
- **Ação:** Unificar o **Passo 1 (Mês)** e **Passo 2 (Parâmetros)** em uma única visão.
- **Layout:** Disposição lado a lado com adaptação automática para telas menores.
- **Divisor:** Adicionar uma linha vertical sutil ou separação por cards.

### 2.2 Tabela de Consumo
- **Ação:** Adicionar a coluna **"Desc. Pessoal (%)"** imediatamente antes da coluna "Boleto".
- **Lógica:** Valor somente leitura vindo do cadastro do aluno (`student.personalDiscount`).

### 2.3 Cópia de ID do Aluno
- **Ação:** Adicionar ícone de cópia ao lado do nome do aluno na listagem de prévia.

## 🧾 Fase 3: Financeiro e Configurações

### 3.1 Cópia de ID no Financeiro (Invoices.tsx)
- **Ação:** Adicionar ícone de cópia ao lado do nome do aluno na tabela de faturas.

### 3.2 Ano Letivo e Férias (Config.tsx)
- **Ação:** Permitir que o input de dias aceite o texto "Férias".
- **Lógica de Cálculo:** No motor de faturamento, se o mês estiver marcado como "Férias", tratar `workingDays = 0`.
- **UI:** Adicionar seletor ou permitir digitação flexível.

## ✅ Checklist de Verificação
- [ ] Margem de 24px verificada em todas as resoluções.
- [ ] Wizard de fechamento exibe mês e parâmetros simultaneamente.
- [ ] Cálculo de faturamento retorna 0 consumo para meses de "Férias".
- [ ] Tooltips funcionam em dispositivos touch (clique).
- [ ] Cópia de ID funciona corretamente (Feedback visual de "Copiado").

---
**Responsáveis:**
- `frontend-specialist`: UI/UX e Tooltips.
- `backend-specialist`: Lógica de faturamento e integração de dados.
- `test-engineer`: Validação de cálculos e responsividade.
