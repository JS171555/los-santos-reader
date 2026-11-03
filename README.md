<div align="center">
  <img src="assets/pwa/icon-512.png" alt="Ícone do Los Santos Reader" width="160" height="160">
  <h1>Los Santos Reader</h1>
  <p><strong>Biblioteca digital para ler, acompanhar seu progresso e evoluir no seu ritmo.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/status-em%20desenvolvimento-5C6B4A?style=flat-square" alt="Status: em desenvolvimento">
    <img src="https://img.shields.io/badge/PWA-instal%C3%A1vel-DCCAA3?style=flat-square&labelColor=121212" alt="PWA instalável">
    <img src="https://img.shields.io/badge/idioma-pt--BR-8B5E3C?style=flat-square" alt="Idioma: português do Brasil">
  </p>
</div>

O **Los Santos Reader** é uma aplicação web de leitura com uma interface escura inspirada em Los Santos. O projeto está em desenvolvimento e reúne biblioteca, leitor de páginas, conta de usuário e recursos de acompanhamento de leitura. Também pode ser instalado como aplicativo (PWA) em dispositivos compatíveis.

## Recursos

- Biblioteca com busca e navegação por categorias.
- Leitor de livros em PDF, com controles de página, zoom, ajuste de visualização e tela cheia.
- Marcadores de página e acompanhamento do progresso de leitura.
- Cadastro, autenticação, perfil e configurações de conta.
- Recursos de metas, recompensas e ranking.
- Área administrativa para gerenciar o catálogo.
- PWA instalável, com cache dos arquivos principais da interface e página de contingência offline.

> O acesso à conta, ao catálogo remoto, aos arquivos armazenados e à sincronização depende de conexão com a internet e da configuração do Supabase. O modo offline mantém a estrutura principal do aplicativo disponível quando os arquivos já foram armazenados no dispositivo; não substitui o backend nem garante acesso offline a livros ou dados remotos.

## Instalação como aplicativo

O aplicativo precisa estar publicado em **HTTPS** para que a instalação e o service worker funcionem fora de `localhost`. Após abrir o endereço publicado no navegador compatível, use a opção de instalação indicada abaixo. O nome dos menus pode variar conforme a versão do navegador e do sistema.

### Android

1. Abra o endereço do Los Santos Reader no Chrome.
2. Abra o menu do navegador e escolha **Instalar app** ou **Adicionar à tela inicial**.
3. Confirme. O ícone do Los Santos Reader será adicionado ao dispositivo.

### iPhone e iPad

1. Abra o endereço no Safari.
2. Toque em **Compartilhar**.
3. Escolha **Adicionar à Tela de Início** e confirme.

No iOS, a instalação é feita pelo menu de compartilhamento do Safari; a experiência e os recursos offline são definidos pelo próprio sistema.

### Windows

1. Abra o endereço no Microsoft Edge ou em outro navegador Chromium compatível.
2. Selecione **Instalar Los Santos Reader** na barra de endereço ou no menu do navegador.
3. Confirme a instalação para abrir o app em uma janela própria.

## Execução local

Como o PWA depende de um contexto seguro, use `localhost` em vez de abrir os arquivos diretamente com `file://`.

```bash
python3 -m http.server 8000
```

Depois, acesse `http://localhost:8000` no navegador.

## Configuração do Supabase

A configuração da aplicação fica em `js/config.js` e utiliza a URL do projeto e uma chave pública (`anon`/`publishable`). Nunca coloque uma chave `service_role` no código do cliente. Para uma instalação própria, configure também as tabelas, políticas de segurança (RLS), autenticação e armazenamento conforme os scripts SQL em `sql/`.

## Estrutura do projeto

```text
.
├── assets/          # Capas e recursos visuais
│   └── pwa/         # Ícones para PWA, iOS e Windows
├── css/             # Estilos da aplicação
├── js/              # Autenticação, dados e páginas
├── sql/             # Migrações e políticas do banco
├── tests/           # Testes de segurança e integração
├── manifest.webmanifest
├── sw.js            # Cache do shell e fallback offline
└── *.html           # Páginas da aplicação
```

## Compatibilidade e observações

- A instalação PWA requer HTTPS em produção; `localhost` é aceito para desenvolvimento.
- O service worker armazena arquivos locais do shell e aplica fallback para a página offline. Dados e conteúdo remoto não são replicados pelo cache.
- O conteúdo de livros e PDFs pode depender da rede e dos serviços configurados; a disponibilidade offline de conteúdo remoto não é garantida.
- O projeto está em desenvolvimento. Alguns recursos podem mudar.

## Licença

Nenhuma licença foi especificada no repositório. Consulte o proprietário antes de redistribuir ou reutilizar o código e os materiais do projeto.
