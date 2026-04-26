# Project Plan: Sistema de Auditoria e Backups Resilientes (Option A)

## 1. Contexto e Objetivos
- **Objetivo Principal:** Tornar o sistema financeiro robusto, auditável e seguro contra perda acidental de dados, adotando práticas profissionais de governança.
- **Estratégia Escolhida:** "Soft Delete" (exclusão lógica) combinada com um registro de atividades na coleção `audit_logs`.
- **Escopo de Proteção:** Boletos (Financeiro), Alunos e Turmas.
- **Funcionalidades Chave:** 
  - Página exclusiva de "Auditoria" (visualização de logs e Lixeira).
  - Controle de Acesso Estrito: Acesso à página e rotas de auditoria bloqueado exclusivamente para o perfil Administrador Master (`paulovictorsilva2301@gmail.com`).
  - Recuperação (Restauração) de dados apagados acidentalmente.
  - Retenção padrão de 90 dias com opção de purga definitiva.

## 2. Arquitetura e Decisões Técnicas
- **Alteração de Esquema (`types.ts`):** Adição dos campos `deletedAt` (Data) e `deletedBy` (Usuário/ID) para as entidades principais.
- **Refatoração de Consultas (`finance.ts`):** Todas as chamadas de listagem (GET) deverão filtrar apenas os documentos onde `deletedAt` é nulo/inexistente.
- **Trilha de Auditoria:** Uma nova coleção `fin_audit_logs` no Firebase que registrará os eventos de `CREATE`, `UPDATE`, e `SOFT_DELETE`, contendo o payload antigo e o novo payload.
- **Mecanismo de Retenção:** Uma função acionada pela página de Auditoria que excluirá permanentemente (hard delete) os documentos cujo `deletedAt` seja mais antigo que 90 dias, limpando também seus logs associados se desejado.

## 3. Cronograma de Tarefas (Task Breakdown)

### Fase 1: Fundação de Dados e Serviços (Backend)
- [ ] **Tipagem:** Atualizar `src/types.ts` adicionando `deletedAt` nas interfaces `Invoice`, `Student`, `ClassInfo`. Criar a interface `AuditLog`.
- [ ] **Serviço de Log:** Criar função `createAuditLog(action, collection, docId, oldData, newData)` no `finance.ts`.
- [ ] **Modificação de Exclusão:** Substituir os métodos `deleteDoc` atuais por uma atualização (`updateDoc`) que injeta a data de exclusão (`softDeleteDocument`).
- [ ] **Filtro de Leitura:** Ajustar `getInvoices`, `getStudents` e `getClasses` para trazerem apenas os registros ativos.

### Fase 2: Adaptação das Interfaces Existentes (Frontend)
- [ ] **Alunos (`Students.tsx`):** Adaptar a função de exclusão para usar o novo modelo de soft delete e registrar na auditoria.
- [ ] **Turmas (`Classes.tsx`):** Adaptar a exclusão e edição para usar o log.
- [ ] **Boletos (`Invoices.tsx` & `MonthlyProcessing.tsx`):** Garantir que ações em massa (Exclusão em Lote) acionem o soft delete adequadamente e gerem log individual/em lote.

### Fase 3: Criação da Página de Auditoria (UI/UX)
- [ ] **Estruturação:** Criar a página `src/pages/Audit.tsx`.
- [ ] **Visualização de Logs:** Tabela listando as atividades do sistema ordenadas das mais recentes para as mais antigas.
- [ ] **Lixeira e Restauração:** Aba ou visualização para listar apenas os itens excluídos (`deletedAt !== null`), com botão "Restaurar" ao lado de cada um.
- [ ] **Política de Retenção:** Implementar card/botão para "Limpar Lixeira (itens mais antigos que 90 dias)" de forma definitiva.

### Fase 4: Finalização e Testes Integrados
- [ ] **Navegação e Acesso:** Adicionar a rota e o ícone de "Auditoria" na Sidebar principal (`App.tsx`), ocultando e bloqueando o acesso caso o email do usuário logado não seja `paulovictorsilva2301@gmail.com`.
- [ ] **QA e Testes de Borda:** Garantir que itens na lixeira não quebrem as contagens em outras áreas do app (ex: relatórios financeiros).

## 4. Atribuições dos Agentes
- `backend-specialist`: Focado na Fase 1 (Configuração do Firebase, Types e filtragem de Soft Delete).
- `frontend-specialist`: Focado nas Fases 2, 3 e 4 (Criação da tela de Auditoria, UI da lixeira, e componentes).

## 5. Checklist de Verificação
- [ ] A tela de auditoria não é acessível (e não aparece no menu) para usuários que não sejam o admin master.
- [ ] As exclusões nos painéis não apagam mais o documento do banco.
- [ ] Documentos excluídos aparecem na página de Auditoria.
- [ ] É possível restaurar um Aluno/Boleto excluído com sucesso.
- [ ] A limpeza de 90 dias funciona corretamente deletando permanentemente os dados.
