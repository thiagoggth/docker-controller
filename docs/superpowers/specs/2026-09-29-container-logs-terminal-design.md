# Logs e terminal interativo de contêineres

**Data:** 2026-09-29  
**Status:** Design aprovado em conversa; aguardando revisão do documento

## Contexto

O aplicativo já lista contêineres Docker, permite iniciar/parar contêineres e
abre credenciais por meio de uma ponte IPC entre o renderer e o processo
principal. As operações atuais usam respostas síncronas ou `invoke`, mas não há
um fluxo bidirecional de longa duração para dados de logs ou entrada de teclado.

## Objetivos

1. Permitir abrir os logs de qualquer contêiner e acompanhar novas linhas em
   tempo real, iniciando com as últimas 200 linhas.
2. Permitir abrir um terminal interativo embutido em contêineres em execução,
   usando `/bin/sh` como shell inicial.
3. Encerrar streams e sessões de forma determinística quando o usuário fechar o
   modal, quando o stream terminar ou quando a janela Electron for destruída.
4. Preservar os fluxos atuais de listagem e ações de contêineres.

## Fora do escopo

- Abrir terminal externo ou depender do executável Docker CLI.
- Seleção de shell ou execução de um comando arbitrário antes de abrir o shell.
- Iniciar automaticamente um contêiner parado para abrir o terminal.
- Exibir mais de um console ativo na UI ao mesmo tempo.
- Filtros, download e persistência de logs.

## Decisões de arquitetura

### Serviço de sessões no processo principal

Será criado um serviço de streaming específico para contêineres, separado do
repositório usado pelas ações start/stop. Ele manterá um mapa de sessões por
`sessionId`, com o tipo da sessão (`logs` ou `terminal`), o contêiner, o
`webContents` proprietário e os streams Dockerode associados.

O serviço será exposto por uma interface na camada de aplicação e terá uma
implementação Dockerode na camada de dados. O controller IPC será responsável
por adaptar chamadas Electron ao serviço, encaminhar eventos para o renderer e
validar que uma operação de sessão pertence ao `webContents` que a abriu.

### Logs

Ao iniciar uma sessão de logs, o serviço chamará a API de logs do contêiner com:

- `tail: 200`;
- `follow: true`;
- `timestamps: true`;
- stdout e stderr habilitados.

O serviço normalizará o stream multiplexado do Dockerode e enviará chunks de
texto ao renderer na ordem recebida. O renderer fará o append dos chunks,
manterá a área rolável e acompanhará automaticamente o final do conteúdo. Um
limite de memória será aplicado no renderer para descartar linhas antigas de
um contêiner muito ativo.

Logs podem ser abertos mesmo quando o contêiner está parado. Nesse caso, o
histórico será exibido e a sessão terminará naturalmente se não houver novas
linhas.

### Terminal

Ao iniciar uma sessão de terminal, o serviço verificará que o contêiner está
em execução e criará um Docker exec com:

- `Cmd: ['/bin/sh']`;
- stdin, stdout e stderr anexados;
- `Tty: true`.

O stream hijacked será bidirecional. O renderer enviará bytes/strings de entrada
do xterm, e o processo principal encaminhará a saída para eventos IPC. O
controller também encaminhará dimensões (`cols` e `rows`) para o exec quando o
terminal for redimensionado.

O botão Terminal ficará desabilitado para contêineres parados. O processo
principal repetirá a validação para evitar que uma chamada IPC manual contorne
essa regra. A ausência de `/bin/sh` ou qualquer falha na criação do exec será
reportada no modal.

## Contratos IPC

### Comandos

Serão adicionados canais para:

- `containers:logs:start` e `containers:logs:stop`;
- `containers:terminal:start`;
- `containers:terminal:input`, `containers:terminal:resize` e
  `containers:terminal:stop`.

As operações de início/parada retornarão `ApiResult` por `invoke`. Entrada e
redimensionamento usarão uma operação unidirecional `send` no preload para não
criar uma promessa por tecla digitada.

### Eventos

Serão adicionados eventos separados para dados, encerramento/saída e erros de
logs e terminal. Todo payload incluirá `sessionId`; chunks também incluirão
`data`, e erros incluirão uma mensagem pronta para apresentação.

O renderer registrará os listeners antes de iniciar uma sessão, evitando perder
chunks que possam chegar imediatamente após a criação do stream. Ao desmontar,
removerá listeners e solicitará o encerramento da sessão.

## Interface do renderer

Será criado um modal de console reutilizável, aberto em um modo por vez:

- **Logs:** cabeçalho com o nome do contêiner, estado da sessão e área
  monoespaçada rolável.
- **Terminal:** instância xterm com foco automático, suporte a cores e ajuste
  de dimensões.

Cada `ContainerTreeItem` terá ações `Logs` e `Terminal`; os callbacks serão
propagados por `ComposeGroupCard` e `ContainerList`. O estado do console ativo
ficará em `ContainersScreen`, enquanto cada modo gerenciará seu próprio ciclo de
vida de sessão. O modal terá botão de fechar acessível e encerrará a sessão ao
fechar.

Serão adicionadas as dependências `@xterm/xterm` e `@xterm/addon-fit` para o
terminal e o ajuste de dimensões.

## Erros e limpeza

Os seguintes casos serão tratados sem deixar uma sessão órfã:

- daemon Docker indisponível;
- contêiner inexistente;
- contêiner parado ao iniciar terminal;
- `/bin/sh` inexistente ou exec rejeitado;
- `sessionId` inexistente, de outro tipo ou pertencente a outro renderer;
- erro, `end` ou `close` do stream;
- destruição da janela principal.

Erros de início usarão o padrão `ApiResult` e o mapeamento de erros existente.
Será introduzido um erro de domínio específico para streaming de contêineres,
mapeado para preservar uma mensagem útil de falhas como shell ausente ou exec
rejeitado, em vez de convertê-las na mensagem genérica de erro inesperado.
Erros que ocorrerem depois do início serão enviados como eventos e farão a
sessão ser removida do mapa. O controller terá uma operação de encerramento de
todas as sessões usada durante o ciclo de vida do `App`.

## Arquivos e componentes previstos

- tipos DTO/eventos compartilhados e enumeração de canais IPC;
- interface de serviço de sessões e implementação Dockerode;
- controller e factory de streaming no processo principal;
- extensão tipada do preload com `send`;
- serviço/componentes do console no renderer;
- propagação de ações em `ContainerTreeItem`, `ComposeGroupCard`,
  `ContainerList` e `ContainersScreen`;
- dependências e lockfile do xterm.

## Validação e critérios de aceite

Executar `npm run lint`, `npm run typecheck` e `npm run build`. Fazer uma
verificação manual com Docker disponível cobrindo:

1. abrir logs de contêiner rodando e confirmar histórico, timestamps e novas
   linhas;
2. abrir logs de contêiner parado e confirmar que o histórico continua
   disponível;
3. abrir terminal de contêiner rodando, digitar comandos, usar teclas de
   edição/Ctrl+C e confirmar redimensionamento;
4. confirmar que Terminal fica desabilitado para contêiner parado;
5. fechar cada modal e confirmar que não há novos eventos nem sessão pendente;
6. desligar/indisponibilizar o Docker e confirmar mensagem de erro legível.

O comportamento existente de listar, iniciar, parar e abrir credenciais deve
continuar funcionando sem alteração de contrato.
