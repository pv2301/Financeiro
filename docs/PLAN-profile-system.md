# PLAN: Profile System, Access Approval & Logo Consolidation

Este plano detalha a implementação de um sistema de controle de acesso robusto, fluxo de aprovação de novos usuários e centralização da gestão de marca.

## Fase 1: Arquitetura de Perfis e Segurança
- **Coleção `profiles`**: Documentos mapeando `uid` para `{ email, role, status, createdAt }`.
  - Roles: `ADMIN`, `USER`.
  - Status: `PENDING`, `APPROVED`, `BLOCKED`.
- **Interceptador de Login**: Atualizar o `AuthProvider` em `App.tsx` para verificar o status do usuário no Firestore após o login do Firebase Auth.
- **Tela de Espera**: Criar uma visualização amigável para usuários logados mas com status `PENDING`, informando que devem aguardar a aprovação.

## Fase 2: Gestão de Marca (Logo)
- **Modal Centralizado**: Implementar `LogoManagerModal` com as funções de upload e remoção.
- **Trigger na Sidebar**: Tornar a logo na Sidebar clicável apenas para `ADMIN`. Ao clicar, abre o modal.
- **Remoção de Legado**: Excluir a aba de Logo da página `Config.tsx`.

## Fase 3: Administração de Acessos
- **Aba "Acessos" em Configurações**: 
  - Visível apenas para `ADMIN`.
  - Lista de solicitações `PENDING` com botões "Aprovar" (muda status para `APPROVED`) e "Recusar".
- **Gestão de Usuários**: Lista de usuários já aprovados com opção de mudar `role` ou bloquear.

## Fase 4: Auditoria e Zona de Perigo
- **Zona de Perigo**: Seção em Configurações para ações irreversíveis (Exclusão de turmas, reset de dados), protegida por confirmação extra e restrita a `ADMIN`.
- **Página de Auditoria**: Refinamento visual da página atual para exibir quem aprovou quem e alterações críticas no sistema.

## Verificação Checklist
- [ ] Usuário não cadastrado vê mensagem de "Aguardando Aprovação".
- [ ] Admin recebe notificação visual (badge) de novas solicitações.
- [ ] Ao aprovar, o usuário consegue acessar o dashboard instantaneamente.
- [ ] Apenas Admin consegue abrir o modal de troca de logo clicando na Sidebar.
- [ ] Zona de Perigo está oculta para usuários comuns.
