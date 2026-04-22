# Plano de Ação: Refatoração da Tabela de Fechamento Mensal

## 1. Contexto e Problema
A interface atual do "Passo 3: Revisão de Boletos" no `MonthlyProcessing.tsx` não suporta adequadamente a exibição conjunta de alunos com modelo Fixo e modelo Consumo. 
- O número de faltas está quebrado visualmente ("20 \n d") e é exibido para alunos que nem deveriam ter faltas.
- Não existe UI para editar/digitar as faltas.
- Os detalhes do consumo importado do Firebase (`fin_consumption`) não são exibidos na tabela.
- Faltam filtros para auditar quem teve consumo importado e quem está pendente.

## 2. Solução Proposta (Arquitetura Visual)
A recomendação principal (Opção B do Brainstorm) é **separar a tabela em duas abas**:
1. **Aba: Mensalidade Fixa**
   - Colunas: Aluno | Turma | Base (R$) | Faltas (Input Editável) | Desc. Faltas | Desc. Pessoal | Final
2. **Aba: Consumo (Catraca)**
   - Colunas: Aluno | Turma | Status (Importado/Pendente) | Itens Consumidos (Resumo) | Final
   - Filtros: Exibir Todos | Somente Pendentes | Somente Importados

## 3. Tarefas de Implementação

### Fase 1: Estrutura de Estado e Filtros
- [ ] Mover a tabela atual para um componente modular menor ou criar renderizadores de linha (`RowRenderer`) separados por modelo.
- [ ] Criar estado de Aba ativa (`activeTab: 'fixed' | 'consumption'`).
- [ ] Criar estado para rastrear faltas digitadas manualmente (`manualAbsences: Record<string, number>`).
- [ ] Criar filtros locais para a aba de consumo.

### Fase 2: UI da Mensalidade Fixa
- [ ] Limpar as colunas.
- [ ] Transformar a célula de "Faltas" num `<input type="number">` estilizado e responsivo.
- [ ] Conectar a digitação do input com o cálculo em tempo real do "Líquido Final".

### Fase 3: UI do Consumo Pós-Pago
- [ ] Criar a tabela de consumo.
- [ ] Cruzar `students` com `consumptionRecords` do mês selecionado.
- [ ] Exibir uma badge `Pendente` (amarela) ou `Importado` (verde) por aluno.
- [ ] Somar e renderizar o valor total de serviços consumidos multiplicado pelo preço do serviço na turma atual.

### Fase 4: Otimização de Espaçamento e Design
- [ ] Remover o sufixo "d" das faltas para evitar quebras.
- [ ] Ajustar os padings e o `text-align` das colunas de valores (moeda sempre alinhada à direita).
- [ ] Melhorar a tipografia da listagem de alunos.
