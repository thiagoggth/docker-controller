# Logs e Terminal de Contêineres Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar acompanhamento de logs e um terminal `/bin/sh` interativo, embutidos no renderer e sustentados por sessões Dockerode bidirecionais no processo principal.

**Architecture:** Um `IContainerStreamService` gerenciará sessões identificadas por `sessionId`; sua implementação Dockerode abrirá logs seguidos ou execs TTY e encerrará os streams. Um `ContainerStreamController` adaptará essas sessões para IPC assíncrono, vinculando cada sessão ao `webContents` proprietário. Um modal renderer reutilizável exibirá logs ou xterm e propagará as ações desde a lista de contêineres.

**Tech Stack:** Electron IPC, React 19, TypeScript, Dockerode, `@xterm/xterm`, `@xterm/addon-fit`, Zustand existente e Vitest para testes unitários do serviço/infraestrutura.

**Spec:** `docs/superpowers/specs/2026-09-29-container-logs-terminal-design.md`

## Global Constraints

- Logs devem iniciar com `tail: 200`, `follow: true`, `timestamps: true`, stdout e stderr habilitados.
- O terminal deve usar `/bin/sh`, `Tty: true` e stdin/stdout/stderr anexados.
- O terminal não inicia contêiner parado; a ação deve ficar desabilitada na UI e ser validada novamente no processo principal.
- Não usar Docker CLI, terminal externo, seleção de shell, filtros/download/persistência de logs ou mais de um console ativo na UI.
- Todo evento de stream carrega `sessionId`; entrada e resize usam `send` unidirecional e início/parada usam `invoke` com `ApiResult`.
- Sessões devem ser encerradas ao fechar o modal, terminar/falhar o stream ou destruir a janela principal.
- Preservar os contratos atuais de listar, iniciar, parar e abrir credenciais.
- Executar `npm run lint`, `npm run typecheck` e `npm run build` antes da conclusão; não adicionar artefatos de `dist`, `out` ou dependências geradas.

## Review Focus

- **Stream Docker multiplexado/TTY:** stdout e stderr de logs devem chegar como texto combinado, sem cabeçalhos binários; terminal TTY deve preservar bytes de controle e cores. Testar em `DockerodeContainerStreamService.test.ts`.
- **Estado do contêiner:** terminal em contêiner parado deve falhar com erro específico e contêiner inexistente deve seguir o mapeamento de erro existente. Testar no serviço e no controller.
- **Isolamento de sessões:** um `sessionId` de outro `webContents`, de outro tipo ou já encerrado não pode receber input/resize nem parar uma sessão alheia. Testar em `ContainerStreamController.test.ts`.
- **Race de desmontagem:** se o modal desmontar antes de `start` resolver, a sessão que chegar depois deve ser imediatamente encerrada e não pode deixar listeners ativos. Testar o helper/ciclo de vida renderer e validar manualmente no modal.
- **Backpressure/memória:** chunks parciais e logs muito grandes devem manter somente as últimas 10.000 linhas sem quebrar o conteúdo exibido. Testar `logBuffer.test.ts`.

---

## Mapa de arquivos e responsabilidades

### Processo principal e tipos compartilhados

- **Create:** `src/main/shared/types/ContainerStreamTypes.ts` — inputs IPC, payloads de sessão, dados, erros e resize.
- **Modify:** `src/main/shared/enums/IPCChannels.ts` — canais de comando e eventos de logs/terminal.
- **Create:** `src/main/application/services/IContainerStreamService.ts` — interface agnóstica ao Electron para iniciar, escrever, redimensionar, parar e fechar sessões.
- **Create:** `src/main/domain/errors/ContainerNotRunningError.ts` — erro para terminal em contêiner parado.
- **Create:** `src/main/domain/errors/ContainerStreamError.ts` — erro de streaming/exec com mensagem preservada.
- **Modify:** `src/main/controllers/errorMapper.ts` — mapear os novos erros para `Report` útil.
- **Create:** `src/main/data/services/DockerodeContainerStreamService.ts` — implementação Dockerode e mapa de streams.
- **Create:** `src/main/controllers/ContainerStreamController.ts` — handlers IPC, ownership por `webContents` e eventos assíncronos.
- **Create:** `src/main/factories/controllers/containerStreamControllerFactory.ts` — composição do controller com o serviço.
- **Modify:** `src/main/App.ts` — registrar o controller e encerrar todas as sessões ao destruir a janela.

### Preload

