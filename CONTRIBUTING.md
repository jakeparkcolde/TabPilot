# Contributing

## Development

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

## Pull requests

- Keep changes focused on one problem.
- Add or update tests for behavioral changes.
- Do not add remote code, analytics, advertising or unnecessary permissions.
- Preserve the rule that protected, active, pinned, audible and loading tabs are never discarded.
- Update privacy and permission documentation when data handling changes.

## Code style

Run `npm run format` before submitting changes. All code must pass TypeScript, ESLint, Vitest and the production build.
