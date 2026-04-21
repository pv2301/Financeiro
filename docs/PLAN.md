# Plano de Implementação: Sistema de Gestão de Custos

## 1. Visão Geral
Módulo de Gestão de Custos e Faturamento, integrado ao ecossistema "Cardápio Baby", para automatizar o cálculo de boletos da cantina. Substituirá o processo manual em planilhas por um fluxo guiado, com leitura de relatório de consumo, aplicação de descontos por acordo/falta e gestão manual do status de pagamento (Pago vs. Vencido).

## 2. Modelagem de Dados (Firebase Firestore)

### 2.1 Coleção `students` (Alunos)
- `id`: string
- `name`: string
- `classId`: string (Ref. Turma)
- `responsibleName`: string
- `responsibleCpf`: string
- `contactPhone`: string
- `personalDiscount`: number (Desconto por acordo ou filho de funcionário - % ou valor fixo)
- `hasTimelyPaymentDiscount`: boolean (Se o desconto só vale até o vencimento)

### 2.2 Coleção `classes` (Turmas)
- `id`: string
- `name`: string (ex: "1 ANO A")
- `billingMode`: enum (`ANTICIPATED_FIXED`, `ANTICIPATED_DAYS`, `POSTPAID_CONSUMPTION`)
- `basePrice`: number (Parcela fixa ou Valor unitário base)
- `applyAbsenceDiscount`: boolean (Aplica desconto por falta?)

### 2.3 Coleção `snacks` (Lanches / Valores Unitários)
- `id`: string
- `name`: string (ex: "Lanche da Manhã", "Almoço CFC Baby")
- `unitPrice`: number

### 2.4 Coleção `invoices` (Boletos/Cobranças)
- `id`: string
- `studentId`: string
- `monthYear`: string (ex: "04/2026")
- `grossAmount`: number (Valor Bruto)
- `absenceDays`: number (Faltas no mês)
- `absenceDiscountAmount`: number (Valor descontado por falta)
- `personalDiscountAmount`: number
- `netAmount`: number (Valor Final/Líquido)
- `dueDate`: timestamp (Vencimento)
- `paymentStatus`: enum (`PENDING`, `PAID`, `OVERDUE`)
- `ticketNumber`: string (Número do Boleto/Título)

## 3. Fluxo de Funcionalidades (UI/UX)

### Fase 1: Configurações e Cadastros
1. **Página de Turmas e Regras:** 
   - Criar turmas.
   - Definir modelo de faturamento (`Antecipada Fixa`, `Antecipada por Dias Letivos`, `Postecipada por Consumo`).
   - Configurar valores unitários dos lanches.
   - Ativar/Desativar regra de faltas por turma.
2. **Página de Alunos:** 
   - Cadastro de aluno, vínculo com responsável e turma.
   - Configuração de desconto especial (condicionado ao pagamento em dia).

### Fase 2: Processamento Mensal (O "Motor" de Cálculo)
1. **Importação de Consumo:**
   - Tela de Upload do arquivo "Relatório Cardápios Consumidos".
   - Parser do Excel para o sistema, vinculando o consumo (quantidade de cada lanche) aos alunos cadastrados.
2. **Revisão e Faltas:**
   - Tabela listando os alunos para o mês em referência.
   - Campo editável para inserir as "Faltas" manuais.
   - O sistema calcula automaticamente: `Valor Final = (Consumo * Preço Unitário) - (Faltas * Preço Lanche) - Descontos Pessoais`.
   *(A fórmula exata varia conforme o `billingMode` da turma do aluno).*
3. **Geração de Cobranças:**
   - Geração dos registros de "Invoices" no banco de dados.

### Fase 3: Gestão Financeira
1. **Dashboard de Recebimentos (Diário/Geral):**
   - Lista de boletos aguardando pagamento.
   - Botão para dar baixa manual (`Marcar como Pago`).
2. **Painel de Inadimplência (Boletos Vencidos):**
   - Filtro para exibir apenas boletos `OVERDUE`.
   - Se o boleto possuía desconto condicionado ao vencimento e venceu, o sistema recalcula ou exibe a remoção do desconto.

## 4. Stack Tecnológico
- **Frontend:** React + TypeScript + Vite + TailwindCSS + Componentes Reusáveis atuais (Lucide, Motion).
- **Backend/DB:** Firebase Firestore.
- **Processamento de Arquivos:** Biblioteca `xlsx` (já presente no package.json) rodando no Client-Side para evitar sobrecarga de servidor.

## 5. Ordem de Implementação (Próximos Passos)
- [ ] 1. Ajuste das Regras de Segurança do Firestore (`firestore.rules`).
- [ ] 2. Telas de Configuração (Turmas, Lanches e Alunos).
- [ ] 3. Lógica do Parser de Excel para Consumos (`xlsx`).
- [ ] 4. Tela de Processamento Mensal (Faltas e Fechamento).
- [ ] 5. Painel de Boletos, Baixa Manual e Inadimplência.
