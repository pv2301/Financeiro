# PLAN-layout-cleanup-cache.md

Este plano detalha os ajustes de layout para expansão horizontal, remoção de colunas redundantes, melhoria nos relatórios e otimização de cota do Firebase via cache local.

## 🎼 Orquestração de Agentes
- **project-planner**: Supervisão do roteiro e validação dos objetivos.
- **frontend-specialist**: Ajuste do layout 100% width, remoção de colunas e UI dos novos cards de relatórios.
- **backend-specialist**: Implementação da camada de cache (LocalStorage) para interceptar chamadas ao Firebase.
- **data-analyst**: Criação das métricas de "Ticket Médio" e insights para o dashboard de relatórios.

## 📋 Tarefas

### Fase 1: Expansão de Layout & Sidebar
1. [ ] **Ajustar Containers Globais**: Alterar `max-w-7xl mx-auto` para `w-full` em todas as páginas (`src/pages/*.tsx`).
2. [ ] **Sincronia Sidebar-Content**: Garantir que o `padding-left` ou `margin-left` do conteúdo principal responda dinamicamente ao estado `isCollapsed` da Sidebar no `App.tsx`.
3. [ ] **Refinar Margens**: Manter margens consistentes (`p-6`) mesmo em modo 100% width.

### Fase 2: Limpeza de Conteúdo ("Serviço")
4. [ ] **Remover Coluna em Fechamento**: Excluir a coluna "Serviço" da tabela no `MonthlyProcessing.tsx`.
5. [ ] **Remover Coluna em Financeiro**: Excluir a coluna "Serviço" da visualização no `Invoices.tsx`.
6. [ ] **Remover Card em Relatórios**: Excluir o card de serviços atual no `Reports.tsx`.

### Fase 3: Upgrade de Relatórios (Dashboard Insights)
7. [ ] **Implementar Ticket Médio**: Criar card de métrica calculando `Total Faturado / Número de Alunos Ativos`.
8. [ ] **Adicionar Insights Visuais**:
    *   Gráfico simples de "Receita por Turma".
    *   Top 5 Alunos com maior consumo.
    *   Indicador de "Inadimplência vs Pagos".

### Fase 4: Otimização de Cota (LocalStorage Cache)
9. [ ] **Mecanismo de Cache**: No `src/lib/finance-service.ts`, adicionar lógica para:
    *   Salvar resultados de `getStudents` e `getClasses` no `localStorage`.
    *   Verificar timestamp do cache (ex: validade de 1 hora) antes de chamar o Firebase.
10. [ ] **Botão "Forçar Atualização"**: Adicionar um pequeno ícone de "refresh" no Header ou Configurações para limpar o cache manual se necessário.

### Fase 5: Verificação & Testes
11. [ ] **Validar Responsividade**: Testar comportamento do layout 100% em diferentes resoluções.
12. [ ] **Monitorar Consumo Firebase**: Verificar se as chamadas ao banco diminuíram após o cache.

## 🏁 Critérios de Aceite
- [ ] O sistema utiliza toda a largura da tela quando a sidebar está recolhida.
- [ ] A coluna "Serviço" não aparece mais em nenhuma tela.
- [ ] A página de Relatórios possui métricas de Ticket Médio e novos insights visuais.
- [ ] O carregamento de páginas é instantâneo para dados cacheados (sem spinner de loading do Firebase).