- **Modify:** `src/preload/types.ts` — expor `send` tipado além de `sendSync`, `invoke` e `on`.
- **Modify:** `src/preload/index.ts` — implementar `ipcRenderer.send` na ponte existente.

### Renderer

- **Create:** `src/renderer/src/services/containerStreamService.ts` — wrapper tipado dos comandos IPC.
- **Create:** `src/renderer/src/services/containerStreamLifecycle.ts` — resolver início de sessão e encerrar sessões que resolvem após desmontagem.
- **Create:** `src/renderer/src/services/containerStreamLifecycle.test.ts` — teste do race de desmontagem.
- **Create:** `src/renderer/src/components/ContainerConsoleModal/logBuffer.ts` — append limitado às últimas 10.000 linhas.
- **Create:** `src/renderer/src/components/ContainerConsoleModal/logBuffer.test.ts` — testes unitários do limite e chunks parciais.
- **Create:** `src/renderer/src/components/ContainerConsoleModal/ContainerLogsPanel.tsx` — listeners, histórico, acompanhamento e estado de erro.
- **Create:** `src/renderer/src/components/ContainerConsoleModal/ContainerTerminalPanel.tsx` — ciclo de vida do xterm, input e resize.
- **Create:** `src/renderer/src/components/ContainerConsoleModal/ContainerConsoleModal.tsx` — shell do modal e seleção do modo.
- **Modify:** `src/renderer/src/components/ContainerTreeItem/ContainerTreeItem.tsx` — botões Logs/Terminal e Terminal desabilitado quando parado.
- **Modify:** `src/renderer/src/components/ComposeGroupCard/ComposeGroupCard.tsx` — propagar callbacks para itens Compose.
- **Modify:** `src/renderer/src/components/ContainerList/ContainerList.tsx` — aceitar/propagar callbacks de console.
- **Modify:** `src/renderer/src/screens/ContainersScreen/ContainersScreen.tsx` — estado do console ativo e renderização do modal.
- **Modify:** `package.json`, `package-lock.json`, `vitest.config.ts` — dependências/scripts de xterm e testes.

## Task 1: Contratos compartilhados, erros e harness de testes

**Files:**
- Create: `src/main/shared/types/ContainerStreamTypes.ts`
- Modify: `src/main/shared/enums/IPCChannels.ts`
- Create: `src/main/application/services/IContainerStreamService.ts`
- Create: `src/main/domain/errors/ContainerNotRunningError.ts`
- Create: `src/main/domain/errors/ContainerStreamError.ts`
- Modify: `src/main/controllers/errorMapper.ts`
- Create: `vitest.config.ts`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces `ContainerStreamType = 'logs' | 'terminal'`.
- Produces `ContainerStreamSessionDTO = { sessionId: string }`.
- Produces `ContainerStreamDataDTO = { sessionId: string; data: string }`.
- Produces `ContainerStreamErrorDTO = { sessionId: string; message: string }`.
- Produces `StartContainerLogsInput = { id: string }`.
- Produces `StartContainerTerminalInput = { id: string; cols: number; rows: number }`.
- Produces `ContainerTerminalInput = { sessionId: string; data: string }`.
- Produces `ContainerTerminalResizeInput = { sessionId: string; cols: number; rows: number }`.
- Produces `StopContainerStreamInput = { sessionId: string }`.
- Produces `IContainerStreamService` with:
  `startLogs(sessionId: string, containerId: string, callbacks: ContainerStreamCallbacks): Promise<void>`,
  `startTerminal(sessionId: string, containerId: string, cols: number, rows: number, callbacks: ContainerStreamCallbacks): Promise<void>`,
  `writeTerminal(sessionId: string, data: string): void`,
  `resizeTerminal(sessionId: string, cols: number, rows: number): Promise<void>`,
  `stop(sessionId: string): Promise<void>` and `closeAll(): Promise<void>`.

- [ ] **Step 1: Add the test runner configuration before production code.**

  Add `vitest` as a dev dependency, a `test` script using `vitest run`, and a
  `vitest.config.ts` with Node environment, `src/**/*.test.ts` inclusion,
  `passWithNoTests: true` and aliases matching `@core`, `@gui` and `@preload`.

- [ ] **Step 2: Define the shared channel names and payload types.**

  Add command channels `CONTAINERS_LOGS_START`, `CONTAINERS_LOGS_STOP`,
  `CONTAINERS_TERMINAL_START`, `CONTAINERS_TERMINAL_INPUT`,
  `CONTAINERS_TERMINAL_RESIZE` and `CONTAINERS_TERMINAL_STOP`. Add event channels
  for logs `DATA`, `ENDED`, `ERROR` and terminal `DATA`, `EXIT`, `ERROR`.
  Keep the existing channel values unchanged.

