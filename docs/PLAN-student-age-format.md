# PLAN-student-age-format.md

Este plano detalha a alteração do formato de exibição da idade na página de Alunos para torná-lo mais amigável e legível.

## 🎼 Orquestração de Agentes
- **project-planner**: Supervisão e garantia das regras de negócio.
- **frontend-specialist**: Implementação da função de formatação e atualização do componente Students.tsx.

## 📋 Tarefas

### Fase 1: Implementação da Lógica de Formatação
1. [ ] **Criar Helper de Idade**: Implementar uma função robusta para calcular e formatar a idade no `Students.tsx` seguindo as regras:
    *   `years > 0` e `months > 0`: "X anos e Y meses" (com tratamento de singular).
    *   `years > 0` e `months == 0`: "X anos" (com tratamento de singular).
    *   `years == 0` e `months > 0`: "Y meses" (com tratamento de singular).
2. [ ] **Atualizar Renderização**: Substituir o bloco inline de cálculo de idade no `Students.tsx` (linhas 303-312 aprox.) pela nova chamada formatada.

### Fase 2: Verificação
3. [ ] **Teste de Casos de Borda**:
    *   Testar aluno com 1 ano e 1 mês (Singular).
    *   Testar aluno com exatamente 2 anos (Ocultar meses).
    *   Testar bebê com 6 meses (Ocultar anos).

## 🏁 Critérios de Aceite
- [ ] O formato deve ser extensivo (ex: "3 anos e 8 meses") em vez de abreviado.
- [ ] A gramática deve estar correta para singular e plural.
- [ ] O visual deve permanecer compacto dentro da tag de destaque (badge).
