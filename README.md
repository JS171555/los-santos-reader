<div align="center">
  <img src="assets/logo-transparent.png" alt="Logo do Los Santos Reader" width="160">
  <h1>Los Santos Reader</h1>
  <p><strong>Sua biblioteca. Seu progresso. Seu ritmo.</strong></p>
  <p>Biblioteca digital com leitor de PDF, metas e conquistas, inspirada em Los Santos.</p>
  <p>
    <img src="https://img.shields.io/badge/JavaScript-ES6%2B-DCCAA3?style=flat-square&amp;labelColor=121212" alt="JavaScript ES6+">
    <img src="https://img.shields.io/badge/Supabase-Auth%20%7C%20Database%20%7C%20Storage-5C6B4A?style=flat-square&amp;labelColor=121212" alt="Supabase: Auth, Database e Storage">
    <img src="https://img.shields.io/badge/PWA-instal%C3%A1vel-8B5E3C?style=flat-square&amp;labelColor=121212" alt="PWA instalável">
  </p>
  <p>
    <a href="#recursos">Recursos</a> ·
    <a href="#executar-localmente">Execução local</a> ·
    <a href="#configuração">Configuração</a> ·
    <a href="#publicação-e-pwa">Publicação</a>
  </p>
</div>

O **Los Santos Reader** é um aplicativo web responsivo para organizar uma biblioteca, ler livros em PDF e acompanhar hábitos de leitura. Combina favoritos, marcadores e retomada de progresso com um sistema de XP, níveis e conquistas.

A aplicação usa HTML, CSS e JavaScript, com Supabase para autenticação, dados e arquivos. Funciona no navegador e pode ser instalada como **Progressive Web App (PWA)** em dispositivos compatíveis.

> **Estado do projeto:** os principais fluxos estão implementados. Uma instalação própria requer configurar o Supabase, aplicar os scripts SQL e definir as URLs de autenticação. O login com Google exige configuração adicional do provedor.

## Sumário