- [ ] **Step 3: Define domain errors and map them.**

  `ContainerNotRunningError(containerId)` must produce a clear message naming
  the container. `ContainerStreamError(message)` must preserve the underlying
  stream/exec message. Extend `mapErrorToReports` with `container` for the
  stopped error and `container-stream` for the streaming error.

- [ ] **Step 4: Define the service interface and callbacks.**

  `ContainerStreamCallbacks` must expose `onData(data: string)`,
  `onClose()`, and `onError(error: Error)`. Keep Electron and BrowserWindow
  types out of this interface so the Dockerode service can be unit tested with
  fakes.

- [ ] **Step 5: Run the type and test harness checks.**

  Run: `npm run typecheck && npm run test`

  Expected: TypeScript succeeds and Vitest exits successfully while no test
  files exist yet because `passWithNoTests` is enabled.

- [ ] **Step 6: Commit the contracts.**

  ```bash
  git add package.json package-lock.json vitest.config.ts src/main/shared/types/ContainerStreamTypes.ts src/main/shared/enums/IPCChannels.ts src/main/application/services/IContainerStreamService.ts src/main/domain/errors/ContainerNotRunningError.ts src/main/domain/errors/ContainerStreamError.ts src/main/controllers/errorMapper.ts
  git commit -m "feat: adiciona contratos de streaming de containers"
  ```

## Task 2: Serviço Dockerode de sessões

**Files:**
- Create: `src/main/data/services/DockerodeContainerStreamService.ts`
- Create: `src/main/data/services/DockerodeContainerStreamService.test.ts`

**Interfaces:**
- Consumes `IContainerStreamService`, `DockerodeService.getDocker()` and the
  shared callbacks/types from Task 1.
- Produces a session implementation that owns each `Readable`/`Duplex` stream,
  removes it exactly once, and calls callbacks without importing Electron.

- [ ] **Step 1: Write failing tests for log session creation and options.**

  Use a fake Docker client/container and fake stream to assert that
  `startLogs('logs-1', 'container-1', callbacks)` calls `container.logs` with
  exactly `{ stdout: true, stderr: true, follow: true, tail: 200, timestamps: true }`,
  emits data through `callbacks.onData`, and calls `callbacks.onClose` only once
  when the stream ends.

- [ ] **Step 2: Add the multiplexed log assertion.**

  Feed stdout and stderr Docker frames through the fake modem and assert that
  both payloads are forwarded as text without the eight-byte Docker frame
  header. Use a single ordered output sink for stdout and stderr so arrival
  order is retained. Include a raw/TTY stream case that forwards ANSI bytes
  unchanged.

- [ ] **Step 3: Write failing tests for terminal lifecycle and controls.**

  Assert that `startTerminal('term-1', 'container-1', 80, 24, callbacks)` calls
  `container.exec` with `Cmd: ['/bin/sh']`, all Attach flags true and `Tty: true`,
  starts with `{ hijack: true, stdin: true }`, and requests `{ h: 24, w: 80 }`.
  Assert that `writeTerminal('term-1', 'ls\n')` writes to the hijacked stream
  and `resizeTerminal('term-1', 120, 40)` calls `exec.resize({ h: 40, w: 120 })`.

- [ ] **Step 4: Write failing tests for rejection and cleanup.**

  Assert that a stopped container throws `ContainerNotRunningError`, a missing
  Docker container becomes `ContainerNotFoundError`, invalid session IDs throw
  `ContainerStreamError`, stream errors call `onError` and remove the session,
  and `stop`/`closeAll` destroy or close every active stream exactly once.

- [ ] **Step 5: Run the focused tests to verify failure.**

  Run: `npm run test -- src/main/data/services/DockerodeContainerStreamService.test.ts`

  Expected: FAIL because the service implementation is not present.

- [ ] **Step 6: Implement `DockerodeContainerStreamService`.**

  Keep `Map<string, ContainerStreamSession>` private. Generate no IDs inside
  the service; the controller owns ID generation so callbacks can include the
  ID before any stream data arrives. For logs, use the Dockerode modem to
  demultiplex non-TTY frames into one ordered writable sink and bypass
  demultiplexing for a TTY/raw log stream. For terminal, inspect state first,
  create the `/bin/sh` exec, start the hijacked duplex stream, and bind data,
  end, close and error handlers through an idempotent finalizer.

