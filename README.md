<div align="center">
  <img src="assets/logo-transparent.png" alt="Los Santos Reader — símbolo do livro" width="180">
  <h1>Los Santos Reader</h1>
  <p><strong>Uma biblioteca digital para ler, acompanhar seu progresso e evoluir no seu ritmo.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/status-conclu%C3%ADdo-5C6B4A?style=flat-square" alt="Status: concluído">
    <img src="https://img.shields.io/badge/PWA-instal%C3%A1vel-DCCAA3?style=flat-square&labelColor=121212" alt="PWA instalável">
    <img src="https://img.shields.io/badge/idioma-pt--BR-8B5E3C?style=flat-square" alt="Idioma: português do Brasil">
  </p>
</div>

O **Los Santos Reader** é um aplicativo web responsivo de leitura, com identidade visual inspirada em Los Santos. Reúne biblioteca digital, leitura de livros em PDF, acompanhamento de progresso, gamificação e administração de catálogo. Pode ser usado no navegador ou instalado como **Progressive Web App (PWA)** em dispositivos compatíveis.

> **Status do produto: concluído.** O código do aplicativo e seus principais fluxos estão implementados. Para executar uma instalação própria, ainda é necessário configurar o projeto Supabase, aplicar o banco de dados, cadastrar as credenciais dos provedores externos e publicar o site em HTTPS.

## Recursos

- **Biblioteca:** busca de livros, categorias, detalhes e capas.
- **Leitor PDF:** navegação por páginas, zoom, ajuste de visualização, tela cheia, marcadores e retomada do progresso.
- **Conta e autenticação:** cadastro e login por e-mail e senha, recuperação de senha, perfil e login com Google via Supabase Auth.
- **Acompanhamento:** favoritos, metas de leitura, histórico e estatísticas de atividade.
- **Gamificação:** pontos de experiência, níveis, conquistas e ranking.
- **Administração:** painel para gerenciar livros, PDFs, capas e categorias.
- **Preferências:** tema e opções do leitor, além de configurações de perfil.
- **PWA:** instalação em dispositivos compatíveis, cache do shell da aplicação e página de contingência offline.
- **Interface adaptável:** layout responsivo para desktop e dispositivos móveis.

## Páginas do aplicativo

| Página | Arquivo | Finalidade |
| --- | --- | --- |
| Login, cadastro e recuperação | `login.html`, `reset.html` | Acesso à conta e recuperação de senha |
| Biblioteca | `app.html` | Busca e navegação pelo catálogo |
| Livro e leitor | `book.html`, `reader.html` | Detalhes do livro e leitura de PDF |
| Progresso e conquistas | `game.html` | Metas, histórico, XP, conquistas e ranking |
| Perfil e preferências | `profile.html`, `settings.html` | Dados da conta e personalização |
| Administração | `admin.html` | Gestão do catálogo e categorias |
| Experiência offline | `offline.html` | Página exibida quando não há conexão |

## Tecnologias

