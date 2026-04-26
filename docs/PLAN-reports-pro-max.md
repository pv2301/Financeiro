# PLAN: Relatórios Pro Max - Financeiro Canteen

Este plano detalha a implementação de um módulo de relatórios avançado, unindo visualizações de alto nível (Macro) com a granularidade necessária para auditoria (Micro).

## 🎨 Design System & Estética
- **Estilo**: Premium Dashboard com suporte a Dark/Light mode.
- **Tipografia**: Fira Code (para dados numéricos/precisão) e Fira Sans (leitura).
- **Cores**: Brand Blue, Emerald (Lucratividade), Orange (Pendências), Sky (Serviços).
- **Componentes**: Cards de métricas com micro-glow, Gráficos interativos (Recharts), Tabelas expansíveis.

## 📊 Arquitetura de Dados & Insights
Exploraremos as seguintes dimensões:
1. **Faturamento vs. Recebido**: Visão de saúde financeira (Inadimplência).
2. **Top Serviços**: Ranking de consumos mais populares.
3. **Distribuição por Segmento**: Análise de receita por Turma/Nível.
4. **Histórico de Faltas**: Impacto das ausências no faturamento integral.
5. **Insights IA (Simulados)**: Alertas sobre tendências de queda/alta em serviços específicos.

## 🛠️ Fases de Implementação

### Fase 1: Fundação & Filtros (Frontend Specialist)
- [ ] Criação do layout base (`Reports.tsx` refatorado).
- [ ] Implementação de **Filtros Globais**: Período (Mês/Ano), Turma, Tipo de Serviço, Status de Pagamento.
- [ ] Estado global de dados filtrados para sincronia entre Dashboard e Lista.

### Fase 2: Dashboard Macro (Frontend Specialist + Performance)
- [ ] **Metric Grid**: Cards premium com Sparklines (pequenos gráficos de tendência).
- [ ] **Revenue Chart**: Gráfico de barras/áreas comparando esperado vs. realizado.
- [ ] **Service Breakdown**: Gráfico de Rosca/Pizza para distribuição de serviços.
- [ ] **Granularity Toggle**: Switch suave entre modo "Visão Geral" e "Dados Granulares".

### Fase 3: Lista Micro/Auditoria (Frontend Specialist + Performance)
- [ ] **Data Table Pro**: Ordenação, exportação (XLSX/PDF), busca instantânea.
- [ ] **Expandable Rows**: Detalhes do aluno e histórico de faturas ao clicar.
- [ ] **Performance Tuning**: Virtualização de lista se > 500 registros.

### Fase 4: Insights & Polimento (SEO Specialist + UI/UX Pro Max)
- [ ] **Insights Section**: Cards de texto explicando os números (ex: "Aumento de 15% no consumo de lanches em relação ao mês anterior").
- [ ] **Acessibilidade**: ARIA labels, navegação por teclado nos gráficos.
- [ ] **Final UX Audit**: Verificação de contraste e feedback visual.

## 🧪 Verificação & Testes
- [ ] Simulação de dados de um ano inteiro para testar performance.
- [ ] Teste de exportação de dados em diferentes cenários de filtro.
- [ ] Auditoria de design (Purple Ban & Labels).

---

## ⏸️ Checkpoint
**Aprovação do Plano:**
- [ ] Usuário aprovou as fases? (Aguardando...)
