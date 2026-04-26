# PLAN-system-optimization.md

## 🎯 Objetivos
1. **Corrigir Checkboxes**: Resolver falha de seleção no modal "Selecionar Alunos (Integral)" e na aba "Consumo".
2. **Centralização Administrativa**: Criar a página "Central do Sistema" unificando Auditoria, Controle de Acesso, Manutenção e Zona de Perigo.
3. **Melhoria UI/UX**: Refinar a interface de "Edição em Massa" na página de Alunos.

---

## 🛠️ Phase 1: Correção de Bugs de Seleção
- [ ] **Modal Integral**:
    - Investigar por que os checkboxes no modal `IntegralSelectionModal` (em `MonthlyProcessing.tsx`) não estão respondendo ou refletindo o estado.
    - Garantir que o `onClick` no card do aluno também ative o checkbox.
- [ ] **Aba Consumo (Passo 3)**:
    - Revisar a lógica de `Selecionar Todos` na aba de Consumo.
    - Verificar se a filtragem (`all`, `imported`, `pending`) está interferindo incorretamente na lista de IDs selecionados.
    - Garantir que IDs determinísticos estão sendo usados consistentemente.

## 🛠️ Phase 2: Central do Sistema (Nova Página)
- [ ] **Arquitetura**:
    - Criar `src/pages/SystemCenter.tsx`.
    - Nome sugerido: **"Central do Sistema"**.
- [ ] **Migração de Componentes**:
    - Mover o conteúdo de `Audit.tsx` para uma aba na Central.
    - Mover a seção de "Pré-aprovação de E-mails" (Controle de Acesso) das Configurações para a Central.
    - Mover a "Manutenção" (Limpeza de cache/sync) para a Central.
    - Mover o "DeleteDataModal" (Zona de Perigo) para um botão de destaque na Central.
- [ ] **Navegação**:
    - Atualizar `App.tsx` com a nova rota.
    - Atualizar `Sidebar.tsx` substituindo "Auditoria" por "Central do Sistema".

## 🛠️ Phase 3: Edição em Massa (UI/UX)
- [ ] **Visual**:
    - Melhorar o feedback visual quando o modo "Edição em Massa" está ativo na `Students.tsx`.
    - Adicionar uma "Floating Bar" (barra flutuante) na parte inferior quando houver alunos selecionados, com ações claras (Editar, Remover, Alterar Turma).
- [ ] **Funcionalidade**:
    - Implementar o modal de edição em massa que permita alterar campos comuns (Turma, Segmento, Dia de Vencimento, Isenção de Lanche) para todos os selecionados de uma vez.

---

## ✅ Verificação
1. [ ] Checkboxes no modal Integral marcam/desmarcam corretamente.
2. [ ] "Selecionar Todos" no Consumo seleciona exatamente o que está visível.
3. [ ] Central do Sistema acessível apenas para Admin.
4. [ ] Edição em massa permite alterar turma de 5 alunos simultaneamente com sucesso.