- [ ] **Step 7: Run the focused tests to verify success.**

  Run: `npm run test -- src/main/data/services/DockerodeContainerStreamService.test.ts`

  Expected: All service tests PASS, including no duplicate close/error callback
  and no active sessions after cleanup.

- [ ] **Step 8: Commit the Dockerode service.**

  ```bash
  git add src/main/data/services/DockerodeContainerStreamService.ts src/main/data/services/DockerodeContainerStreamService.test.ts
  git commit -m "feat: implementa sessoes Dockerode de logs e terminal"
  ```

## Task 3: Controller IPC, preload e integração do ciclo de vida

**Files:**
- Create: `src/main/controllers/ContainerStreamController.ts`
- Create: `src/main/controllers/ContainerStreamController.test.ts`
- Create: `src/main/factories/controllers/containerStreamControllerFactory.ts`
- Modify: `src/preload/types.ts`, `src/preload/index.ts`
- Modify: `src/main/App.ts`

**Interfaces:**
- Consumes `IContainerStreamService` and shared IPC types from Tasks 1–2.
- Produces `ContainerStreamController.register(): void` and
  `ContainerStreamController.closeAll(): Promise<void>`.
- Produces renderer-facing `window.api.send(channel, data): void`.

- [ ] **Step 1: Write failing controller tests for start and event forwarding.**

  Inject a fake IPC registrar and fake `IContainerStreamService`. Assert that
  logs start returns `ApiResult<{ sessionId: string }>`; data is sent through
  `CONTAINERS_LOGS_DATA` with the correct session ID; close sends
  `CONTAINERS_LOGS_ENDED`; and terminal start forwards terminal data, exit and
  error events to the invoking sender.

- [ ] **Step 2: Write failing ownership and cleanup tests.**

  Assert that a second sender cannot stop, write to, or resize the first
  sender's active session; invoke-based ownership/type mismatches return a
  failed `ApiResult`, one-way input/resize mismatches emit a terminal error,
  stopping an active session removes ownership, stopping an already-ended
  session owned by the sender is a no-op, `closeAll` delegates to the service
  and clears ownership, and a start failure removes the provisional record.

- [ ] **Step 3: Run controller tests to verify failure.**

  Run: `npm run test -- src/main/controllers/ContainerStreamController.test.ts`

  Expected: FAIL because the controller and preload additions are not present.

- [ ] **Step 4: Implement `ContainerStreamController`.**

  Register `ipcMain.handle` for start/stop commands and `ipcMain.on` for
  terminal input/resize. Generate `randomUUID()` before calling the service,
  store `{ senderId, type }`, and pass callbacks that emit typed events. Use
  `mapErrorToReports` for invoke failures. Make stop idempotent for an already
  ended session (an unknown session is a no-op because it cannot affect another
  active session), but reject active ownership mismatches. Convert input/resize
  failures into the corresponding terminal error event because
  those commands are one-way.

- [ ] **Step 5: Add factory and app cleanup.**

  Create the factory around `DockerodeContainerStreamService`, register it once
  in `App.registerEvents`, retain the controller on `App`, and call
  `void controller.closeAll()` before the existing window destruction path.
  Preserve all existing controller registrations and reconnect behavior.

- [ ] **Step 6: Add typed preload `send`.**

  Extend `IApi` with `send(channel: E_IPCChannels, data: unknown): void` and
  expose `ipcRenderer.send(channel, data)` through the same context-isolated
  bridge. Do not change the error behavior of `sendSync` or `invoke`.

- [ ] **Step 7: Run controller tests and project checks.**

  Run: `npm run test -- src/main/controllers/ContainerStreamController.test.ts && npm run typecheck`

  Expected: Controller tests PASS and both Node/web TypeScript projects typecheck.

- [ ] **Step 8: Commit the IPC layer.**

  ```bash
  git add src/main/controllers/ContainerStreamController.ts src/main/controllers/ContainerStreamController.test.ts src/main/factories/controllers/containerStreamControllerFactory.ts src/main/App.ts src/preload/types.ts src/preload/index.ts
  git commit -m "feat: expõe streaming de containers por IPC"
  ```

## Task 4: Serviço renderer, buffer de logs e modal de logs

