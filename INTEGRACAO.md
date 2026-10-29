# Demanda Diária — operação

O sistema usa Next.js, PostgreSQL e Better Auth. Atividades, colaboradores,
histórico e configurações são persistidos no banco. As rotas validam a sessão e
o perfil no servidor.

## Configuração obrigatória

1. Execute `docker compose up -d` para iniciar o PostgreSQL local já configurado.
2. O arquivo `.env.local` contém a configuração desse banco local. Em publicação,
   substitua seus valores pelos segredos do ambiente de produção.
3. Execute `pnpm dev` para desenvolvimento ou `pnpm build && pnpm start` para produção.
4. No primeiro acesso, abra `/sign-up` e crie a supervisão. Depois desse cadastro,
   a rota deixa de aceitar novas contas públicas.
5. Entre como supervisão e cadastre os colaboradores com matrícula, senha, equipe,
   turno e especialidades.

As tabelas são criadas automaticamente na primeira inicialização. A migração
`operational_reset_2026_10` remove uma única vez atividades e colaboradores antigos,
garantindo a base operacional vazia solicitada, sem apagar a conta supervisora.

## Distribuição inteligente

A rota `/api/ai/assign` compara a atividade com as especialidades dos colaboradores
ativos. Com `OPENAI_API_KEY`, usa a Responses API com saída estruturada; sem a chave,
usa o ranqueamento local por especialidades. A supervisão pode revisar a sugestão
antes de salvar.

## Perfis

- Supervisão: gerencia colaboradores, atividades, configurações, histórico e relatórios.
- Colaborador: visualiza apenas as próprias atividades e pode atualizar sua execução.
- Colaboradores desativados perdem o acesso imediatamente.

## Verificação

```powershell
node_modules\.bin\tsc.cmd --noEmit
node_modules\.bin\next.cmd build
```

## Publicação no Railway

1. Envie o projeto para um repositório privado no GitHub.
2. No Railway, crie um projeto pelo repositório e adicione um serviço PostgreSQL.
3. Configure `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` com a URL
   pública do serviço e, opcionalmente, `OPENAI_API_KEY`.
4. O arquivo `railway.json` executa a build, inicia o Next.js e valida `/api/health`.
5. No primeiro acesso da instalação publicada, abra `/sign-up` para criar a supervisão.
