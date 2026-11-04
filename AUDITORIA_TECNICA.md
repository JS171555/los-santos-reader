# Auditoria técnica — Los Santos Reader

**Data:** 4 de novembro de 2026  
**Escopo:** revisão estática do repositório, correções locais e validação sem acesso ao projeto remoto do Supabase.

## Diagnóstico inicial

O projeto é uma aplicação estática em HTML, CSS e JavaScript, servida sem etapa de compilação. Usa Supabase JS para autenticação, Postgres/RLS e Storage, além de GSAP, PDF.js, Font Awesome, Google Fonts e um service worker/PWA. Os módulos são carregados diretamente pelas páginas HTML. O repositório tem migrações SQL manuais numeradas e um teste de integração que depende de usuário, livro e Supabase.

A auditoria identificou uma fronteira de confiança insuficiente no progresso de leitura, divergência entre a descrição do teto de XP e sua aplicação real, exposição de UUID estável de leitores com perfil privado, uma operação de categorias com resultados de erro ignorados, um teste que podia atingir qualquer URL Supabase e problemas de acessibilidade nos diálogos e rolagem. A biblioteca também parece carregar todo o catálogo de uma vez; sem dados de produção, isso é risco potencial, não gargalo medido.

## Correções implementadas

- **Integridade do progresso e do XP:** a nova migração `sql/006_auditoria_integridade.sql` faz o servidor usar `books.pages` como contagem canônica, em vez de confiar em `p_total` enviado pelo navegador; aplica o limite de 600 XP/dia também aos bônus diário, meta e conclusão; serializa salvamentos por usuário para que chamadas concorrentes não ultrapassem o teto; revoga execução anônima de RPCs privilegiadas; e oculta o UUID de terceiros com perfil privado no ranking.
- **Compatibilidade leitor/catálogo:** o leitor confere a contagem real do PDF contra o catálogo e interrompe a gravação de progresso quando os dados divergem. A publicação exige uma contagem válida entre 1 e 20.000 páginas. Isso fecha a possibilidade de concluir artificialmente um livro declarando `total_pages=1`.
- **Categorias e arquivos do administrador:** a atualização de categorias agora usa um RPC transacional que só permite administradores; falhas parciais são comunicadas claramente. A exclusão do livro ocorre antes da tentativa de remover arquivos do Storage, evitando apagar o arquivo de um livro cuja exclusão no banco falhou.
- **Teste de integração:** `tests/rls-smoke.mjs` agora bloqueia execução fora de localhost, exige uma conta/livro de teste e verifica a contagem canônica. A proteção evita que o teste altere dados de uma instância de produção por acidente.
- **Acessibilidade:** modais recebem nome acessível, foco inicial, contenção de Tab/Shift+Tab e restauração do foco; seleção de texto e indicadores de rolagem voltam a ficar disponíveis fora dos carrosséis. A hipótese sobre vírgulas na busca foi conferida: a sanitização já existia, então não houve alteração nesse trecho.
- **Segurança e cache:** `_headers` adiciona CSP, HSTS e diretivas para os CDNs/Supabase usados. O cache do service worker foi versionado para `v13`, forçando a atualização do shell nos clientes instalados.
- **Documentação:** o README explica a migração 006, os metadados obrigatórios e o uso seguro do smoke test.

## Arquivos alterados

`sql/006_auditoria_integridade.sql`, `js/pages/reader.js`, `js/pages/admin.js`, `js/ui.js`, `css/styles.css`, `tests/rls-smoke.mjs`, `sw.js`, `_headers`, `README.md` e este relatório.

Foi criado o ponto de restauração local `backup/pre-audit-20261104`, apontando para o commit anterior à auditoria.

## Testes e validação executados

- `node --check` em todos os módulos JavaScript e no smoke test: **passou**.
- `git diff --check`: **passou**.
- Parsing de páginas HTML e verificação de referências locais de recursos HTML/PWA: **passou**.
- Chromium headless com cabeçalhos locais: login carregou sem erros de console em viewport desktop (1365 px) e mobile (390 px); foco inicial, ciclo de Tab/Shift+Tab, Escape e restauração de foco do modal: **passaram**.
- Migrações SQL e smoke test Supabase: **não executados**. O ambiente não tem fixture local/credenciais de teste nem pacote do cliente instalado; não acessei nem modifiquei o Supabase remoto. A migração precisa ser revisada e aplicada pelo proprietário no ambiente correto.

## Pontos que ainda precisam de atenção

1. Antes de aplicar a fase 6 em banco existente, confira os livros publicados sem `books.pages` e preencha a contagem **real** do PDF. A migração lista esses livros. Registros legados sem contagem continuam visíveis, mas o leitor não gravará progresso até que sejam corrigidos. Não use `reading_progress.total_pages` antigo como fonte confiável.
2. O tempo ativo ainda é informado pelo cliente e limitado a 120 segundos por chamada; isso reduz abuso casual, mas não prova leitura humana contra um cliente deliberadamente manipulado. Uma validação forte exigiria controle temporal/sessões no servidor e eventual análise de abuso.
3. Uploads são limitados por tamanho/MIME declarado, mas não passam por validação de assinatura do arquivo, regravação de imagens ou análise de PDF no servidor. Para conteúdo não confiável, considere uma Edge Function/pipeline de validação.
4. A CSP foi construída a partir das origens encontradas no código. Deve ser exercitada no host real, inclusive login Google, imagens do Storage e PDF.js. `style-src 'unsafe-inline'` permanece necessário pelo uso atual de estilos inline; scripts inline não foram liberados.
5. Scripts externos continuam dependentes de CDN e não têm SRI. Hospedar versões locais ou adicionar Subresource Integrity após fixar os bytes das dependências reduziria a cadeia de confiança externa.
6. As migrações iniciais 001–005 são manuais e não idempotentes. A fase 006 também é uma migração de execução única. Recomenda-se adotar versionamento/aplicação automatizada em ambiente de staging antes de produção.
7. Não há medição de catálogo real nem benchmark; paginação/virtualização da biblioteca só deve ser priorizada se o volume ou métricas confirmarem o custo. `js/pages/app.js` aparenta não ser carregado por nenhuma página; foi mantido para não apagar código possivelmente legado sem confirmação.

## Recomendações de publicação

Aplicar a migração primeiro em staging, preencher os metadados listados e validar login, upload, publicação, leitura, concessão de XP, ranking privado e operação administrativa. Depois repetir no banco de produção, monitorar CSP no console e confirmar a atualização do service worker em desktop/iOS/Android. Não execute o smoke test em produção.