**Files:**
- Create: `src/renderer/src/services/containerStreamService.ts`
- Create: `src/renderer/src/services/containerStreamLifecycle.ts`
- Create: `src/renderer/src/services/containerStreamLifecycle.test.ts`
- Create: `src/renderer/src/components/ContainerConsoleModal/logBuffer.ts`
- Create: `src/renderer/src/components/ContainerConsoleModal/logBuffer.test.ts`
- Create: `src/renderer/src/components/ContainerConsoleModal/ContainerLogsPanel.tsx`
- Create: `src/renderer/src/components/ContainerConsoleModal/ContainerConsoleModal.tsx`

**Interfaces:**
- Consumes the IPC channels and `window.api` contract from Task 3.
- Produces `appendLogChunk(current: string, chunk: string, maxLines = 10_000): string`.
- Produces `resolveStartedSession(start: Promise<ContainerStreamSessionDTO>, isDisposed: () => boolean, stop: (sessionId: string) => Promise<void>): Promise<string | null>`.
- Produces a console modal accepting `{ container: ContainerDTO; mode: 'logs' | 'terminal'; onClose: () => void }`; the terminal mode is wired in Task 5.

- [ ] **Step 1: Write failing log-buffer tests.**

  Assert that `appendLogChunk('', 'one\n')` preserves the chunk, chunks split
  across calls are concatenated without losing text, and a buffer above 10.000
  lines retains exactly the newest 10.000 lines.

- [ ] **Step 2: Run the focused test to verify failure.**

  Run: `npm run test -- src/renderer/src/components/ContainerConsoleModal/logBuffer.test.ts`

  Expected: FAIL because `logBuffer.ts` is not present.

- [ ] **Step 3: Implement the typed renderer service and log buffer.**

  Wrap `window.api.invoke` for `startLogs`, `stopLogs`, `startTerminal`, and
  `stopTerminal`; wrap `window.api.send` for terminal input and resize. Keep
  channel selection out of visual components. Implement the 10.000-line cap
  while preserving the newest partial line content.

- [ ] **Step 4: Write and run the failing lifecycle test.**

  Assert that a normally resolved session returns its ID without stopping, and
  that a session resolving after `isDisposed()` becomes true calls `stop` with
  the returned ID and resolves to `null`.

  Run: `npm run test -- src/renderer/src/services/containerStreamLifecycle.test.ts`

  Expected: FAIL until `resolveStartedSession` is implemented.

- [ ] **Step 5: Implement `containerStreamLifecycle` and `ContainerLogsPanel`.**

  Implement `resolveStartedSession` and use it in the panel. Register
  `CONTAINERS_LOGS_DATA`, `CONTAINERS_LOGS_ENDED` and
  `CONTAINERS_LOGS_ERROR` listeners before invoking `startLogs`. Filter every
  event by the active session ID, append through `appendLogChunk`, auto-scroll
  the `<pre>` area, show loading/ended/error status, and stop/remove listeners
  on cleanup. If start resolves after unmount, immediately stop the returned
  session to cover the StrictMode/unmount race.

- [ ] **Step 6: Implement the modal shell in logs mode.**

  Use the existing DaisyUI/Tailwind visual language, `role="dialog"`, an
  accessible close button, container name in the header and a fixed-height
  monospaced scroll area. Render `ContainerLogsPanel` for `mode === 'logs'` and
  leave the terminal branch as the component boundary consumed by Task 5.

- [ ] **Step 7: Run buffer/lifecycle tests and typecheck.**

  Run: `npm run test -- src/renderer/src/components/ContainerConsoleModal/logBuffer.test.ts src/renderer/src/services/containerStreamLifecycle.test.ts && npm run typecheck`

  Expected: Buffer tests PASS and the new renderer files typecheck.

- [ ] **Step 8: Commit logs renderer.**

  ```bash
  git add src/renderer/src/services/containerStreamService.ts src/renderer/src/services/containerStreamLifecycle.ts src/renderer/src/services/containerStreamLifecycle.test.ts src/renderer/src/components/ContainerConsoleModal
  git commit -m "feat: adiciona visualizacao de logs dos containers"
  ```

