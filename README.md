<!-- generated-by: gsd-doc-writer -->
# Forge NPWD · Example App

A complete external-app starter for Forge NPWD, with two independently mounted home widgets, four languages, a server callback, a notification example and a standalone browser preview.

Um aplicativo externo completo para o Forge NPWD, com dois widgets independentes, quatro idiomas, callback de servidor, exemplo de notificação e prévia no navegador.

Una aplicación externa completa para Forge NPWD, con dos widgets independientes, cuatro idiomas, callback de servidor, ejemplo de notificación y vista en navegador.

Une application externe complète pour Forge NPWD, avec deux widgets indépendants, quatre langues, callback serveur, exemple de notification et aperçu navigateur.

## Documentation / Documentação / Documentación

- [English — complete guide](docs/en.md)
- [Português brasileiro — guia completo](docs/pt-BR.md)
- [Español — guía completa](docs/es.md)
- [Français — guide complet](docs/fr.md)
- [Forge Site — phone, apps, widgets and API](https://framework-forge.github.io/site/#forge-npwd/overview)

## Quick start

Use Node.js 20 or later. The repository name is intentionally `forge-npwd-appexemple`.

```sh
git clone https://github.com/Framework-Forge/forge-npwd-appexemple.git
cd forge-npwd-appexemple
npm ci
npm run dev
```

The browser preview uses illustrative statistics. It does not emulate player identity, inventory, PIN authorization or multiplayer communication.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`build` generates `web/dist/remoteEntry.js`, its chunks and `index.html`. `preview` serves the compiled remote on port 4173. `dev` is for the standalone app preview; it does not produce a release federation entry.

## FiveM installation

1. Build the resource and copy the folder, `fxmanifest.lua`, both Lua directories and **all of `web/dist`** to the server.
2. Start `pr_bridge`, then the example app, then `forge-npwd` and its lifecycle/inventory bridge. The example intentionally has no hard phone dependency: the external resource must start before the phone. Its server callback checks phone availability when used.
3. Add `forge-npwd-appexemple` to the existing `apps` array in the phone’s `config.json`. Do not replace the other entries.
4. Reopen/restart the phone in a planned test. Install **Forge Example** through Forge Store.
5. Hold an empty home-screen area, open Widgets, select **Forge · Server** or **Forge · Clock**, choose a size and place it in free cells.

Generated `web/dist` is ignored by Git but **required in release packages**. Do not distribute only the source folder and expect FiveM to compile it.

## Structure

```text
forge-npwd-appexemple/
├── fxmanifest.lua
├── forge-npwd.config.ts          app descriptor + homeWidgets
├── vite.config.ts               ESM remote, exposed ./config
├── client/main.lua              NUI callback + phone notification/message
├── server/main.lua              PR Bridge callback, source validation
├── src/
│   ├── contracts.ts             resource name, app ID, route and types
│   ├── api.ts                   explicit app URL, timeout, shared read cache
│   ├── i18n.ts                  en / pt-BR / es / fr
│   ├── App.tsx                  app pages and notification test
│   ├── main.tsx                 browser-only root + MemoryRouter
│   ├── hooks/useSummary.ts      refresh and listener cleanup
│   ├── widgets/SummaryWidget.tsx
│   ├── widgets/ClockWidget.tsx
│   └── styles.css               scoped styles, no host overrides
├── tests/api.test.mjs            six callback/contract tests
├── tests/game.lua                Lua 5.4 client/server mocks
├── docs/                        complete guide in four languages
└── web/dist/                    generated release files
```

## Contract and supported toolchain

- `RESOURCE_NAME` targets the external resource folder and its NUI callbacks. `GetParentResourceName()` in a federated app identifies the **phone**, not the external app.
- `APP_ID` identifies the app, messages and persisted widgets. `APP_PATH` is its React Router route. Change these consistently in TypeScript, Lua, federation, startup and phone configuration.
- The current phone calls the descriptor factory without arguments. This example owns its language selector; it does not assume a supplied `settings.language`.
- React **17.0.2** and React Router DOM **5.3.0** match the inspected phone host. Do not introduce another router or an incompatible React copy in the remote. Vite, the federation plugin and the top-level-await transformer are locked; the SWC override matches the working compiler in the existing app workspace.
- Widgets are mounted outside the app’s private providers. Each uses its own hook and handles loading/errors. Sizes count grid cells, not pixels.
- The summary widget exposes only public player counts. The clock displays local real time, not the city clock. Neither is a bank/security example.
- `getActivePhoneContext` checks the active device context, **not an unlocked PIN session**. Private apps require their own server-side authorization, ownership checks and data isolation. Never trust player/profile IDs sent by NUI.

## Test scope

`npm test` tests callback targeting, JSON, shared requests, cache, errors, cleanup and identifiers. For the Lua mock tests, install Lua 5.4 separately and run from the resource root:

```sh
lua tests/game.lua
```

Mocks and browser previews do not establish live FiveM compatibility. Test real inventory usage, two players, PIN/phone transfer, app installation, every widget size, restart and missing providers on a test city before release.

The four downloadable guides and the site’s code examples are mechanically synchronized from the actual app files. In the sibling Forge Site repository, run `npm run sync:npwd-docs` after changing the template, then `npm run test:npwd-docs`. Pass another example-repository path to the synchronization script if your directories are not siblings. Do not edit generated guides instead of their translated site source.

## Credits and license

NPWD was created by **Project Error and its contributors**. Forge NPWD builds on that project; this starter demonstrates the current Forge external-app/widget contract. See [original documentation](https://projecterror.dev/docs/) and [upstream source](https://github.com/project-error/npwd).

This starter’s source is **GPL-3.0-or-later**; dependencies retain their own licenses. Preserve upstream notices when distributing derivative phone code. The complete guide records the source phone’s historical license-metadata discrepancy; resolve that in the phone release rather than assuming this starter changes its license.
