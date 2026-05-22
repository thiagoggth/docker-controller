# Repository Guidelines

## Project Structure & Module Organization

This is an Electron Vite app using React and TypeScript. Main-process code lives in
`src/main`, organized by clean architecture layers: `domain`, `application`, `data`,
`controllers`, `factories`, `services`, and `shared`. Preload bridge code is in
`src/preload`. Renderer UI code is in `src/renderer/src`, with `components`, `screens`,
`hooks`, `stores`, `services`, `utils`, `types`, and `assets/main.css`. Build assets and
packaging files live in `build`, `resources`, `electron-builder.yml`, and `scripts`.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies, matching the README workflow.
- `pnpm dev`: run the Electron app in development mode.
- `npm run lint`: run ESLint over the repository.
- `npm run typecheck`: type-check both Node/main and web/renderer projects.
- `npm run build`: run type checks and build with `electron-vite`.
- `npm run build:linux`, `npm run build:win`, `npm run build:mac`: create platform packages.
- `npm run publish:gh`: run the GitHub publishing script in `scripts/publish.mjs`.

## Coding Style & Naming Conventions

Use TypeScript throughout. Formatting is controlled by `.editorconfig` and Prettier:
2-space indentation, LF endings, final newlines, single quotes, semicolons, trailing
commas, and 100-character line width. React components use PascalCase filenames and
exports, for example `ContainerCard.tsx`. Hooks use `useName.ts`, stores use
`nameStore.ts`, and main-process use cases follow `VerbEntityUseCase.ts`. Prefer the
configured aliases `@core`, `@gui`, and `@preload` over long relative imports.

## Testing Guidelines

No automated test runner is currently configured. For every change, run at least
`npm run lint`, `npm run typecheck`, and, when behavior or packaging is affected,
`npm run build`. If adding tests, colocate them near the code under test with a clear
`*.test.ts` or `*.test.tsx` pattern and add the runner command to `package.json`.

## Commit & Pull Request Guidelines

Recent commits use Conventional Commit-style prefixes in Portuguese, such as
`feat:`, `fix:`, `refactor:`, and `build:`. Keep messages imperative and scoped to one
change. Pull requests should include a short description, verification commands run,
linked issues when applicable, and screenshots or short recordings for renderer UI
changes. Mention Docker-related manual checks when changing container actions,
Dockerode integration, or daemon availability handling.

## Security & Configuration Tips

Keep local secrets in `.env` and document new variables in `.env.example`. Do not commit
generated output from `dist`, `out`, or dependency folders. Docker-facing changes should
handle unavailable daemons and container action failures through the existing domain and
controller error paths.
