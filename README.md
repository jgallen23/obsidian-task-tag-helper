# Tasks Tag Helper

Manage tags on unchecked tasks across your Obsidian vault.

## Development

1. Run `npm install`.
2. Run `npm run dev` to rebuild the root `main.js` on change for local vault development.
3. Reload Obsidian after each rebuild.

## Install into a vault

```bash
npm run install:vault -- /path/to/your/vault
```

The install script always runs the production build first, then copies `dist/main.js`, `dist/manifest.json`, and `dist/styles.css` into `.obsidian/plugins/obsidian-task-tags-helper/` inside the given vault.

## Quality checks

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run check`

## Build output

- `npm run build` creates `dist/`.
- `dist/` contains `main.js`, `manifest.json`, and `styles.css`.
- Copy or symlink the contents of `dist/` into your Obsidian plugin folder when packaging or installing outside the repo.

## Release

1. Update `manifest.json.minAppVersion` if compatibility changes.
2. Run `npm version patch`, `npm version minor`, or `npm version major`.
3. Attach the contents of `dist/` to the GitHub release.

## Repository

- Repo: not configured
- Author: [Greg Allen](https://firstandthird.com)
