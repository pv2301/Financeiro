# PLAN-estabilizacao-alunos.md

Este plano foca na correção definitiva da edição em massa, melhoria da legibilidade dos dados e refinamento estético do Layout.

## 📋 Tarefas

### Fase 1: Edição em Massa (Bulk Update)
1. [ ] **Otimização de UX**: 
    *   Mover `setIsBulkModalOpen(false)` para antes do `loadData()` para dar resposta imediata ao usuário.
    *   Implementar um estado de "Sucesso" visual antes de fechar.
2. [ ] **Verificação de Persistência**:
    *   Adicionar logs detalhados e garantir que o lote seja processado antes do alerta final.

### Fase 2: Ajustes de UI e Layout (Sidebar & Main)
3. [ ] **Sidebar - Texto Completo**:
    *   Aumentar largura expandida de `w-64` para `w-72`.
    *   Reduzir `tracking-widest` para `tracking-wider` nos itens de menu.
    *   Remover `truncate` dos labels do `NavItem` para garantir visibilidade total.
4. [ ] **Páginas - Margens e Largura**:
    *   Reduzir padding global de `p-6` (24px) para `p-4` (16px) em todas as páginas (redução de ~10px solicitada).
    *   Remover `max-w-7xl` dos containers principais para permitir expansão total (100% da largura).

### Fase 3: Formatação de Idade
5. [ ] **Implementar Função de Extenso**:
    *   Regra: "1 ano e 1 mês", "3 anos", "8 meses".
    *   Local: `Students.tsx`, função `formatAge`.

## 🏁 Critérios de Aceite
- [ ] Modal de edição fecha e confirma sem erros.
- [ ] Itens do menu (ex: "Fechamento Mensal") aparecem sem cortes.
- [ ] Espaçamento entre menu e conteúdo visivelmente reduzido.
- [ ] Idade formatada corretamente por extenso.
- [ ] Páginas ocupam 100% da largura disponível.
