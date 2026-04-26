# PLAN-ajustes-financeiros-v4.md

Este plano detalha a orquestração para validar as implementações recentes e resolver os novos pontos de UI/UX no módulo de Fechamento Mensal.

## 🎼 Orquestração de Agentes
- **project-planner**: Estruturação deste plano e acompanhamento.
- **explorer-agent**: Investigação do gatilho automático de importação e mapeamento de espaços na UI.
- **frontend-specialist**: Correção lógica do carregamento e ajuste fino de paddings/margens.
- **test-engineer**: Validação final de regressão (Sidebar, Faltas, Popups).

## 📋 Tarefas

### Fase 1: Análise e Diagnóstico
1. [ ] **Investigar Auto-Import**: Identificar no `MonthlyProcessing.tsx` o `useEffect` ou gatilho que inicia o carregamento de consumo ao abrir a página.
2. [ ] **Mapear UI de Importação**: Localizar o container do botão "IMPORTAR CONSUMO" para identificar paddings/gaps excessivos.

### Fase 2: Implementações
3. [ ] **Corrigir Gatilho de Carga**: Ajustar a lógica para que o consumo só seja carregado sob demanda (clique no botão) ou garantir que não exiba "loading" desnecessário se já houver dados.
4. [ ] **Reduzir Espaçamento Vertical**: Ajustar classes CSS/Tailwind (ex: `py-12` -> `py-6`, `gap-8` -> `gap-4`) na seção de importação.

### Fase 3: Validação e Testes
5. [ ] **Verificação Cruzada**: Confirmar que o `p-6` global está consistente em todas as páginas.
6. [ ] **Teste de Stress (Faltas)**: Simular múltiplas entradas de faltas para garantir estabilidade do cálculo real-time.
7. [ ] **Auditoria de Sidebar**: Verificar se o estado colapsado não quebra layouts em telas menores.

## 🏁 Critérios de Aceite
- [ ] O carregamento de consumo não deve disparar sozinho ao abrir a página.
- [ ] A seção de importação deve estar mais compacta verticalmente.
- [ ] Nenhuma regressão no cálculo de faltas ou sidebar.
