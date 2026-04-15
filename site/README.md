# featherdown site

GitHub Pages-ready landing site and live playground for `featherdown`.

## Local development

From the repository root:

```bash
npm run site:install
npm run site:dev
```

## Build

```bash
npm run site:build
```

The production output is generated in `site/dist`.

## GitHub Pages base path

If deploying under a repository subpath, pass `SITE_BASE_PATH` while building:

```bash
SITE_BASE_PATH=/featherdown/ npm run site:build
```

`SITE_BASE_PATH` maps to the Vite `base` setting.