- HTML, CSS e JavaScript no navegador, sem etapa de build obrigatória.
- [Supabase](https://supabase.com/) para autenticação, banco PostgreSQL, políticas RLS e armazenamento.
- Supabase Auth com e-mail/senha e OAuth Google.
- GSAP para animações e PDF.js para renderização de documentos PDF.
- Service Worker e Web App Manifest para os recursos PWA.

As dependências de interface são carregadas pelos endereços CDN indicados nos arquivos HTML; portanto, a primeira visita e recursos externos dependem de conexão com a internet.

## Executar localmente

Use um servidor HTTP local — não abra os arquivos diretamente com `file://`. O contexto seguro de `localhost` permite testar os recursos do PWA.

```bash
python3 -m http.server 8000
```

Abra [http://localhost:8000](http://localhost:8000). Para que login e recursos remotos funcionem, configure antes o Supabase conforme os passos abaixo.

## Configurar o Supabase

1. Crie um projeto no Supabase e copie a URL do projeto e a chave pública `anon`/`publishable`.
2. Preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` em `js/config.js`. Use apenas a chave pública no frontend; **nunca** publique uma chave `service_role` ou segredo de provedor no repositório.
3. No SQL Editor do Supabase, execute, em ordem, `sql/001_fase1.sql`, `sql/002_fase2.sql`, `sql/003_fase3.sql`, `sql/004_fase4.sql`, `sql/005_fase5.sql` e `sql/006_auditoria_integridade.sql`. A fase 6 é incremental: em bancos existentes, execute somente essa fase após conferir e preencher a contagem correta de páginas de cada livro publicado. Não derive esse dado do progresso antigo, pois era informado pelo cliente.
4. Configure os provedores de autenticação e URLs de redirecionamento. No fluxo de cadastro por e-mail, configure também confirmação e envio de e-mail no Supabase.
5. Para conceder acesso administrativo à própria conta, depois de criá-la, substitua `SEU@EMAIL` em `sql/promover_admin.sql` pelo e-mail correto e execute o comando conforme a política de acesso do seu projeto.

As políticas de segurança do banco (RLS) são essenciais: não as desative para contornar erros de acesso. Revise as políticas e permissões antes de inserir dados reais ou disponibilizar o projeto publicamente.

Livros publicados precisam ter `books.pages` preenchido com a contagem real do PDF. A migração 006 mostra os registros que precisam de revisão; até corrigir seus metadados, o leitor não gravará progresso nesses livros. Essa referência no catálogo permite ao servidor ignorar contagens arbitrárias enviadas pelo navegador.

### Testes de integração

O smoke test de RLS altera dados e, por segurança, recusa qualquer URL que não seja localhost. Execute-o apenas com uma conta e um livro descartáveis no Supabase local: instale `@supabase/supabase-js@2.45.4` temporariamente e defina `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `USER_EMAIL`, `USER_PASSWORD` e `TEST_BOOK_ID` antes de executar `node tests/rls-smoke.mjs`. Não use credenciais nem IDs de produção.

### Login com Google

O botão **Entrar com Google** está disponível nas telas de login e cadastro. Para habilitá-lo:

1. No Google Cloud Console, crie um cliente OAuth 2.0 do tipo **Aplicativo da Web**.
2. Em **URIs de redirecionamento autorizados** no Google, adicione a URL de callback informada na configuração do provedor Google no Supabase, normalmente `https://<PROJECT_REF>.supabase.co/auth/v1/callback`.
3. No Supabase, abra **Authentication → Providers → Google**, habilite o provedor e informe o Client ID e o Client Secret do Google.
4. Em **Authentication → URL Configuration**, configure o Site URL publicado e inclua nas URLs de redirecionamento permitidas a URL da página de login, por exemplo `https://seu-dominio/login.html`. Para desenvolvimento, inclua também `http://localhost:8000/login.html`.

O fluxo retorna à página de login e encaminha a sessão autenticada para a biblioteca. Erros devolvidos pelo provedor são apresentados ao usuário. O Client Secret deve permanecer apenas no painel do Supabase.

## Publicação e instalação PWA

Publique todos os arquivos do projeto em um host estático com **HTTPS**. Atualize as URLs autorizadas do Supabase para corresponder ao domínio de produção. O acesso à conta, ao catálogo e à sincronização exige conexão e backend configurado.

Em dispositivos compatíveis, abra o site publicado no navegador e use **Instalar app** ou **Adicionar à tela inicial**. No iOS, a instalação é feita pelo menu **Compartilhar → Adicionar à Tela de Início** no Safari.

O modo offline mantém o shell e a página de contingência disponíveis conforme o cache do navegador. Ele **não** substitui o Supabase e não garante acesso offline à conta, ao catálogo remoto, aos PDFs ou aos demais dados remotos.

## Estrutura do repositório

```text
.
├── admin.html, app.html, book.html, reader.html, ...  # páginas do app
├── assets/                                            # logo, capas e ícones
├── css/styles.css                                     # estilos e layout responsivo
├── js/                                                # autenticação, dados e páginas
├── sql/                                               # esquema, políticas e funções do banco
├── tests/                                             # verificações de segurança/integração
├── manifest.webmanifest                               # metadados PWA
└── sw.js                                              # cache do shell e fallback offline
```

## Segurança e operação

- Mantenha no cliente somente a URL do Supabase e a chave pública `anon`/`publishable`.
- Guarde Client Secrets e chaves administrativas em configurações seguras do serviço, nunca em arquivos servidos ao navegador.
- Ative e teste as políticas RLS antes de usar dados de usuários reais.
- Use HTTPS em produção para autenticação e instalação PWA.
- Disponibilidade de login social, confirmação de e-mail, armazenamento e dados depende das configurações do projeto Supabase.

## Licença

O repositório não especifica uma licença. Consulte o proprietário antes de redistribuir o código ou os materiais visuais.
