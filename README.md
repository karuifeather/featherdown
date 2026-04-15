# blog-pipeline

TypeScript library for **Markdown-to-HTML publishing**: producing HTML from author Markdown for static sites, feeds, and related outputs.

This release ships **package infrastructure only**—build, types, tests, and a minimal public entry. Conversion APIs and tooling are not included yet.

## Requirements

- Node.js 18 or later

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
