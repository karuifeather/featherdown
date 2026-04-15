# blog-pipeline

TypeScript library aimed at **Markdown-to-HTML publishing**: turning author content into HTML suitable for static sites, feeds, and similar workflows.

The project is **early**; rendering, plugins, and CLI are **not** shipped yet. This repository currently holds tooling, types, and a minimal entry point so development can proceed in small, reviewable steps.

## Requirements

- Node.js 20+

## Scripts

| Script        | Description                    |
|---------------|--------------------------------|
| `npm run build`     | Produce ESM output under `dist/` |
| `npm test`          | Run the test suite once          |
| `npm run test:watch`| Run tests in watch mode          |
| `npm run lint`      | ESLint                           |
| `npm run typecheck` | TypeScript, no emit              |

## License

MIT — see [LICENSE](./LICENSE).
