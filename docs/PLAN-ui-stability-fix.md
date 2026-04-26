# PLAN-ui-stability-fix.md

## 🎯 Objetivos
1. **Traduzir UI**: Converter termos e botões em inglês para português.
2. **Restaurar Nomes**: Garantir que o nome completo do aluno seja exibido em Alunos e Fechamento.
3. **Detalhes de Faturamento**: Adicionar CPF do Responsável e "Corpo do Boleto" no Fechamento.
4. **Corrigir Permissões**: Resolver erros de regras do Firebase para Logs de Auditoria e Presença.

---

## 🛠️ Fase 1: Restauração de UI & Dados
### 1.1 Página de Alunos (`Students.tsx`)
- [ ] Atualizar tabela/cards para mostrar `name` (completo).
- [ ] Traduzir botões: "Add Student" -> "Novo Aluno", "Import" -> "Importar", etc.

### 1.2 Fechamento Mensal (`MonthlyProcessing.tsx`)
- [ ] Atualizar tabelas para mostrar nomes completos dos alunos.
- [ ] Exibir CPF do Responsável abaixo do nome/turma.
- [ ] Adicionar texto "Corpo do Boleto" para cópia fácil.
- [ ] Traduzir todos os elementos da UI em inglês.

### 1.3 Tradução Geral
- [ ] Revisar `Snacks.tsx`, `Invoices.tsx`, `Reports.tsx` para remover strings em inglês.

---

## 🔒 Fase 2: Firebase & Segurança
### 2.1 Regras do Firestore (`firestore.rules`)
- [ ] Otimizar `isAdmin()` para ser mais resiliente (checar existência de email).
- [ ] Adicionar UID específico do Paulo como superuser redundante.
- [ ] Corrigir regras de `presence` para permitir assinaturas de coleção se necessário.
- [ ] Garantir acesso a `fin_audit_logs`.

### 2.2 Serviço de Perfis (`profiles.ts`)
- [ ] Garantir que `ensureProfile` trate erros de permissão sem quebrar o login.
- [ ] Investigar se a query de 'ADMIN' está causando o erro reportado.

### 2.3 Serviço de Finanças (`finance.ts`)
- [ ] Revisar `subscribeToPresence` para não tentar ler toda a coleção se bloqueado por regras.

---

## 🧪 Verificação
- [ ] Testar login com `paulovictorsilva2301@gmail.com` e verificar carregamento de logs.
- [ ] Validar campos restaurados em Alunos e Fechamento.
- [ ] Verificar se todos os botões estão em português.
