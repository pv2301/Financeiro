# PLAN — Regras de Negócio e Hardening Financeiro v2

Este plano detalha a implementação das novas regras de cobrança, a inclusão da data de nascimento dos alunos para cálculos de faixa etária no Berçário, e a simplificação da gestão de turmas.

---

## 🛑 REGRAS CRÍTICAS
1. **Não alterar a lógica de auditoria** já implementada.
2. **Preservar o design system** (p-8, rounded-3xl, brand-colors).
3. **Cálculo de idade**: Baseado no dia **05 do mês de referência**.

---

## 1. ANALYSIS: Impacto e Dependências

| Componente | Mudança Necessária | Impacto |
|------------|--------------------|---------|
| `types.ts` | Adicionar `birthDate` em `Student`; `basePrice` em `ClassInfo` aceita string. | Médio (Tipagem) |
| `finance.ts` | Atualizar métodos de salvamento e filtros. | Baixo |
| `Classes.tsx` | Ajustar Modal: remover campos, mudar placeholders dinâmicos. | Médio (UI) |
| `Students.tsx` | Adicionar campo de Data de Nascimento no formulário e importação. | Médio (UI/Data) |
| `MonthlyProcessing.tsx` | Refatorar `calculateInvoices` e Tabela do Passo 3. | **ALTO (Lógica)** |

---

## 2. TASK BREAKDOWN

### P0: Tipagem e Estrutura de Dados
- **ID: T1**
- **Ação:** Atualizar `Student` para incluir `birthDate?: string`.
- **Ação:** Atualizar `ClassInfo` para que `basePrice` suporte `string | number`.
- **Verificar:** Compilação sem erros nos serviços.

### P1: Simplificação da Página de Turmas (`Classes.tsx`)
- **ID: T2**
- **Ação:** No modal de edição de turma:
    - Remover campo **% Repasse** (já definido em Config).
    - Remover campo **Desconto/Falta** (será informado no Fechamento).
    - Remover campo **Faixa Etária** (cálculo será automático por idade).
    - Lógica de **Valor Base**:
        - Se `billingMode === 'ANTICIPATED_FIXED'`: Input numérico (R$).
        - Se `billingMode === 'ANTICIPATED_DAYS'`: Exibir texto "Valor serviço x Dias letivos".
        - Se `billingMode === 'POSTPAID_CONSUMPTION'`: Exibir texto "Consumo mensal".
- **Ação:** Migração: Alterar todas as turmas do segmento "Ensino Fundamental I" para `billingMode: 'ANTICIPATED_DAYS'`.

### P2: Gestão de Alunos com Data de Nascimento (`Students.tsx`)
- **ID: T3**
- **Ação:** Adicionar campo "Data de Nascimento" no modal de Aluno.
- **Ação:** Atualizar lógica de importação Excel para mapear a coluna `DATANASCALUNO`.
- **Ação:** Exibir data de nascimento na listagem (coluna discreta).

### P3: Lógica de Cálculo no Berçário (Snacks/Monthly)
- **ID: T4**
- **Ação:** Implementar função `calculateAgeInMonths(birthDate, referenceDate)` considerando o dia 05.
- **Ação:** Mapear categorias do Berçário baseadas em meses:
    - Baby: 6 a 9 meses.
    - Ninho: 10 a 12 meses.
    - Extra: 13 a 24 meses.
- **Ação:** Integrar com a tabela de preços de `Snacks.tsx` (Serviços e Valores).

### P4: Refatoração do Fechamento Mensal (`MonthlyProcessing.tsx`)
- **ID: T5**
- **Lógica de Cálculo (`calculateInvoices`):**
    - `Base Amount`:
        - Fixo: Valor definido na turma.
        - Por Dias: `Preço Unitário (do serviço) * Dias Letivos (Passo 1)`.
    - `Faltas`: Tornar a coluna editável por unidade de dias no Passo 3.
    - `Desc. Faltas`: `Dias de Falta * Preço Unitário`.
    - `Líquido Final`: `Base - Desc. Faltas`. (Desconto Pessoal não subtrai).
- **Ação:** Atualizar UI da tabela para refletir essas colunas e cálculos em tempo real.

### P5: Importação de Consumo Inteligente
- **ID: T6**
- **Ação:** Atualizar importação de consumo:
    - Ignorar turma da planilha.
    - Match por Nome do Aluno.
    - Aplicar preço baseado na idade (Berçário) ou valor unitário do serviço.

---

## 3. PHASE X: VERIFICAÇÃO

- [ ] Criar aluno do Berçário com 7 meses e validar preço "Baby" no fechamento.
- [ ] Criar aluno do Berçário com 11 meses e validar preço "Ninho" no fechamento.
- [ ] Validar que turmas de Fundamental I estão como "Antecipado por Dias".
- [ ] Validar que Desconto Pessoal aparece na tabela mas não reduz o Líquido Final.
- [ ] Testar importação de planilha com coluna `DATANASCALUNO`.
- [ ] Rodar `npm run build` para garantir integridade.

---

## 4. AGENTES E SKILLS

| Task | Agente | Skill |
|------|--------|-------|
| T1, T4, T5 | `backend-specialist` | `clean-code`, `api-patterns` |
| T2, T3 | `frontend-specialist` | `frontend-design`, `app-builder` |
| T6 | `data-engineer` | `data-pipeline` |