## Task 5: Terminal xterm e integração na lista

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/renderer/src/components/ContainerConsoleModal/ContainerTerminalPanel.tsx`
- Modify: `src/renderer/src/components/ContainerConsoleModal/ContainerConsoleModal.tsx`
- Modify: `src/renderer/src/components/ContainerTreeItem/ContainerTreeItem.tsx`
- Modify: `src/renderer/src/components/ComposeGroupCard/ComposeGroupCard.tsx`
- Modify: `src/renderer/src/components/ContainerList/ContainerList.tsx`
- Modify: `src/renderer/src/screens/ContainersScreen/ContainersScreen.tsx`

**Interfaces:**
- Consumes `containerStreamService`, shared terminal event types and modal shell
  from Tasks 3–4.
- Produces a fully interactive terminal mode and list callbacks
  `onOpenLogs(container: ContainerDTO): void` and
  `onOpenTerminal(container: ContainerDTO): void`.

- [ ] **Step 1: Add xterm dependencies from the approved design.**

  Install `@xterm/xterm` and `@xterm/addon-fit` as runtime dependencies. Keep
  their CSS import in the terminal component or renderer entrypoint so the
  terminal viewport and cursor render correctly.

- [ ] **Step 2: Implement `ContainerTerminalPanel`.**

  Create `Terminal` and `FitAddon`, load the addon, open the terminal in a
  ref-backed element, fit it, and subscribe to `terminal.onData`. Register
  `CONTAINERS_TERMINAL_DATA`, `CONTAINERS_TERMINAL_EXIT` and
  `CONTAINERS_TERMINAL_ERROR` before invoking `startTerminal` with the initial
  `cols`/`rows`. Send input only after a live session ID exists, send resize on
  `ResizeObserver`, fit after resize, focus the terminal, and dispose terminal,
  addon/listeners and the session on cleanup. If start resolves after cleanup,
  stop that returned session immediately.

- [ ] **Step 3: Complete the modal terminal branch.**

  Render `ContainerTerminalPanel` for `mode === 'terminal'`, pass the container
  identity and close callback, and show an inline error/exit status without
  swallowing the close action.

- [ ] **Step 4: Write the list integration.**

  Add `onOpenLogs` and `onOpenTerminal` props through `ContainerList` and
  `ComposeGroupCard` to `ContainerTreeItem`. Add Logs and Terminal buttons that
  stop event propagation; set `disabled={!isRunning}` on Terminal and include
  accessible labels/titles. Keep start/stop and credentials behavior unchanged.

- [ ] **Step 5: Wire active console state in `ContainersScreen`.**

  Store `{ container, mode } | null`, open the modal from list callbacks, close
  it through `onClose`, and render it alongside the existing credential modal.
  Ensure opening one console replaces the previous UI target rather than
  creating simultaneous consoles.

- [ ] **Step 6: Run renderer and package checks.**

  Run: `npm run typecheck && npm run lint`

  Expected: both TypeScript projects and ESLint pass with the xterm imports,
  modal lifecycle and updated component props.

- [ ] **Step 7: Commit terminal and UI integration.**

  ```bash
  git add package.json package-lock.json src/renderer/src/components/ContainerConsoleModal src/renderer/src/components/ContainerTreeItem/ContainerTreeItem.tsx src/renderer/src/components/ComposeGroupCard/ComposeGroupCard.tsx src/renderer/src/components/ContainerList/ContainerList.tsx src/renderer/src/screens/ContainersScreen/ContainersScreen.tsx
  git commit -m "feat: adiciona terminal interativo nos containers"
  ```

## Task 6: Verificação integrada e revisão final

**Files:**
- Modify: only files needed for fixes found by validation; do not change the approved scope.

**Interfaces:**
- Consumes the complete implementation from Tasks 1–5.
- Produces fresh lint, typecheck, build, unit-test and manual Docker evidence.

- [ ] **Step 1: Run the complete automated checks.**

  Run each command separately:

  ```bash
  npm run test
  npm run lint
  npm run typecheck
  npm run build
  ```

  Expected: every command exits with status 0; record any warnings separately
  from failures.

- [ ] **Step 2: Perform the Docker manual matrix.**

  With Docker available, verify logs from a running container show the last 200
  timestamped lines and follow new output; logs from a stopped container show
  history; terminal accepts `/bin/sh` commands, editing keys and Ctrl+C;
  terminal resize changes the shell dimensions; Terminal is disabled for a
  stopped container; closing either modal stops future events; and daemon/exec
  failures appear as readable messages.

- [ ] **Step 3: Inspect session cleanup.**

  Confirm that closing the Electron window does not leave active Docker streams,
  that opening another console does not retain the previous session, and that
  repeated end/error/close events do not produce duplicate UI notifications.

- [ ] **Step 4: Run final diff review.**

  Run `git diff --check` and `git status --short`; verify only intended source,
  lockfile, test configuration and documentation files are present and no
  generated `dist`/`out` files were added.

- [ ] **Step 5: Commit any validation fixes individually.**

  Use a focused Conventional Commit message for each correction, then rerun
  the affected focused test and the complete checks from Step 1.