- [Recursos](#recursos)
- [Tecnologias](#tecnologias)
- [Executar localmente](#executar-localmente)
- [Configuração](#configuração)
- [Primeiro acesso e catálogo](#primeiro-acesso-e-catálogo)
- [Páginas do aplicativo](#páginas-do-aplicativo)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Testes de integração](#testes-de-integração)
- [Publicação e PWA](#publicação-e-pwa)
- [Solução de problemas](#solução-de-problemas)
- [Contribuição](#contribuição)
- [Licença](#licença)

## Recursos

| Área | Funcionalidades |
| --- | --- |
| **Biblioteca** | Busca por título ou autor, categorias, capas, detalhes e favoritos. |
| **Leitura** | Leitor PDF com navegação por páginas, zoom, ajuste à largura ou altura, tela cheia, marcadores e retomada do progresso. |
| **Conta** | Cadastro, login por e-mail e senha, recuperação de senha e login com Google via Supabase Auth. |
| **Progresso** | Metas diárias, histórico e estatísticas de atividade. |
| **Gamificação** | XP, níveis, conquistas, notificações e ranking. |
| **Perfil** | Avatar, preferências do leitor e controles de privacidade e participação no ranking. |
| **Administração** | Gestão de livros, PDFs, capas e categorias, com estatísticas do catálogo. |
| **PWA** | Instalação em dispositivos compatíveis, cache dos arquivos da interface e página de contingência offline. |

O layout se adapta a computadores e dispositivos móveis. No leitor, também é possível navegar com as teclas de direção, `Page Up`, `Page Down`, `Home` e `End`.

## Tecnologias

| Tecnologia | Uso no projeto |
| --- | --- |
| HTML5, CSS3 e JavaScript | Interface, navegação e lógica no navegador, sem etapa de build obrigatória. |
| [Supabase](https://supabase.com/) | Auth, banco PostgreSQL, políticas de acesso por linha (RLS) e Storage. |
| [PDF.js](https://mozilla.github.io/pdf.js/) | Renderização dos livros em PDF. |
| [GSAP](https://gsap.com/) | Animações da interface. |
| Service Worker e Web App Manifest | Cache da interface e instalação como PWA. |

As bibliotecas e os recursos visuais externos são carregados por CDN, conforme os endereços definidos nos arquivos HTML. A primeira visita depende de conexão com a internet.

## Executar localmente

### Pré-requisitos

- Git para clonar o repositório.
- Python 3 ou outro servidor de arquivos estáticos.
- Navegador atualizado e acesso a um projeto Supabase configurado.

Node.js e npm são necessários apenas para executar o teste de integração descrito adiante.

### Clonar e iniciar

```bash
git clone https://github.com/JS171555/los-santos-reader.git
cd los-santos-reader
python3 -m http.server 8000
```

Abra [http://localhost:8000](http://localhost:8000). A página inicial encaminha para `login.html`.

Sirva os arquivos por HTTP; abrir o HTML com `file://` não oferece o contexto necessário para o Service Worker. O endereço `localhost` permite testar recursos PWA durante o desenvolvimento.

Para usar contas, catálogo e sincronização, conclua a configuração abaixo.

## Configuração

### 1. Conectar ao Supabase

Crie um projeto no [Supabase](https://supabase.com/) e copie a URL e a chave pública. Em [`js/config.js`](js/config.js), substitua os valores existentes pelos da sua instalação:

```javascript
window.APP_CONFIG = {
  SUPABASE_URL: 'https://SEU-PROJETO.supabase.co',
  SUPABASE_ANON_KEY: 'SUA_CHAVE_PUBLICA'
};
```

O campo `SUPABASE_ANON_KEY` recebe a chave pública `publishable` ou a chave legada `anon`. O nome do campo é mantido por compatibilidade com o código.

**Use apenas a chave pública no frontend.** Chaves `service_role`, chaves secretas e o Client Secret do Google devem permanecer fora dos arquivos servidos ao navegador. A proteção dos dados depende das políticas RLS e das permissões do banco e do Storage.

### 2. Preparar o banco de dados

Em uma instalação nova, execute os arquivos abaixo no **SQL Editor** do Supabase, na ordem indicada:

| Ordem | Script | Conteúdo |
| --- | --- | --- |
| 1 | [`001_fase1.sql`](sql/001_fase1.sql) | Perfis, papéis de usuário e políticas de acesso. |
| 2 | [`002_fase2.sql`](sql/002_fase2.sql) | Livros, categorias, favoritos e buckets de capas e PDFs. |
| 3 | [`003_fase3.sql`](sql/003_fase3.sql) | Progresso, sessões e marcadores de leitura. |
| 4 | [`004_fase4.sql`](sql/004_fase4.sql) | XP, níveis, metas, conquistas, ranking e notificações. |
| 5 | [`005_fase5.sql`](sql/005_fase5.sql) | Preferências, avatares, atividade e ajustes de segurança. |
| 6 | [`006_auditoria_integridade.sql`](sql/006_auditoria_integridade.sql) | Integridade do progresso, limites de XP, privacidade e permissões. |

Os scripts criam as estruturas e políticas utilizadas pelo aplicativo, incluindo os buckets `covers`, `pdfs` e `avatars`.

**Para bancos existentes com as fases 001 a 005 já aplicadas:** confira a contagem real de páginas de todos os livros publicados e aplique apenas a fase 006 pendente. Não execute novamente os scripts anteriores.

O campo `books.pages` deve conter a quantidade real de páginas do PDF. A fase 006 lista livros publicados sem esse dado; enquanto o catálogo não for corrigido, o progresso desses livros não será salvo. Não use o progresso antigo para estimar a contagem: ele recebia esse valor do navegador.

### 3. Configurar autenticação e redirecionamentos

No Supabase, configure o provedor de e-mail, a confirmação de cadastro e o envio de mensagens conforme a sua instalação.

Em **Authentication → URL Configuration**, defina o **Site URL** e adicione as páginas usadas pelo aplicativo às URLs de redirecionamento permitidas:

| Ambiente | Site URL | URLs de redirecionamento |
| --- | --- | --- |
| Desenvolvimento | `http://localhost:8000` | `http://localhost:8000/login.html` e `http://localhost:8000/reset.html` |
| Produção | `https://seu-dominio` | `https://seu-dominio/login.html` e `https://seu-dominio/reset.html` |

A página `login.html` recebe os retornos de cadastro e login social; `reset.html` recebe o fluxo de recuperação de senha. Se publicar em um subdiretório, inclua esse caminho nas URLs.

Consulte a [documentação de redirecionamentos do Supabase](https://supabase.com/docs/guides/auth/redirect-urls) para ajustar as permissões ao ambiente.

### 4. Habilitar login com Google (opcional)

1. No Google Cloud Console, crie um cliente OAuth 2.0 do tipo **Aplicativo da Web**.
2. Nas **URIs de redirecionamento autorizados** do Google, adicione a URL de callback exibida pelo provedor Google no Supabase, normalmente `https://<PROJECT_REF>.supabase.co/auth/v1/callback`.
3. No Supabase, em **Authentication → Providers → Google**, habilite o provedor e informe o Client ID e o Client Secret.
4. Confirme que a URL de `login.html` está autorizada no Supabase, conforme a etapa anterior.

O callback do Google aponta para o Supabase; o retorno do aplicativo aponta para `login.html`. Após autenticar, o usuário é encaminhado à biblioteca.

Veja também o [guia oficial de login com Google](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Primeiro acesso e catálogo

1. Crie sua conta pelo aplicativo e confirme o e-mail, se essa opção estiver habilitada.
2. No SQL Editor, execute [`sql/promover_admin.sql`](sql/promover_admin.sql), substituindo `SEU@EMAIL` pelo e-mail da conta criada.
3. Acesse `admin.html` com essa conta e cadastre as categorias e os livros.
4. Envie o PDF e a capa, informe a contagem real de páginas e marque o livro como publicado.
5. Abra a biblioteca para conferir o livro e testar a leitura.

Os limites de upload definidos no projeto são:

| Arquivo | Formatos | Tamanho máximo |
| --- | --- | --- |
| Livro | PDF | 50 MB |
| Capa | JPG, PNG ou WebP | 5 MB |
| Avatar | JPG, PNG ou WebP | 2 MB |

Os PDFs ficam em um bucket privado; capas e avatares usam buckets públicos. Mantenha as políticas de acesso configuradas pelos scripts.

## Páginas do aplicativo

| Página | Arquivo | Finalidade |
| --- | --- | --- |
| Entrada | [`index.html`](index.html) | Redirecionamento para o login. |
| Autenticação | [`login.html`](login.html), [`reset.html`](reset.html) | Login, cadastro e recuperação de senha. |
| Biblioteca | [`app.html`](app.html) | Busca e navegação pelo catálogo. |
| Livro e leitor | [`book.html`](book.html), [`reader.html`](reader.html) | Detalhes do livro e leitura do PDF. |
| Progresso | [`game.html`](game.html) | Metas, histórico, conquistas, XP e ranking. |
| Perfil | [`profile.html`](profile.html), [`settings.html`](settings.html) | Dados da conta, privacidade e preferências. |
| Administração | [`admin.html`](admin.html) | Gestão do catálogo e categorias. |
| Offline | [`offline.html`](offline.html) | Página de contingência quando não há conexão. |

## Estrutura do repositório

```text
los-santos-reader/
├── assets/                    # Identidade visual e ícones PWA
├── css/
│   └── styles.css             # Estilos e layout responsivo
├── js/
│   ├── config.js              # Configuração pública do Supabase
│   ├── auth.js                # Autenticação e sessão
│   ├── data.js                # Acesso a dados e utilitários do catálogo
│   ├── pages/                 # Lógica de cada página
│   └── ...                    # Interface, navegação, recompensas e PWA
├── sql/                       # Esquema, políticas e funções do banco
├── tests/
│   └── rls-smoke.mjs           # Teste de integração em Supabase local
├── index.html                 # Entrada do aplicativo
├── *.html                     # Páginas do aplicativo
├── manifest.webmanifest       # Metadados de instalação
├── sw.js                      # Cache da interface e fallback offline
├── _headers                   # Cabeçalhos para hosts compatíveis
└── AUDITORIA_TECNICA.md        # Registro da auditoria técnica
```

## Testes de integração

O arquivo [`tests/rls-smoke.mjs`](tests/rls-smoke.mjs) verifica restrições de acesso, proteção de papéis e XP, privacidade do progresso e limites de salvamento.

**O teste grava dados e aceita apenas um Supabase local.** Prepare uma instância local descartável com os scripts SQL aplicados, uma conta de usuário comum e um livro publicado com `books.pages` válido. O servidor de arquivos em `localhost:8000` não substitui essa instância do Supabase.

Instale a dependência temporária na raiz do repositório:

```bash
npm install --no-save --package-lock=false @supabase/supabase-js@2.45.4
```

Defina as variáveis no ambiente do terminal e execute:

```bash
export SUPABASE_URL='http://127.0.0.1:54321'
export SUPABASE_ANON_KEY='CHAVE_PUBLICA_DO_SUPABASE_LOCAL'
export USER_EMAIL='leitor@example.com'
export USER_PASSWORD='SENHA_DA_CONTA_LOCAL'
export TEST_BOOK_ID='UUID_DO_LIVRO_LOCAL'

node tests/rls-smoke.mjs
```

Use a URL e a chave da sua instância local. Não use credenciais, usuários ou livros de produção. O teste retorna código `0` em caso de sucesso, `1` se uma verificação falhar e `2` para erros de configuração ou preparação.

## Publicação e PWA

Publique os arquivos estáticos em um host com **HTTPS**, preservando a estrutura de diretórios. Antes de disponibilizar a instalação:

- Configure `js/config.js` com o projeto Supabase correto.
- Confirme a aplicação dos scripts SQL e as políticas RLS e de Storage.
- Atualize o Site URL e os redirecionamentos de login e recuperação de senha para o domínio publicado.
- Verifique o suporte do host ao arquivo `_headers`; se necessário, configure os cabeçalhos no próprio serviço.
- Teste cadastro, login, recuperação de senha, abertura de PDF e salvamento de progresso.

### Instalar o aplicativo

Em um navegador compatível, abra o site e use **Instalar app** ou **Adicionar à tela inicial**. No iOS, utilize **Compartilhar → Adicionar à Tela de Início** no Safari.

### Funcionamento offline

O Service Worker mantém em cache os arquivos da interface e oferece uma página de contingência conforme o cache disponível no navegador.

**Autenticação, catálogo remoto, sincronização e acesso aos PDFs dependem de conexão e do Supabase configurado.** A instalação como PWA não garante leitura de livros offline.

## Solução de problemas

| Situação | O que verificar |
| --- | --- |
| Login ou catálogo não funciona | URL e chave pública em `js/config.js`, scripts SQL aplicados e conexão com o Supabase. |
| E-mail de confirmação não chega | Configuração do provedor de e-mail, confirmação de cadastro e envio de mensagens no Supabase. |
| Recuperação de senha retorna à página errada | Site URL e autorização da URL completa de `reset.html`. |
| Login com Google falha | Provedor habilitado, Client ID/Secret, callback do Google e URL de `login.html` autorizada no Supabase. |
| Livro não aparece na biblioteca | Estado de publicação, PDF enviado e permissões da conta. |
| Progresso não é salvo | Fase 006 aplicada e `books.pages` preenchido com a contagem real do PDF. |
| Opção de instalar não aparece | HTTPS ou `localhost`, suporte do navegador e registro do Service Worker. |

Não desative as políticas RLS para contornar falhas de acesso. Revise as permissões e a configuração da instalação.

## Contribuição

Para relatar um problema ou sugerir uma melhoria, [abra uma issue](https://github.com/JS171555/los-santos-reader/issues). Inclua os passos para reproduzir, o comportamento esperado e o navegador utilizado, sem compartilhar credenciais.

Para propor alterações, crie uma branch com um objetivo definido e envie um pull request descrevendo a mudança e como ela foi validada.

## Licença

O repositório ainda não especifica uma licença. Consulte o proprietário antes de redistribuir o código ou os materiais visuais.
