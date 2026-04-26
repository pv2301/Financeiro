# Plano de Implementação: Ajustes Financeiros V3

Este plano detalha as alterações necessárias para refinar o sistema de faturamento, incluindo contagem de serviços por dias letivos, edição coletiva de alunos e melhorias na UI de cópia de identificadores.

## 🛠️ Alterações de Nomenclatura e Tipagem

### 1. Renomear Modalidades de Cobrança
- **De:** `ANTICIPATED_FIXED` → **Para:** `PREPAID_FIXED` ("Pré-Pago Fixo")
- **De:** `ANTICIPATED_DAYS` → **Para:** `PREPAID_DAYS` ("Pré-Pago por Dias Letivos")
- **Impacto:** Atualizar `types.ts`, `services/finance.ts` e todas as referências em `MonthlyProcessing.tsx`, `Classes.tsx` e `Invoices.tsx`.

## 📊 Lógica de Serviços e Faturamento

### 2. Contagem de Serviços (Pré-Pago)
- **Regra:** Para alunos em modalidades Pré-Pagas, o `totalServices` deve ser igual ao número de dias letivos configurados para a turma no mês de referência.
- **Implementação:** Atualizar `generatePreview` em `MonthlyProcessing.tsx` para buscar os dias letivos da turma e atribuir ao `totalServices`.

### 3. Filtros no Relatório
- Adicionar select de "Modalidade de Cobrança" no cabeçalho de `Reports.tsx`.
- Filtrar a lista `classStats` com base na modalidade selecionada.

## 👥 Gestão de Alunos (UI/UX)

### 4. Campo de Observações e UI
- Em `Students.tsx`, renomear "Regras de Desconto (Opcional)" e seus campos para um campo único "Observações" (textarea simples).
- Manter o campo "Desconto Pessoal / Acordo (%)" como um input numérico separado.
- **Aumentar a largura do modal de edição** (ex: mudar de `max-w-2xl` para `max-w-4xl`) para acomodar melhor os campos de pais e observações.

### 5. Edição Coletiva (Bulk Edit)
- Adicionar checkboxes na lista de alunos em `Students.tsx`.
- Criar uma barra de ações flutuante (sticky) que aparece ao selecionar 1+ alunos.
- Botão "Ações em Massa":
    - **Desconto (%)**: Aplicar porcentagem a todos.
    - **Observação**: Adicionar texto. Se já houver texto, concatenar com " - [novo texto]".

### 6. Cópia de Nome Formatado (ID de Banco)
- Adicionar ícone de cópia ao lado do nome do aluno na tabela.
- Tooltip ao passar o mouse: Exibe o nome formatado (Ex: `CECILIAPERCILIORIBEIRO_`).
- Lógica: `name.toUpperCase().replace(/\s+/g, '') + '_'`.

## 📋 Checklist de Verificação

### Fase 1: Fundação
- [ ] Atualizar `types.ts` com as novas enums de modalidade.
- [ ] Migrar dados existentes (se houver localstorage) para os novos nomes de modalidade.

### Fase 2: Interface Alunos
- [ ] Implementar checkboxes e estado de seleção em `Students.tsx`.
- [ ] Criar modal de "Edição Coletiva".
- [ ] Adicionar botão de cópia com feedback visual (toast/ícone alterado).

### Fase 3: Motor Financeiro
- [ ] Validar cálculo de `totalServices` para Pré-Pago.
- [ ] Testar se o `netAmount` continua correto com o desconto em porcentagem.

### Fase 4: Relatórios
- [ ] Validar filtros de modalidade.
- [ ] Verificar formatação BRL em todos os novos campos.

## 🎭 Atribuição de Agentes

| Agente | Responsabilidade |
|--------|------------------|
| `frontend-specialist` | UI de seleção em massa, modal de edição, ícone de cópia e filtros de relatório. |
| `backend-specialist` | Lógica de cálculo de serviços no `MonthlyProcessing` e migração de enums. |
| `test-engineer` | Validação de cálculos financeiros e testes de regressão na importação. |
