# featherdown

**featherdown** is a publishing-focused Markdown engine for apps, blogs, docs, and product surfaces that want **sanitized HTML**, **publishing metadata**, **diagnostics**, **code and math support**, and **asset hints**—without hand-wiring a full [unified](https://github.com/unifiedjs/unified) pipeline.

It is **not** a static site generator and does not ship client runtimes for charts, copy-to-clipboard behavior, or Mermaid in the browser. It produces HTML contracts and metadata your app can integrate.

The default npm entry is **browser-safe**. Optional **Node-only** Mermaid (inline SVG) lives behind `featherdown/node`.

## Contents

**Get started**

- [Install](#install)
- [Quick start](#quick-start)
- [Defaults at a glance](#defaults-at-a-glance)
- [Gotchas](#gotchas)

**Learn the API**

- [The result object](#the-result-object)
- [Options](#options)
- [Front matter](#front-matter)

**Features**

- [Code blocks](#code-blocks)
- [Math](#math)
- [Charts](#charts)
- [Callouts, alerts, and details](#callouts-alerts-and-details)
- [Footnotes](#footnotes)
- [Links and images](#links-and-images)
- [Embeds](#embeds)
- [TOC, excerpt, and counts](#toc-excerpt-and-counts)
- [Diagnostics](#diagnostics)

**Output and environment**

- [Styles](#styles)
- [HTML contracts](#html-contracts)
- [Security and trust](#security-and-trust)
- [Runtime boundaries](#runtime-boundaries), [Node usage](#node-usage), [Mermaid](#mermaid-node-only)

**Reference**

- [Advanced and compatibility APIs](#advanced-and-compatibility-apis)
- [Migration from legacy helpers](#migration-from-legacy-helpers)
- [Public API summary](#public-api-summary)
- [Scripts](#scripts), [Site](#site), [Maintainers](#maintainers)

## Install

```bash
npm install featherdown
```

Node.js **22+** is required.

### JSR / Deno

You can import the library from JSR (see [@karuifeather/featherdown](https://jsr.io/@karuifeather/featherdown)). JSR exposes the same JavaScript entry points as npm: the root, **`/node`**, **`/advanced`**, and **`/legacy`**. **npm** publishes **CSS subpath exports** (`featherdown/styles.css`, `featherdown/styles/base.css`, and the other `featherdown/styles/*` entries in `package.json`). **Deno/JSR** (`deno.json` exports) does **not** mirror those CSS paths today—**CSS parity for JSR is deferred**; treat stylesheet wiring as environment-specific. **CSS packaging and `@import` resolution for JSR/Deno consumers are not treated as equivalent to npm bundler workflows.** Prefer npm (or a bundler) when you want the documented CSS entry points without extra setup.

## Quick start

```ts
import { Featherdown } from "featherdown";
import "featherdown/styles.css";

const featherdown = new Featherdown();

const result = await featherdown.parse("# Hello\n\nSome **Markdown**.");

// Wrap the HTML in .featherdown-content or the shipped CSS will not apply.
const page = `<article class="featherdown-content">${result.html}</article>`;

console.log(result.toc); // [{ depth: 1, text: "Hello", id: "hello" }]
```

To read YAML front matter, opt in with `frontmatter: "auto"`:

```ts
const withMeta = new Featherdown({ frontmatter: "auto" });
const post = await withMeta.parse("---\ntitle: Hello\n---\n\n# Hello");

console.log(post.metadata.title); // "Hello"
```

Three things to know before you go further:

1. **Wrap the HTML yourself.** Featherdown returns the fragment only. The shipped CSS is scoped to **`.featherdown-content`**, so unwrapped output is unstyled. See [Styles](#styles).
2. **Front matter is off by default.** Pass `frontmatter: "auto"` to parse and strip a leading YAML block. See [Front matter](#front-matter).
3. **Math, code highlighting, charts, alerts, and details are on by default.** Links, images, and embeds are opt in. See [Defaults at a glance](#defaults-at-a-glance).

The default entry is browser-safe and does **not** include Mermaid rendering.

### Constructor options and per-call overrides

Use the **`Featherdown`** class as the primary API. Constructor options set defaults; each call to **`parse(markdown, parseOptions?)`** can override them (with a shallow merge and one-level merge for nested groups like `code`, `headings`, `links`, `images`, `embeds`, and `publishing`). Passing `true` for a group keeps the constructor's settings for it; passing an object for a `math` / `code` group the constructor disabled keeps it disabled unless the object sets `enabled: true`. Plugin lists concatenate (constructor first).

```ts
const featherdown = new Featherdown({
  frontmatter: "auto",
  math: true,
  code: true,
  diagnostics: "warn",
});

const result = await featherdown.parse(markdown);
```

### Image manifest example

```ts
const featherdown = new Featherdown({
  kind: "post",
  slug: "hello-world",
  manifest: {
    map: {
      "post/hello-world/images/logo.png": { url: "https://cdn.example.com/logo.png" },
    },
  },
});

const result = await featherdown.parse(markdown);
```

See [Links and images](#links-and-images) for how manifest keys are built.

## Defaults at a glance

What you get from `new Featherdown()` with no options:

| Option | Default | Notes |
| --- | --- | --- |
| `sanitize` | **on** | Keep it on for anything you do not fully control. |
| `math` | **on** | `$…$` and `$$…$$` become KaTeX. See [Gotchas](#gotchas) for stray dollar signs. |
| `code` | **on** | Highlighting on; `lineNumbers` and `copyButton` **off** globally. |
| `charts` | **on** | Valid `chart-*` fences become mount placeholders. |
| `alerts` | **on** | `> [!NOTE]` and friends become callouts. |
| `details` | **on** | `:::details[Summary]` becomes `<details>`. |
| `headings` | **on** | Fills `toc`, `tocTree`, `headings` (depth 1–6). |
| `publishing` | **on** | Fills `excerpt`, `wordCount`, `estimatedReadingMinutes`. |
| `diagnostics` | **on** (warn) | Returned on `result.diagnostics`; never throws unless `"strict"`. |
| `frontmatter` | **off** | Opt in with `"auto"` or `true`. |
| `links` | **off** | Opt in for `rel` / `target` on external links. |
| `images` | **off** | Opt in for `loading`, `decoding`, `figure`. |
| `embeds` | **off** | Opt in; raw iframes and `::embed` are removed until then. |
| `plugins` | none | Extra remark / rehype plugins. |
| `mermaid` | n/a | **Node entry only.** See [Mermaid](#mermaid-node-only). |

## Gotchas

Behaviors that surprise people. Each one is intentional, but easy to trip on.

**Setup**

- **No wrapper element.** `html` is a fragment. Add `<article class="featherdown-content">` yourself; every shipped rule is scoped to it.
- **Front matter is not parsed by default.** Without `frontmatter: "auto"`, a leading `---` block renders as a horizontal rule plus a heading, and that heading lands in `toc`. Invalid YAML does the same: it is treated as body content, with no diagnostic.
- **`assets` reflects rendered content, not enabled options.** A document with no code fences does not list `code.css`. Use `result.assets.styles` per document, or import `featherdown/styles.css` once for everything.

**Content**

- **Stray dollar signs become math.** With `math` on (the default), `costs $5 or $10` renders `5 or` as a formula. Escape each sign (`\$5`) or set `math: false`. Dollar signs inside inline code and code fences are safe.
- **Custom heading ids are prefixed.** A heading written `## Top {#my-id}` renders `id="user-content-my-id"`, and `toc` / `headings` report the same prefixed id. Links inside the document (`[x](#my-id)`) are rewritten to match, but links to the page from **elsewhere** must use the prefixed id. Automatic ids (`## Top` → `top`) are not prefixed.
- **Ids that collide with footnotes are renamed.** `## Top {#fn-1}` becomes `user-content-fn-1-1` so it cannot duplicate the footnote's id. Author links written `#fn-1` still go to the footnote.
- **`code: false` disables fence extras.** `title="..."`, `{2,4}` line highlights, line numbers, copy hooks, and `diff` marking are all part of the code pipeline.
- **Invalid chart JSON falls back to a code block.** The fence stays as a highlighted `<pre><code>`, a `chart.invalid_json` diagnostic is emitted, and `assets` may then include `highlight.css` because code was rendered.
- **Mermaid is not rendered in the browser entry.** A `mermaid` fence stays a highlighted code block. Use `featherdown/node` for build-time SVG, or hydrate it yourself ([client-side previews](#client-side-mermaid-previews)).
- **Embeds need opt in.** Until `embeds` is enabled, raw `<iframe>` elements and `::embed` directives produce no embed. Do **not** put your own domain in `allowHosts` ([why](#embeds)).

**Safety**

- **`sanitize: false` is unsafe for untrusted input.** Scripts, `style`, and event handlers pass through untouched. Leave it on unless every input is trusted.
- **`plugins.rehype` runs after sanitization.** Its output is not sanitized. Treat rehype plugins as trusted code.

**Versions and imports**

- **The legacy helpers are not `Featherdown`.** `renderMarkdownToHtml` and friends take the older `RenderMarkdownOptions` and get none of the newer features. See [Migration](#migration-from-legacy-helpers).
- **Root re-exports of legacy and advanced symbols are deprecated.** Import from `featherdown/legacy` and `featherdown/advanced`.
- **JSR has no CSS subpaths.** Use npm (or a bundler) for `featherdown/styles.css`.

Fixes and behavior changes by release are in [CHANGELOG.md](./CHANGELOG.md); the **Changed** entries marked **Behavior** are the ones most likely to affect existing output.

## The result object

`Featherdown.parse()` resolves to a **`FeatherdownResult`**. Commonly used fields:

| Field | Meaning |
| --- | --- |
| **`html`** | Sanitized HTML string. |
| **`body`** | Markdown body after front matter is stripped when front matter parsing is enabled and a valid block exists; otherwise the full input string. |
| **`frontmatter`** | Parsed YAML object, or `{}` when absent or when front matter parsing is disabled. |
| **`metadata`** | Normalized subset of common publishing fields (`title`, `description`, `tags`, `draft`, `image`, and others). See [Front matter](#front-matter). |
| **`toc`** | Compact heading list for navigation (`depth`, `text`, `id`). Filtered by `headings.minDepth` / `maxDepth`. |
| **`tocTree`** | The same `toc` entries nested under the nearest shallower heading (`children`). Empty when `toc` is empty. |
| **`headings`** | Richer heading metadata in document order (includes `hasCustomId`). Not affected by `minDepth` / `maxDepth`. |
| **`excerpt`** | First meaningful plain-text excerpt from rendered flow content, or `null` when disabled or unavailable. |
| **`wordCount`** / **`estimatedReadingMinutes`** | Derived from the rendered document text (subject to `publishing` options). |
| **`stats`** | Mirrors `wordCount` and reading time for convenience. |
| **`diagnostics`** | Non-fatal warnings (for example invalid chart JSON, manifest misses, or blocked embeds). See [Diagnostics](#diagnostics). |
| **`assets`** | Hints such as **`assets.styles`** (selective package CSS paths) and **`assets.features`** (`math`, `code`, `charts`, `mermaid`, `embeds`). |

`assets.styles` and `assets.features` reflect **content actually rendered** in the document, not just which options are enabled. For example, `features.embeds` is `true` only when an embed was emitted, and `features.mermaid` is `true` only on the Node entry when an SVG diagram was produced. `assets.styles` lists **selective** style paths (for example `featherdown/styles/base.css`), not the all-in `featherdown/styles.css` aggregate.

Use `assets` in SSR or static generators to decide which stylesheets to emit alongside HTML:

```ts
const result = await featherdown.parse(markdown);
console.log(result.assets.styles);
```

## Options

Every option is optional. Pass them to the constructor, and optionally again per `parse()` call.

```ts
const featherdown = new Featherdown({
  frontmatter: "auto",
  math: true,
  code: true,
  sanitize: true,
  diagnostics: true,
  charts: true,
  headings: true,
  publishing: true,
});
```

Object forms for nested groups:

```ts
const featherdown = new Featherdown({
  code: {
    enabled: true,
    highlighting: true,
    lineNumbers: false,
    copyButton: false,
  },
  publishing: {
    excerpt: true,
    wordCount: true,
    readingTime: true,
  },
});
```

A fuller example using the opt-in groups:

```ts
const featherdown = new Featherdown({
  alerts: true,
  details: true,
  links: { internalHosts: ["example.com", "*.example.com"] },
  images: { lazy: true, decoding: "async", figure: true },
  embeds: { providers: ["youtube", "vimeo"], allowHosts: [] },
  code: { lineNumbers: false, copyButton: false },
  headings: { minDepth: 2, maxDepth: 4 },
});
```

### Option reference

- **`frontmatter`** — `false`, `true`, or `"auto"`; controls whether leading YAML front matter is parsed and stripped from `body`. Default `false`. See [Front matter](#front-matter).
- **`math`** — Toggle KaTeX HTML output for `$…$` / `$$…$$`. See [Math](#math).
- **`code`** — Toggle code pipeline features; **`highlighting`** controls whether highlight.js classes and **`highlight.css`** are relevant. **`lineNumbers`** and **`copyButton`** set global defaults for every fence (both default `false`). See [Code blocks](#code-blocks).
- **`sanitize`** — When enabled, author content (Markdown and raw HTML) passes through `rehype-sanitize` with the package schema **before** Featherdown adds its own markup (KaTeX, code chrome, chart mounts, heading anchors, embeds). Raw HTML keeps safe tags and attributes but loses `style`, `<button>`, and any `class` other than `language-*` on `code`, the callout classes on `div`, and the `details` class on `details` (which is kept).
- **`diagnostics`** — Controls whether warnings appear on the result and whether strict mode fails the parse. See [Diagnostics](#diagnostics).
  - **`false`** — `result.diagnostics` is always `[]` (issues may still be detected internally).
  - **`true`** or **`"warn"`** — Non-fatal diagnostics are returned on `result.diagnostics`; the parse does not throw.
  - **`"strict"`** — Same collection as warn; if any diagnostic exists after rendering, the parse throws **`FeatherdownDiagnosticsError`**.
- **`charts`** — When enabled, valid `chart-*` fences become mount placeholders; invalid JSON surfaces diagnostics when diagnostics are enabled. See [Charts](#charts).
- **`headings`** — Controls **`result.headings`**, **`result.toc`**, and **`result.tocTree`** (metadata extracted after render). Heading markup in **`html`** is unchanged; this option gates the arrays on the result.
  - **`false`** — **`result.headings`**, **`result.toc`**, and **`result.tocTree`** are all empty arrays.
  - **`true`** — Default heading metadata: the arrays are populated when rendered headings have ids.
  - **Object** — Shape matches **`FeatherdownHeadingOptions`**:
    - **`toc`** — When **`false`**, **`result.toc`** and **`result.tocTree`** are empty while **`result.headings`** can still be filled.
    - **`minDepth`** / **`maxDepth`** (1–6; defaults `1` and `6`) — Limit which levels appear in **`toc`** and **`tocTree`**. **`headings`** is unaffected. If `minDepth` is greater than `maxDepth`, the two are swapped.
  - Heading ids and anchor links are always rendered.
- **`publishing`** — Gates excerpt, word count, and reading-time fields on the result.
- **`alerts`** — GitHub-style alerts (`> [!NOTE]`) become callouts. Default **`true`**. See [Callouts, alerts, and details](#callouts-alerts-and-details).
- **`details`** — `:::details[Summary]` collapsible sections. Default **`true`**.
- **`links`** — External link decoration. **Opt in** (default off). Accepts `true` or an object:
  - **`rel`** — Default `"noopener noreferrer"`. Tokens are merged without duplicates. `false` leaves `rel` alone.
  - **`target`** — Default `"_blank"`. `false` leaves `target` alone.
  - **`internalHosts`** — Hostnames treated as internal and left undecorated. Use an exact host (`example.com`) or a wildcard (`*.example.com`). A wildcard matches **subdomains only**, so `*.example.com` matches `blog.example.com` but not `example.com`.
  - Absolute `http(s)` links and protocol-relative `//host` links to other hosts are decorated. Relative paths, `#anchors`, and `mailto:` links are never changed.
- **`images`** — Image output options. **Opt in** (default off). Accepts `true` or an object:
  - **`lazy`** — Adds `loading="lazy"` (default `true`). Existing `loading` attributes are kept.
  - **`decoding`** — `"async"` (default), `"sync"`, `"auto"`, or `false` to omit the attribute.
  - **`figure`** — Default `false`. When `true`, a paragraph containing only one titled image becomes `<figure class="markdown-figure">` with a `<figcaption>` from the title, and the `title` attribute is dropped. Linked images keep the link inside the figure.
- **`embeds`** — Allowlisted iframes and `::embed` directives. **Opt in** (default off). See [Embeds](#embeds).
- **`plugins`** — Extra unified plugins: `{ remark?, rehype? }`. See [Security and trust](#security-and-trust).
- **`kind`**, **`slug`**, **`manifest`** — Manifest-based image URL rewriting. See [Links and images](#links-and-images).

Avoid treating every nested field on `FeatherdownOptions` as a global behavioral switch unless documented here.

## Front matter

Publishing-style front matter is **opt in**. The default constructor does **not** strip YAML; pass **`frontmatter: "auto"`** (or `true`) when you want leading `---` YAML parsed and removed from the body string.

```ts
const featherdown = new Featherdown({
  frontmatter: "auto",
});

const result = await featherdown.parse(`---
title: Hello World
tags:
  - docs
---

# Hello`);
```

Then:

- `result.frontmatter.title`, `result.metadata.title`
- `result.body` — Markdown after the front matter block
- `result.html` — Rendered from `body` only

**Metadata fields.** `result.metadata` is a typed subset of front matter. Values of the wrong type are omitted (they stay on `result.frontmatter`). Where several keys are listed, the first usable one wins.

| Metadata | Source keys |
| --- | --- |
| `title`, `author`, `status`, `slug` | Same name. Must be a string. |
| `description` | `description`, then `summary`, then `excerpt`. |
| `date` | `date`. |
| `updated` | `updated`, then `lastmod`, then `modified`. |
| `draft` | Boolean `draft`. Otherwise `status: draft` sets `true`. An explicit `draft` wins over `status`. |
| `tags`, `categories` | A string (one entry) or an array of strings. Anything else is omitted. |
| `image` | `image`, then `cover`, then `ogImage`. Each may be a string or an object with a string `src` or `url`. |
| `canonical` | `canonical`, then `canonicalUrl`, then `canonical_url`. |
| `lang` | `lang`, then `language`. |
| `keywords` | A comma-separated string (trimmed, empty entries dropped) or an array of strings. |

**Dates.** Unquoted YAML dates such as `date: 2026-01-02` are parsed by YAML as `Date` values; they are normalized to `YYYY-MM-DD` in `metadata`. Values with a time component become a full ISO string (for example `2026-01-02T10:30:00.000Z`). Quoted dates such as `"Jan 2, 2026"` pass through unchanged. `result.frontmatter.date` keeps the raw parsed value.

**Lenient behavior:** invalid or non-mapping YAML does not throw and emits no diagnostic; the raw document is treated as body content with empty `frontmatter` / `metadata` where applicable (so the `---` lines render as a rule and a heading).

**Strict legacy utility:** `parseMarkdownFile()` still throws on invalid YAML and returns **`frontMatter`** / **`content`**. Use it only when you need that contract; otherwise prefer `Featherdown` with `frontmatter: "auto"`.

## Code blocks

- **Fenced code** renders as sanitized `<pre><code>` with highlight.js classes when highlighting is on.
- **Titles:** ` ```ts title="example.ts" ` — emits `code-block` / `code-block-title` markup.
- **Line highlights:** ` ```ts {2,4-5} ` — `code-line` / `code-line-highlighted` wrappers. Highlight numbers are relative to the block, even when numbering starts elsewhere.
- **Line numbers:** ` ```ts showLineNumbers ` — `code-line-numbered` and per-line number spans.
  - ` ```ts showLineNumbers=10 ` starts numbering at `10`.
  - Set `code: { lineNumbers: true }` on the instance to number **every** fence by default (default `false`).
  - A fence can opt out with `noLineNumbers` or `showLineNumbers=false`.
- **Copy UI hooks:** ` ```ts showCopyButton ` (or `copyButton`) emits the button markup and `data-*` attributes for your app to wire up. Set `code: { copyButton: true }` to add it to **every** fence (default `false`). A fence can opt out with `noCopyButton` or `showCopyButton=false`. **The package does not ship clipboard JavaScript.**
- **Diff:** ` ```diff ` marks lines that start with `+` as `code-line-added` and lines that start with `-` as `code-line-removed`. The markers are kept in the output.
- **Diff on other languages:** ` ```ts diff ` applies the same line marking to a highlighted block. The `+` / `-` markers are stripped and the code is still highlighted.
- **Composition:** titles, highlights, line numbers, and diff marking can be combined in one info string:

````md
```ts diff title="x.ts" {1} showLineNumbers=3
-a
+b
```
````

- Chart fences (`chart-*`) and Mermaid fences never receive line numbers or copy chrome, even when the global defaults are on.
- These fence options work with `highlighting: false` too, but not with `code: false`.

Styling for these contracts comes from **`code.css`** and **`highlight.css`** (when highlighting is enabled).

## Math

Math is **on by default**. Toggle it on the instance or per parse:

```ts
const featherdown = new Featherdown({
  math: false, // or true (the default)
});
```

Ensure KaTeX styles are loaded (all-in `featherdown/styles.css`, or `featherdown/styles/katex.css`). The public option name is **`math`**; KaTeX is used internally for HTML output.

Because `$` delimits math, prose with several dollar signs can be misread as a formula. Escape them (`\$5 or \$10`) or turn math off for that content.

## Charts

Valid `chart-*` fenced JSON becomes a **`chart-mount`** placeholder with `data-chart` and `data-chart-data`. The package does **not** bundle a chart runtime—your app hydrates or renders charts.

````md
```chart-bar
{"labels": ["a", "b"], "values": [1, 2]}
```
````

Invalid JSON keeps the fence as an ordinary highlighted code block and, when diagnostics are enabled, reports `chart.invalid_json`.

## Callouts, alerts, and details

`:::note`, `:::warning`, `:::tip`, etc. (with optional `:::type[Title]`) render to **`callout`** / **`callout-<type>`** structures. Body markdown is processed normally.

GitHub-style alerts map to the same callout classes. The marker is case-insensitive and must be the first line of the blockquote. The supported types are `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, and `CAUTION`. An optional custom title follows the marker on the same line:

```md
> [!NOTE]
> Useful context.

> [!TIP] Pro tip
> Body text with **inline** markdown.
```

A marker with no text renders a callout titled with the type name. Unknown markers (for example `[!FOO]`) and markers that are not on the first line leave an ordinary `<blockquote>`. Alerts are on by default; set `alerts: false` to disable them.

Collapsible sections use `:::details`:

```md
:::details[More info]{open}
Hidden **content**.
:::
```

This renders `<details class="details" open>` with a `<summary>`. The summary defaults to `Details` when omitted. Callouts and alerts can be nested inside details. Set `details: false` to leave the directive as plain text.

## Footnotes

GFM footnotes (`text[^1]` and `[^1]: note`) render with working links between the reference and the note, and the links resolve within the document. The footnotes section is excluded from `toc`, `headings`, and `excerpt`, and footnote markers are stripped from the excerpt.

Footnote ids use the sanitizer's `user-content-` prefix (`user-content-fn-1`). An author id that would collide with one (for example `## Top {#fn-1}`) is renamed with a numeric suffix (`user-content-fn-1-1`), and `toc` / `headings` report the renamed id.

## Links and images

Both groups are **opt in**. Options are listed under [Options](#option-reference).

```ts
const featherdown = new Featherdown({
  links: { internalHosts: ["example.com", "*.example.com"] },
  images: { lazy: true, decoding: "async", figure: true },
});
```

- **External links** get `rel="noopener noreferrer"` and `target="_blank"` by default. Hosts in `internalHosts` are left alone.
- **Images** always get the `markdown-inline-img` class. With `images` enabled they also get `loading` and `decoding`, and titled images can become figures.
- **Manifest rewriting.** `manifest.map` holds local images and `manifest.remote` (optional) maps remote source URLs to replace. When `kind`, `slug`, and `manifest.map` are set, a relative image such as `./images/logo.png` is looked up under the key `<kind>/<slug>/images/logo.png`. A hit replaces `src`. Entries may include `width` and `height`; positive values are emitted on the `<img>` to prevent layout shift. A miss leaves the original `src` and reports `images.manifest_miss`.

## Embeds

Embeds are **opt in**. Enable them with `embeds: true` (all built-in providers) or with an object:

```ts
const featherdown = new Featherdown({
  embeds: {
    providers: ["youtube", "vimeo"], // default: all built-in providers
    allowHosts: [], // extra https hosts; see the warning below
  },
});
```

With embeds off (the default), raw `<iframe>` elements and `::embed` directives are removed.

### Directives (preferred)

Directives let the package build the provider URL for you:

```md
::youtube{id="dQw4w9WgXcQ" title="Launch video"}

::vimeo[Conference talk]{id="76979871"}

::embed{src="https://codepen.io/some-user/embed/AbCdEf?default-tab=result" title="Demo"}
```

- `::youtube{id}` takes an 11-character YouTube id and builds a `youtube-nocookie.com` URL.
- `::vimeo{id}` takes a numeric Vimeo id. A label in brackets (`[Conference talk]`) is used as the title.
- `::embed{src}` takes a full `https` URL and runs the same host checks as a raw iframe.
- `title` is optional on every directive.

Directives accept only the attributes listed above. Other attributes, including `class`, `style`, and event handlers, are ignored.

### Raw iframes

A raw `<iframe>` is kept only when its `src` matches the same allowlist:

```html
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Launch video"></iframe>
```

### Built-in providers

| Provider | Accepted URL shape |
| --- | --- |
| `youtube` | `/embed/<id>` on `youtube.com` or `youtube-nocookie.com` |
| `vimeo` | `player.vimeo.com/video/<digits>` |
| `codepen` | `codepen.io/<user>/embed/...` (including `embed/preview/...`) |
| `codesandbox` | `codesandbox.io/embed/<id>` |
| `stackblitz` | `stackblitz.com/edit/<id>?embed=1` |

Every URL must be `https`. Credentials, look-alike domains (for example `youtube.com.evil.com`), and paths outside the provider's embed shape are rejected.

### Hardening

Every embed that renders is wrapped in `div.embed.embed-<provider>` (`embed-custom` for `allowHosts`). The `<iframe>` inside it:

- has `loading="lazy"` and `referrerpolicy="strict-origin-when-cross-origin"`;
- has a `sandbox` attribute set by Featherdown. Built-in providers get the permissions they need. `allowHosts` entries get `allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation` and no `allow` permissions policy. No provider is granted top-level navigation;
- has a default `title` ("Embedded content") when the author omits one.

Author-supplied `srcdoc`, event handlers, `style`, `name`, `id`, `class`, `sandbox`, and `allow` are removed, and iframe children (fallback text, scripts) are dropped.

Rejected embeds report non-fatal diagnostics with `source: "embeds"` (`embeds.blocked`, `embeds.invalid`; see [Diagnostics](#diagnostics)). `result.assets.features.embeds` is `true` only when an embed was actually rendered.

> **Warning:** `allowHosts` should list only **third-party** hosts that serve the embed. Embed iframes receive `allow-scripts allow-same-origin`, so an entry that points at **your own site's origin** would let embedded content run as your site and read its storage and cookies. Never add your own domain. `allowHosts` entries are exact hostnames or `*.example.com` wildcards; URLs, paths, `*`, and bare TLD wildcards like `*.com` are ignored.

## TOC, excerpt, and counts

`toc`, `tocTree`, `headings`, `excerpt`, `wordCount`, and `estimatedReadingMinutes` come from the **same** render pass as `html`, gated by **`headings`** and **`publishing`** options.

`toc` entries carry the **rendered** ids (see the custom-id note in [Gotchas](#gotchas)), so you can link straight to them:

```ts
for (const item of result.tocTree) {
  console.log(`#${item.id}`, item.text, item.children.length);
}
```

## Diagnostics

Diagnostics are non-fatal warnings on `result.diagnostics`. Each has a `code`, a `message`, `severity: "warning"`, and a `source`. These are the codes that exist today:

| Code | Source | Raised when |
| --- | --- | --- |
| `chart.invalid_json` | `chart` | A `chart-*` fence has JSON that cannot be parsed. The fence stays a code block. |
| `images.manifest_miss` | `images` | A manifest lookup finds no entry for an image. The original `src` is kept. |
| `embeds.blocked` | `embeds` | A raw iframe or `::embed` URL did not match the allowlist, or an iframe had no `src`. A directive with a well-formed but disallowed `src` (such as `::embed{src="javascript:..."}`) also reports this. |
| `embeds.invalid` | `embeds` | A directive is missing required input or has a malformed id (for example `::youtube{id="bad"}` or `::embed{}`). |

Not everything produces a diagnostic. Invalid front matter YAML, for instance, is silently treated as body content.

Modes are set with the **`diagnostics`** option (see [Options](#option-reference)). In `"strict"` mode, any diagnostic makes `parse()` throw **`FeatherdownDiagnosticsError`** with **`error.diagnostics`** and optional **`error.result`** (the full `FeatherdownResult`, including `html`). Use `instanceof FeatherdownDiagnosticsError` in callers that need to branch.

```ts
import { Featherdown, FeatherdownDiagnosticsError } from "featherdown";

const featherdown = new Featherdown({
  diagnostics: "warn",
});

const strict = new Featherdown({
  diagnostics: "strict",
});

try {
  await strict.parse(markdown);
} catch (e) {
  if (e instanceof FeatherdownDiagnosticsError) {
    console.error(e.diagnostics);
  }
}
```

## Styles

Official styles target the **`featherdown-content`** wrapper class and related HTML contracts. **You add the wrapper** (`<article class="featherdown-content">…</article>`); Featherdown does not emit it.

### All-in (recommended starting point)

These entry points are intended for **npm / bundler** workflows where the toolchain resolves package paths and nested `@import`s.

```ts
import "featherdown/styles.css";
```

This aggregates base, KaTeX, code, and highlight layers. It is the simplest path when you want the full default look.

### Selective imports

For smaller CSS payloads, import only what you need (or follow `result.assets.styles` per document):

```ts
import "featherdown/styles/base.css";
import "featherdown/styles/katex.css"; // when math is rendered
import "featherdown/styles/code.css"; // when code blocks / shell chrome are used
import "featherdown/styles/highlight.css"; // only when syntax highlighting is enabled
```

- **`base.css`** — Prose/layout and structural contracts for rendered content.
- **`katex.css`** — Bundler-oriented entry that pulls in KaTeX’s distribution CSS for math output.
- **`code.css`** — Featherdown code-block shell / chrome (titles, line layout hooks, etc.).
- **`highlight.css`** — Default highlight.js theme CSS; **include this only when syntax highlighting is enabled** (`code` with default highlighting, or equivalent).

Do **not** assume raw `<link href="node_modules/.../featherdown/styles.css">` without a bundler will resolve nested `@import`s the same way a bundler does.

### Custom themes

You can start from Featherdown's baseline styles and override them:

```ts
import "featherdown/styles/base.css";
import "./markdown-theme.css";
import "./code-theme.css";
```

Or skip `base.css` and fully own the rendered Markdown styles in your app.

When code highlighting is enabled, rendered code uses highlight.js-style `hljs` token classes, so custom code themes can target classes such as `.hljs-keyword`, `.hljs-string`, and `.hljs-comment`.

## HTML contracts

Rendered output uses stable classes including:

- **Article surface:** wrap content in **`featherdown-content`** (see shipped CSS).
- **Callouts:** `callout`, `callout-<type>`, `callout-title`
- **Details:** `details` (on `<details>`)
- **Code:** `code-block`, `code-block-title`, `code-line`, `code-line-highlighted`, `code-line-added`, `code-line-removed`, `code-line-numbered`, `code-line-number`, `code-block-copyable`, `code-block-copy-button`
- **Charts:** `chart-mount`
- **Images:** `markdown-inline-img`, `markdown-figure` (on `<figure>`)
- **Embeds:** `embed` and `embed-<provider>` (`youtube`, `vimeo`, `codepen`, `codesandbox`, `stackblitz`, or `custom`)

## Security and trust

- Input is sanitized (`rehype-sanitize`) before any Featherdown plugin runs, so only Featherdown's own output carries inline styles (KaTeX layout) or package classes. Raw HTML cannot set `style`, add arbitrary classes, or create buttons.
- Scripts, event handlers, and `javascript:` URLs are stripped. This holds only while `sanitize` is on.
- Prefer the **default** entry for untrusted user content.
- The **Node Mermaid** path sanitizes diagram SVG too, but Mermaid itself executes diagram source in headless Chromium; it is better suited to **trusted** publishing inputs.
- **Embeds** are off by default. When enabled, they are limited to the provider and host allowlists above. Do not add your own site's origin to `allowHosts`, because embeds run with `allow-same-origin`.
- **User plugins:** `plugins.remark` runs before HTML conversion, so its output is still sanitized. `plugins.rehype` runs **after** sanitization, right before serialization, and its output is **not** sanitized. Treat rehype plugins as trusted code, and never build them from user input.

```ts
const featherdown = new Featherdown({
  plugins: {
    remark: [myRemarkPlugin], // output is still sanitized
    rehype: [myRehypePlugin], // trusted: runs after sanitize
  },
});
```

## Runtime boundaries

| Entry | Role |
| --- | --- |
| **`featherdown`** | Browser-safe; no Mermaid / Playwright in the default bundle. |
| **`featherdown/node`** | Node **`Featherdown`**, optional Mermaid SVG, **`parseFile`**. |
| **`featherdown/advanced`** | Processor + rehype plugins for unified integrations. |
| **`featherdown/legacy`** | Deprecated pre-`Featherdown` helper functions. |

`featherdown/node` (including Mermaid) is also available from JSR as `@karuifeather/featherdown/node`; Mermaid still needs the Playwright / Chromium setup.

### Client-side Mermaid previews

The default `featherdown` entry does not render Mermaid in the browser. If your app needs live Mermaid previews, parse Markdown first, then hydrate `code.language-mermaid` blocks with the `mermaid` package in your own app code. This keeps Mermaid out of Featherdown's browser bundle. Use `featherdown/node` when you want build-time SVG output.

```ts
import mermaid from "mermaid";

const result = await featherdown.parse(markdown);
mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
```

## Node usage

Import **`Featherdown` from `featherdown/node`** for filesystem helpers and optional Mermaid.

```ts
import { Featherdown } from "featherdown/node";

const featherdown = new Featherdown({
  frontmatter: "auto",
});

const result = await featherdown.parseFile("./posts/hello.md");
```

- **`parseFile(path)`** reads UTF-8 and returns the same **`FeatherdownResult`** as **`parse(markdown)`** for the same file contents and options.

## Mermaid (Node only)

Inline SVG Mermaid is available **only** through the Node entry, with **`mermaid: { render: "svg" }`**. There is **no** placeholder-only mode documented today.

```ts
import { Featherdown } from "featherdown/node";

const featherdown = new Featherdown({
  mermaid: {
    render: "svg",
  },
});

const result = await featherdown.parse(markdown);
```

- Uses **`rehype-mermaid`** and may require the **optional Playwright / Chromium** peer setup (`playwright` + `npx playwright install chromium`). Failures can be **environment-sensitive** in CI.
- Valid diagrams become inline **SVG** in `html`; **`result.assets.features.mermaid`** is **`true`** when this path is active.
- The Node Mermaid pipeline is the default pipeline plus a Mermaid stage: author content gets the same strict sanitize pass, then Mermaid SVG output gets a second, **SVG-aware sanitize** pass. Non-Mermaid output matches the browser entry.

The default **`featherdown`** entry remains Mermaid-free for bundle safety.

## Advanced and compatibility APIs

### `featherdown/advanced`

The advanced subpath is for **existing low-level unified integrations**. Most applications should use **`Featherdown`**. The subpath exists for **existing unified pipelines** and low-level compatibility:

```ts
import {
  createMarkdownProcessor,
  rehypeChartBlocks,
  rehypeCdnImages,
} from "featherdown/advanced";
```

The same symbols are still re-exported from the **root** package, but those root re-exports are **deprecated** and will be removed in a future minor release—import them from **`featherdown/advanced`**.

### Legacy function exports (`featherdown/legacy`)

Older helpers (`renderMarkdownToHtml`, `renderMarkdown`, `renderMarkdownDocument`, `parseMarkdownFile`) live in **`featherdown/legacy`**:

```ts
import { renderMarkdownToHtml } from "featherdown/legacy";
```

They are still re-exported from the package root, marked **`@deprecated`**, for one more minor release; switch imports to **`featherdown/legacy`** (or migrate to **`Featherdown`**) before the root re-exports are removed. They take **`RenderMarkdownOptions`**, not the full **`FeatherdownOptions`** surface (for example **`math`**, **`code`**, **`charts`**, **`frontmatter`**, **`alerts`**, **`links`**, **`images`**, **`embeds`**, and **`diagnostics: "strict"`** are **`Featherdown`** features). Their output does not include these enhancements. Prefer **`new Featherdown().parse()`** for new code.

## Migration from legacy helpers

Legacy helpers remain available for compatibility, but new code should use **`Featherdown`**.

For default rendering behavior (what the legacy helpers covered under **`RenderMarkdownOptions`**), the closest migration is:

```ts
// Before
const html = await renderMarkdownToHtml(markdown);

// After
const { html } = await new Featherdown().parse(markdown);
```

> **Migration note:** The legacy helpers are kept for compatibility and use the older **`RenderMarkdownOptions`** surface. They are not a full alias for **`FeatherdownOptions`**. For feature gates such as **`math`**, **`code`**, **`charts`**, **`frontmatter`**, **`alerts`**, **`links`**, **`images`**, **`embeds`**, and **`diagnostics: "strict"`**, use the **`Featherdown`** class.

| Legacy | Prefer |
| --- | --- |
| `renderMarkdownToHtml(md, opts)` | `(await new Featherdown().parse(md)).html` — legacy **`opts`** only apply the older options shape; pass **`FeatherdownOptions`** on **`Featherdown`** when you need feature gates |
| `renderMarkdown(md, opts)` | `await new Featherdown().parse(md)` — use **`r.html`** and **`r.diagnostics`**; same **`RenderMarkdownOptions`** limitation as above |
| `renderMarkdownDocument(md, opts)` | `await new Featherdown().parse(md)` for the default document pipeline when **`opts`** are legacy **`RenderMarkdownOptions`**. The **`Featherdown`** result adds **`body`**, **`frontmatter`**, **`assets`**, and related fields—configure **`Featherdown`** directly if you need **`FeatherdownOptions`** (not understood by the helper) |
| `parseMarkdownFile(md)` | `new Featherdown({ frontmatter: "auto" }).parse(md)` returns **`frontmatter`**, **`metadata`**, **`body`**, and **`html`** in one result. Keep **`parseMarkdownFile`** only when you need its strict **`{ frontMatter, content }`** contract |
| `renderMarkdownToHtmlWithMermaid(md, opts)` (Node) | `new Featherdown({ mermaid: { render: "svg" } }).parse(md)` then read **`html`** from **`featherdown/node`** — add **`kind`**, **`manifest`**, and other options in the same object as needed; **do not spread** an options object that might already define **`mermaid`** (merge carefully or use a dedicated instance). Legacy **`opts`** remain **`RenderMarkdownOptions`**-shaped |
| `createMarkdownProcessor(opts)` | **`Featherdown`** for normal use; **`featherdown/advanced`** only for custom unified graphs |

**Strict diagnostics:** **`diagnostics: "strict"`** exists only on **`Featherdown`**; legacy render helpers do not use it.

## Public API summary

**Primary**

- **`Featherdown`**, **`FeatherdownOptions`**, **`FeatherdownParseOptions`**, **`FeatherdownResult`**, and related types from **`featherdown`**, including the option and result types `FeatherdownLinkOptions`, `FeatherdownImageOptions`, `FeatherdownEmbedOptions`, `FeatherdownEmbedProvider`, `FeatherdownPlugins`, and `TocTreeItem`.

**Node**

- **`Featherdown`** from **`featherdown/node`** with optional **`NodeFeatherdownOptions`** / Mermaid config.

**Styles (package exports)**

- `featherdown/styles.css`, `featherdown/styles/base.css`, `featherdown/styles/katex.css`, `featherdown/styles/code.css`, `featherdown/styles/highlight.css`

**Compatibility (deprecated)**

- Legacy render helpers and **`parseMarkdownFile`** from **`featherdown/legacy`** (still re-exported from the root for now); **`renderMarkdownToHtmlWithMermaid`** on **`featherdown/node`**; **`featherdown/advanced`** for processor/plugins.

## Scripts

| Script | Description |
| --- | --- |
| `npm run build` | Build ESM artifacts in `dist/` |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript `--noEmit` |
| `npm run test:exports` | Build + export smoke checks |

## Site

A demo site lives in **`site/`**.

```bash
npm run site:install
npm run site:dev
```

Build:

```bash
npm run site:build
```

GitHub Pages base path:

```bash
SITE_BASE_PATH=/featherdown/ npm run site:build
```

## Maintainers

CI and publishing: [RELEASING.md](./RELEASING.md).

## License

MIT. See [LICENSE](./LICENSE).
