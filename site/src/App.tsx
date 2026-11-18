import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { Featherdown, type FeatherdownResult, type RenderDiagnostic } from "featherdown";

type PlaygroundTab = "preview" | "result" | "diagnostics" | "assets";
type PresetId = "release" | "technical" | "math" | "diagnostics";
type Theme = "light" | "dark";

const githubUrl = "https://github.com/karuifeather/featherdown";
const npmUrl = "https://www.npmjs.com/package/featherdown";
const releasePresetMarkdown = `---
title: Spring Platform Update
description: Faster publishing, cleaner previews, and safer release workflows.
date: 2026-05-05
status: published
tags:
  - release-notes
  - product
author: Product Team
---

# Spring Platform Update

Teams can now draft content once, preview it safely, and ship across docs, changelogs, and in-app release notes from the same Markdown source.

:::tip[Available today]
The new publishing flow is live for all workspaces.
:::

## Highlights

- Faster rendering across large workspaces.
- Cleaner preview cards with metadata, excerpts, and reading time.
- Safer publishing checks before content goes live.
- One source can now produce page HTML, navigation data, diagnostics, and asset hints.

## What changed

Release pages now produce structured publishing data during the same parse that renders the page.

| Output | Used for |
| --- | --- |
| \`html\` | Published page body |
| \`metadata.title\` | Release card heading |
| \`excerpt\` | Dashboard preview text |
| \`toc\` | In-page navigation |
| \`diagnostics\` | Authoring and CI checks |
| \`assets.styles\` | CSS import hints |

## Rollout progress

\`\`\`chart-line
{"labels":["Week 1","Week 2","Week 3","Week 4"],"datasets":[{"label":"Pages migrated","data":[12,28,46,73]},{"label":"Preview coverage","data":[18,41,66,88]}]}
\`\`\`

## Publishing flow

The same Markdown file now drives the full publishing pipeline.

\`\`\`mermaid
flowchart LR
  A[Draft markdown] --> B[Featherdown parse]
  B --> C[Sanitized HTML]
  B --> D[Metadata]
  B --> E[TOC]
  B --> F[Diagnostics]
  B --> G[Asset hints]
\`\`\`

:::note[Mermaid preview]
This demo hydrates Mermaid diagrams client-side for live preview. Build-time SVG rendering is available through \`featherdown/node\`.
:::

## Release checklist

- [x] Metadata appears on release cards.
- [x] Table of contents is generated from headings.
- [x] Diagnostics are visible before publishing.
- [x] Chart and Mermaid blocks render in the preview.
- [ ] Final launch image is attached.

## Final note

This update is about reducing duplicate publishing work. Writers stay in Markdown, product teams get structured release data, and engineers keep browser and Node rendering boundaries clean.
`;

const technicalPresetMarkdown = `---
title: Markdown Publishing System Design
description: Architecture notes for rendering one Markdown source into publishable product content.
status: draft
tags:
  - system-design
  - docs
  - architecture
---

# Markdown Publishing System Design

This note describes a publishing pipeline where one Markdown source becomes rendered HTML, metadata, navigation data, diagnostics, and asset hints.

:::note[Design goal]
The browser preview should stay fast and safe. Build-only work, such as file access and Mermaid SVG rendering, should stay in the Node pipeline.
:::

## Requirements

| Requirement | Why it matters |
| --- | --- |
| Browser-safe rendering | Product previews should not pull in Node-only dependencies. |
| Structured metadata | Docs cards, changelogs, and search indexes need consistent page data. |
| TOC generation | Long-form docs need navigation without a second parser. |
| Diagnostics | Authors should see content issues before publishing. |
| Explicit CSS assets | Apps should control when and how styles load. |

## High-level architecture

\`\`\`mermaid
flowchart LR
  A[Markdown source] --> B[Featherdown parse]
  B --> C[Sanitized HTML]
  B --> D[Metadata]
  B --> E[Headings + TOC]
  B --> F[Diagnostics]
  B --> G[Asset hints]

  H[App preview] --> B
  I[Node publish job] --> J[featherdown/node]
  J --> K[parseFile]
  J --> L[Mermaid SVG]
\`\`\`

## Runtime boundary

The default package entry is optimized for app previews and browser-safe rendering.

\`\`\`ts title="previewRenderer.ts" {3-8} showLineNumbers showCopyButton
import { Featherdown } from "featherdown";

export const previewRenderer = new Featherdown({
  frontmatter: "auto",
  sanitize: true,
  diagnostics: "warn",
  headings: {
    toc: true,
  },
});
\`\`\`

The Node entry is used by publishing jobs that need filesystem access or build-time diagram rendering.

\`\`\`ts title="publishPage.ts" {1,4-8,11} showLineNumbers showCopyButton
import { Featherdown } from "featherdown/node";

const publisher = new Featherdown({
  frontmatter: "auto",
  diagnostics: "strict",
  mermaid: {
    render: "svg",
  },
});

const result = await publisher.parseFile("./content/system-design.md");
\`\`\`

:::tip[Boundary rule]
If a feature needs filesystem access, Chromium, or build-only rendering, keep it in \`featherdown/node\`. The default \`featherdown\` entry should remain browser-safe.
:::

## Output contract

A single parse returns the document body and the publishing data the app needs.

| Result field | Consumer |
| --- | --- |
| \`html\` | Page renderer |
| \`metadata\` | Search index and preview cards |
| \`headings\` | Editor tooling |
| \`toc\` | In-page navigation |
| \`diagnostics\` | Authoring UI and CI checks |
| \`assets.styles\` | CSS loading strategy |
| \`stats\` | Reading-time display |

## Client-side Mermaid previews

For live browser previews, Mermaid can be hydrated by the app after Featherdown renders the Markdown.

\`\`\`ts title="hydrateMermaid.ts" {5-10} showLineNumbers showCopyButton
import mermaid from "mermaid";

const result = await previewRenderer.parse(markdown);

mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

for (const block of document.querySelectorAll("code.language-mermaid")) {
  const source = block.textContent ?? "";
  const { svg } = await mermaid.render(\`diagram-\${crypto.randomUUID()}\`, source);
  block.closest("pre")?.replaceWith(
    Object.assign(document.createElement("div"), { innerHTML: svg }),
  );
}
\`\`\`

:::warning[App-level hydration]
Client-side Mermaid preview is an application enhancement. It is not bundled into the default Featherdown browser entry.
:::

## Failure handling

Publishing jobs can treat diagnostics as release blockers.

\`\`\`ts title="publishWithStrictDiagnostics.ts" {2,7,12-15} showLineNumbers showCopyButton
import {
  Featherdown,
  FeatherdownDiagnosticsError,
} from "featherdown/node";

const publisher = new Featherdown({
  diagnostics: "strict",
});

try {
  await publisher.parseFile("./content/system-design.md");
} catch (error) {
  if (error instanceof FeatherdownDiagnosticsError) {
    console.error(error.diagnostics);
  }

  throw error;
}
\`\`\`

## Trade-offs

| Choice | Benefit | Cost |
| --- | --- | --- |
| Browser-safe default entry | Smaller, safer app previews | Mermaid SVG rendering moves to Node or app hydration |
| Explicit CSS imports | Apps control styling | Consumers must import package CSS |
| Diagnostics in result | Editors can show warnings inline | Strict mode needs explicit opt-in |
| Advanced API in subpath | Main API stays simple | Power users import from \`featherdown/advanced\` |

## Rollout checklist

- [x] Use \`Featherdown\` as the primary parser.
- [x] Enable \`frontmatter: "auto"\` for publishing metadata.
- [x] Use warning diagnostics in live previews.
- [x] Use strict diagnostics in publishing jobs.
- [x] Keep Node-only diagram rendering in \`featherdown/node\`.
- [ ] Add visual regression tests for rendered docs.

## Summary

The system keeps the common path simple: one configured parser, one \`parse()\` call, and one rich result.

Build-only work stays out of the browser bundle, while applications still have an escape hatch for live previews and advanced processor control.
`;

const mathPresetMarkdown = `---
title: Curved Spacetime Notes
description: A compact technical note on how general relativity describes gravity as geometry.
status: draft
tags:
  - physics
  - relativity
  - spacetime
---

# Curved Spacetime Notes

General relativity does not describe gravity as an invisible force pulling objects together. It describes gravity as the shape of spacetime itself.

Mass and energy tell spacetime how to curve. Curved spacetime tells matter how to move.

:::note[Core idea]
In Newtonian gravity, objects fall because a force acts on them. In general relativity, freely falling objects follow the straightest possible paths through curved spacetime.
:::

## Einstein's field equation

The central equation connects spacetime geometry to energy and momentum:

$$
G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu}
=
\\frac{8\\pi G}{c^4}T_{\\mu\\nu}
$$

A useful way to read it:

| Term | Meaning |
| --- | --- |
| $G_{\\mu\\nu}$ | curvature of spacetime |
| $\\Lambda g_{\\mu\\nu}$ | cosmological constant term |
| $T_{\\mu\\nu}$ | energy, momentum, pressure, and stress |
| $\\frac{8\\pi G}{c^4}$ | coupling between matter and geometry |

The equation is compact, but it carries a huge idea: gravity is not placed inside spacetime. Gravity is spacetime geometry.

## Falling is geometry

A freely falling particle follows a geodesic. In curved spacetime, that path is described by:

$$
\\frac{d^2 x^\\mu}{d\\tau^2}
+
\\Gamma^\\mu_{\\alpha\\beta}
\\frac{dx^\\alpha}{d\\tau}
\\frac{dx^\\beta}{d\\tau}
=
0
$$

The symbol $\\Gamma^\\mu_{\\alpha\\beta}$ captures how coordinates bend and shift from point to point. If spacetime is flat, the path looks like ordinary straight-line motion. If spacetime is curved, the straightest path can look like an orbit or a fall.

:::tip[Why orbits happen]
The Moon is not constantly "correcting" its path around Earth. It is moving along a curved spacetime path shaped mostly by Earth's mass.
:::

## Time runs differently near mass

Near a non-rotating spherical mass, gravitational time dilation can be approximated by:

$$
\\Delta t_\\text{far}
=
\\frac{\\Delta t_\\text{near}}
{\\sqrt{1 - \\frac{2GM}{rc^2}}}
$$

As $r$ gets smaller, the denominator shrinks. That means a clock closer to the mass ticks more slowly compared with a clock far away.

This effect is tiny near Earth's surface, but it matters for precision systems like satellite navigation.

## The Schwarzschild radius

For a mass $M$, the Schwarzschild radius is:

$$
r_s = \\frac{2GM}{c^2}
$$

If an object's mass is compressed within this radius, the escape velocity reaches the speed of light. That boundary is the event horizon of a non-rotating black hole.

\`\`\`ts title="schwarzschildRadius.ts" {6} showLineNumbers showCopyButton
const G = 6.67430e-11;
const c = 299_792_458;

export function schwarzschildRadius(massKg: number) {
  return (2 * G * massKg) / c ** 2;
}
\`\`\`

## A compact mental model

- Matter does not simply sit inside spacetime.
- Matter changes spacetime's geometry.
- Objects follow geodesics through that geometry.
- Strong gravity also changes the rate at which time passes.

:::warning[Common misconception]
General relativity does not say "gravity is fake." It says the thing we experience as gravity is better modeled as curvature than as a traditional force.
:::

## Final intuition

A planet orbiting a star is not being dragged around by a mysterious thread. It is moving through a curved four-dimensional landscape, following the straightest path available to it.
`;

const diagnosticsPresetMarkdown = `---
title: Release QA Diagnostics
description: A draft release note with intentional authoring issues for diagnostics testing.
status: review
tags:
  - diagnostics
  - qa
  - release-notes
---

# Release QA Diagnostics

This draft intentionally includes a few content issues so the preview can show how diagnostics help authors catch problems before publishing.

:::warning[Review mode]
This page is safe to preview, but it should not be published until the diagnostics panel is clean.
:::

## Broken rollout chart

The chart below has invalid JSON. Featherdown should keep rendering the page, but surface a diagnostic so the editor or CI pipeline can point the author to the issue.

\`\`\`chart-line
{"labels":["Week 1","Week 2","Week 3"],"datasets":[{"label":"Adoption","data":[12,28,}
\`\`\`

## Missing chart data

This chart has the right fence type, but the payload is incomplete for a useful chart preview.

\`\`\`chart-bar
{"labels":["Docs","Changelog","In-app"],"datasets":[]}
\`\`\`

## Valid content still renders

Even when diagnostics are present, normal Markdown should continue to render in warning mode.

| Check | Status |
| --- | --- |
| Front matter parsed | Ready |
| HTML preview | Ready |
| Diagnostics panel | Needs review |
| Publish gate | Block in strict mode |

\`\`\`ts title="diagnosticsMode.ts" {4,8-9} showLineNumbers showCopyButton
import { Featherdown } from "featherdown";

const featherdown = new Featherdown({
  diagnostics: "warn",
});

const result = await featherdown.parse(markdown);

console.log(result.diagnostics);
\`\`\`

:::tip[Use strict mode in CI]
In a publishing pipeline, switch to \`diagnostics: "strict"\` so diagnostics fail the build instead of only appearing in the result.
:::

## Author checklist

- [x] Confirm the page still previews.
- [x] Review diagnostics in the side panel.
- [ ] Fix invalid chart JSON.
- [ ] Add real chart data.
- [ ] Re-run strict diagnostics before publishing.
`;

const presetMap: Record<PresetId, { label: string; markdown: string }> = {
  release: { label: "Release note", markdown: releasePresetMarkdown },
  technical: { label: "Technical doc", markdown: technicalPresetMarkdown },
  math: { label: "Math post", markdown: mathPresetMarkdown },
  diagnostics: { label: "Diagnostics example", markdown: diagnosticsPresetMarkdown },
};

const defaultManifest = {
  kind: "post",
  slug: "playground",
  manifest: {
    map: {
      "post/playground/images/logo.png": { url: "https://cdn.example.com/featherdown/logo.hash.png" },
    },
  },
};


type FeatherdownConfig = NonNullable<ConstructorParameters<typeof Featherdown>[0]>;

const installSnippet = "npm install featherdown";

const heroMarkdown = `---
title: Shipping notes
tags: [release, docs]
---

# Shipping notes

Inline math works: $E = mc^2$.

> [!TIP] Callouts
> GitHub-style alerts render out of the box.

## What changed

\`\`\`ts title="parse.ts" {2}
const result = await fd.parse(md);
console.log(result.metadata.title);
\`\`\`
`;

const heroCode = `import { Featherdown } from "featherdown";
import "featherdown/styles.css";

const fd = new Featherdown({ frontmatter: "auto", math: true });
const result = await fd.parse(markdown);`;

const diyImports = `import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import matter from "gray-matter";
import readingTime from "reading-time";`;

const diyBody = `const { data, content } = matter(source);

const file = await unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeSanitize, myHandTunedSchema) // keep KaTeX + hljs classes alive
  .use(rehypeSlug)
  .use(rehypeKatex)
  .use(rehypeHighlight)
  .use(rehypeStringify)
  .process(content);

const html = String(file);
const toc = buildToc(file);            // write it yourself
const excerpt = buildExcerpt(html);    // write it yourself
const stats = readingTime(content);
const problems = lint(content);        // write it yourself`;

const withCode = `import { Featherdown } from "featherdown";

const fd = new Featherdown({ frontmatter: "auto", math: true });
const result = await fd.parse(source);

result.html          // sanitized, with math + highlighted code
result.metadata      // typed front matter
result.toc           // headings, ready for navigation
result.excerpt       // plain-text summary
result.stats         // word count + reading time
result.diagnostics   // what went wrong, with codes
result.assets.styles // which CSS this page needs`;

type Cell = "built" | "plugin" | "diy";
const cellLabel: Record<Cell, string> = { built: "Built in", plugin: "Plugin", diy: "Bring your own" };

const comparisonRows: { feature: string; cells: [Cell, Cell, Cell, Cell] }[] = [
  { feature: "Sanitized HTML by default", cells: ["built", "diy", "plugin", "plugin"] },
  { feature: "Front matter → typed metadata", cells: ["built", "diy", "plugin", "plugin"] },
  { feature: "TOC and heading data", cells: ["built", "diy", "plugin", "plugin"] },
  { feature: "Excerpt and reading time", cells: ["built", "diy", "diy", "diy"] },
  { feature: "Math (KaTeX)", cells: ["built", "plugin", "plugin", "plugin"] },
  { feature: "Syntax highlighting", cells: ["built", "plugin", "plugin", "plugin"] },
  { feature: "Callouts and GitHub alerts", cells: ["built", "plugin", "plugin", "plugin"] },
  { feature: "Allowlisted embeds (YouTube, CodePen…)", cells: ["built", "diy", "diy", "diy"] },
  { feature: "Diagnostics, strict mode for CI", cells: ["built", "diy", "diy", "diy"] },
  { feature: "Which CSS this page needs", cells: ["built", "diy", "diy", "diy"] },
];

const featureDemos: {
  title: string;
  body: string;
  source: string;
  options?: FeatherdownConfig;
  showDiagnostics?: boolean;
}[] = [
  {
    title: "Alerts and callouts",
    body: "GitHub alert syntax and :::directives share one set of callout classes.",
    source: `> [!WARNING] Heads up
> Migrations run **before** deploy.

:::tip[Directive style]
Same output, your choice of syntax.
:::`,
  },
  {
    title: "Collapsible sections",
    body: "Native <details>, with callouts allowed inside.",
    source: `:::details[Rollback steps]{open}
1. Revert the release tag.
2. Re-run the pipeline.
:::`,
  },
  {
    title: "Code that reads well",
    body: "Titles, line highlights, line numbers and diff markers, from the fence line.",
    source: `\`\`\`ts title="config.ts" {2} showLineNumbers
const a = 1;
const b = 2; // highlighted
\`\`\``,
    options: { code: true },
  },
  {
    title: "Embeds without the risk",
    body: "Opt in, and only allowlisted providers ever render. Everything else is dropped and reported.",
    source: `::vimeo[Conference talk]{id="76979871"}

::embed{src="https://evil.example/embed"}`,
    options: { embeds: true },
    showDiagnostics: true,
  },
  {
    title: "Diagnostics you can act on",
    body: "Bad chart JSON doesn't crash the page. It becomes a coded diagnostic. Use strict mode to fail the build.",
    source: `\`\`\`chart-line
{"labels":["A","B"],"datasets":[}
\`\`\``,
    showDiagnostics: true,
  },
  {
    title: "Math and footnotes",
    body: "KaTeX output and GFM footnotes with working links.",
    source: `Euler[^1]: $e^{i\\pi} + 1 = 0$

[^1]: Often called the most beautiful identity.`,
    options: { math: true },
  },
];

function encodeUtf8Base64(value: string): string {
  return btoa(
    encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    ),
  );
}

function decodeUtf8Base64(value: string): string {
  return decodeURIComponent(
    Array.from(atob(value), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase()}`).join(""),
  );
}

function useLiveParse(source: string, options: FeatherdownConfig) {
  const [result, setResult] = useState<FeatherdownResult | null>(null);
  const instance = useMemo(() => new Featherdown(options), [options]);
  useEffect(() => {
    let cancelled = false;
    instance
      .parse(source)
      .then((parsed) => {
        if (!cancelled) setResult(parsed);
      })
      .catch(() => {
        if (!cancelled) setResult(null);
      });
    return () => {
      cancelled = true;
    };
  }, [instance, source]);
  return result;
}

const demoBaseOptions: FeatherdownConfig = { diagnostics: "warn" };

function DiagnosticList({ items }: { items: RenderDiagnostic[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="diag-chips">
      {items.map((item, idx) => (
        <li key={`${item.code}-${idx}`}>
          <code>{item.code}</code>
          <span>{item.message}</span>
        </li>
      ))}
    </ul>
  );
}

function FeatureDemo({ demo }: { demo: (typeof featureDemos)[number] }) {
  const options = useMemo<FeatherdownConfig>(() => ({ ...demoBaseOptions, ...demo.options }), [demo.options]);
  const result = useLiveParse(demo.source, options);
  return (
    <article className="demo-card">
      <h3>{demo.title}</h3>
      <p>{demo.body}</p>
      <div className="demo-io">
        <div className="demo-pane">
          <span className="pane-label">Markdown</span>
          <pre><code>{demo.source}</code></pre>
        </div>
        <div className="demo-pane">
          <span className="pane-label">Result</span>
          <div className="featherdown-content demo-render" dangerouslySetInnerHTML={{ __html: result?.html ?? "" }} />
          {demo.showDiagnostics && <DiagnosticList items={result?.diagnostics ?? []} />}
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const forced = new URLSearchParams(window.location.search).get("theme");
    if (forced === "light" || forced === "dark") return forced;
    try {
      const stored = window.localStorage.getItem("featherdown-site-theme");
      if (stored === "light" || stored === "dark") return stored;
    } catch {
      /* storage unavailable */
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [markdown, setMarkdown] = useState(releasePresetMarkdown);
  const [wrapLines, setWrapLines] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("featherdown-site-wrap") !== "off";
    } catch {
      return true;
    }
  });
  const editorExtensions = useMemo(
    () => (wrapLines ? [markdownLanguage(), EditorView.lineWrapping] : [markdownLanguage()]),
    [wrapLines],
  );
  const [activeTab, setActiveTab] = useState<PlaygroundTab>("preview");
  const [activePreset, setActivePreset] = useState<PresetId>("release");
  const [result, setResult] = useState<FeatherdownResult | null>(null);
  const featherdown = useMemo(() => new Featherdown({ ...defaultManifest, frontmatter: "auto", math: true }), []);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const previewRef = useRef<HTMLDivElement>(null);
  const mermaidIdRef = useRef(0);

  const heroOptions = useMemo<FeatherdownConfig>(() => ({ frontmatter: "auto", math: true, diagnostics: "warn" }), []);
  const heroResult = useLiveParse(heroMarkdown, heroOptions);

  const diagnostics = result?.diagnostics ?? [];
  const outputTabs: PlaygroundTab[] = ["preview", "result", "diagnostics", "assets"];

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get("md");
    if (!encoded) return;
    try {
      setMarkdown(decodeUtf8Base64(encoded));
    } catch {
      setErrorMessage("Could not decode URL state.");
    }
  }, []);

  useEffect(() => {
    const next = new URL(window.location.href);
    next.searchParams.set("md", encodeUtf8Base64(markdown));
    window.history.replaceState({}, "", next.toString());
  }, [markdown]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem("featherdown-site-theme", theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    async function runRender() {
      setIsRendering(true);
      setErrorMessage(null);
      try {
        const parsed = await featherdown.parse(markdown);
        if (!cancelled) setResult(parsed);
      } catch (error) {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : "Unknown render error.");
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    }
    void runRender();
    return () => {
      cancelled = true;
    };
  }, [markdown, featherdown]);

  // Code-block copy buttons. Depends on activeTab so it re-binds when the preview mounts.
  useEffect(() => {
    if (activeTab !== "preview") return;
    const root = previewRef.current;
    if (!root) return;
    const onClick = async (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest<HTMLButtonElement>("[data-code-copy]");
      const copyTarget = button?.getAttribute("data-code-copy-target");
      if (!button || !copyTarget) return;
      const codeNode = root.querySelector<HTMLElement>(`[data-code-copy-target="${copyTarget}"]`);
      if (!codeNode) return;
      try {
        await navigator.clipboard.writeText(codeNode.innerText);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Failed";
      }
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1200);
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "preview") return;
    const root = previewRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>(".chart-mount").forEach((mount) => {
      const rawType = String(mount.dataset.chart ?? "chart");
      let labels = 0;
      let datasets = 0;
      try {
        const parsed = JSON.parse(String(mount.dataset.chartData ?? "{}")) as { labels?: unknown[]; datasets?: unknown[] };
        labels = Array.isArray(parsed.labels) ? parsed.labels.length : 0;
        datasets = Array.isArray(parsed.datasets) ? parsed.datasets.length : 0;
      } catch {
        /* leave zeros */
      }
      mount.innerHTML = "";
      mount.classList.add("chart-placeholder");
      const title = document.createElement("strong");
      title.textContent = `chart-${rawType}`;
      const meta = document.createElement("span");
      meta.textContent = `${datasets} datasets · ${labels} labels`;
      const bars = document.createElement("div");
      bars.className = "chart-mini-bars";
      for (let idx = 0; idx < Math.max(4, Math.min(8, labels || 4)); idx += 1) {
        const bar = document.createElement("i");
        bar.style.height = `${28 + ((idx * 17) % 42)}%`;
        bars.append(bar);
      }
      const hint = document.createElement("small");
      hint.textContent = "Placeholder. Hydrate with your chart runtime.";
      mount.append(title, meta, bars, hint);
    });
  }, [activeTab, result?.html]);

  useEffect(() => {
    if (activeTab !== "preview") return;
    if (!previewRef.current) return;
    let cancelled = false;
    const selector = "pre code.language-mermaid, pre code[class*='language-mermaid']";

    async function hydrateMermaidBlocks() {
      const rootEl = previewRef.current;
      if (!rootEl) return;
      const candidates = Array.from(rootEl.querySelectorAll<HTMLElement>(selector));
      if (candidates.length === 0) return;

      let mermaidModule: { default: { initialize: (config: object) => void; render: (id: string, code: string) => Promise<{ svg: string }> } };
      try {
        mermaidModule = (await import("mermaid")) as typeof mermaidModule;
      } catch {
        return;
      }
      if (cancelled) return;
      mermaidModule.default.initialize({ startOnLoad: false, securityLevel: "strict", theme: theme === "dark" ? "dark" : "default" });

      for (const codeNode of candidates) {
        if (cancelled) break;
        if (codeNode.dataset.mermaidHydrated === "true") continue;
        const source = codeNode.textContent?.trim();
        if (!source) continue;
        codeNode.dataset.mermaidHydrated = "true";
        const block = codeNode.closest<HTMLElement>(".code-block") ?? codeNode.closest<HTMLElement>("pre");
        if (!block) continue;
        try {
          mermaidIdRef.current += 1;
          const { svg } = await mermaidModule.default.render(`fd-mermaid-${mermaidIdRef.current}`, source);
          if (cancelled) break;
          const wrapper = document.createElement("figure");
          wrapper.className = "mermaid-diagram-card";
          const body = document.createElement("div");
          body.className = "mermaid-diagram-body";
          body.innerHTML = svg;
          wrapper.append(body);
          block.replaceWith(wrapper);
        } catch {
          block.classList.add("mermaid-source-fallback");
        }
      }
    }

    void hydrateMermaidBlocks();
    return () => {
      cancelled = true;
    };
  }, [activeTab, result?.html, theme]);

  function toggleWrap() {
    setWrapLines((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("featherdown-site-wrap", next ? "on" : "off");
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyLabel("Copied");
    } catch {
      setCopyLabel("Copy failed");
    }
    window.setTimeout(() => setCopyLabel("Copy"), 1200);
  }

  function applyPreset(preset: PresetId) {
    setActivePreset(preset);
    setMarkdown(presetMap[preset].markdown);
  }

  const heroFeatures = Object.entries(heroResult?.assets.features ?? {})
    .filter(([, on]) => Boolean(on))
    .map(([name]) => name);

  return (
    <div className="app-shell">
      <nav className="topbar">
        <div className="container topbar-inner">
          <a className="brand" href="#top">featherdown</a>
          <div className="topbar-links">
            <a href="#compare">Compare</a>
            <a href="#features">Features</a>
            <a href="#playground">Playground</a>
            <a href="#start">Get started</a>
            <a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>
            <button className="theme-toggle" type="button" onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}>
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </div>
      </nav>

      <header id="top" className="hero">
        <div className="container">
          <div className="hero-copy-block">
            <h1>One call. Everything a publishing page needs.</h1>
            <p className="hero-sub">
              Give featherdown Markdown. Get back sanitized HTML, typed metadata, a table of contents, an excerpt, reading time, diagnostics
              and the CSS to load. No unified pipeline to wire, no plugin matrix to maintain.
            </p>
            <div className="cta-row">
              <button type="button" className="install-pill" onClick={() => copyText(installSnippet)}>
                <span className="prompt">$</span> {installSnippet}
                <span className="copy-tag">{copyLabel}</span>
              </button>
              <a className="btn btn-primary" href="#playground">Try the playground</a>
              <a className="btn" href="#compare">See how it compares</a>
            </div>
          </div>

          <div className="hero-demo">
            <div className="hero-col">
              <span className="pane-label">Your code</span>
              <pre className="code-surface"><code>{heroCode}</code></pre>
              <span className="pane-label">Your Markdown</span>
              <pre className="code-surface"><code>{heroMarkdown}</code></pre>
            </div>
            <div className="hero-arrow" aria-hidden="true">→</div>
            <div className="hero-col">
              <span className="pane-label">result.html</span>
              <div className="featherdown-content hero-render" dangerouslySetInnerHTML={{ __html: heroResult?.html ?? "" }} />
              <span className="pane-label">Plus, from the same parse</span>
              <dl className="result-list">
                <div><dt>metadata.title</dt><dd>{heroResult?.metadata.title ?? "…"}</dd></div>
                <div><dt>metadata.tags</dt><dd>{heroResult?.metadata.tags?.join(", ") ?? "…"}</dd></div>
                <div><dt>toc</dt><dd>{heroResult?.toc.map((t) => t.text).join(" · ") ?? "…"}</dd></div>
                <div><dt>stats</dt><dd>{heroResult ? `${heroResult.stats.wordCount} words · ${heroResult.stats.readingTimeMinutes} min` : "…"}</dd></div>
                <div><dt>diagnostics</dt><dd>{heroResult ? `${heroResult.diagnostics.length} issues` : "…"}</dd></div>
                <div><dt>assets.features</dt><dd>{heroFeatures.join(", ") || "none"}</dd></div>
              </dl>
            </div>
          </div>
          <p className="hero-foot">This block is rendered live by the package, not a screenshot.</p>
        </div>
      </header>

      <main>
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>The same job, with and without it</h2>
              <p>
                Rendering Markdown safely is easy. Getting HTML <em>and</em> the data around it is where a hand-built pipeline grows.
              </p>
            </div>
            <div className="versus">
              <article className="versus-card versus-without">
                <header>
                  <h3>Hand-wired unified</h3>
                  <span className="versus-stat">12 packages · 3 helpers you write</span>
                </header>
                <pre className="code-surface"><code>{diyImports}</code></pre>
                <pre className="code-surface"><code>{diyBody}</code></pre>
              </article>
              <article className="versus-card versus-with">
                <header>
                  <h3>featherdown</h3>
                  <span className="versus-stat">1 package · 0 helpers</span>
                </header>
                <pre className="code-surface"><code>{withCode}</code></pre>
                <p className="versus-note">
                  Sanitization runs <strong>before</strong> featherdown adds its own markup, so KaTeX and code chrome survive while hostile HTML does
                  not. That ordering is easy to get wrong by hand.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="compare" className="section tint">
          <div className="container">
            <div className="section-head">
              <h2>How it compares</h2>
              <p>
                marked, markdown-it and remark are excellent parsers, and most of these gaps can be closed with extensions. featherdown's
                point is that you don't have to close them yourself.
              </p>
            </div>
            <div className="table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col">Out of the box</th>
                    <th scope="col" className="col-us">featherdown</th>
                    <th scope="col">marked</th>
                    <th scope="col">markdown-it</th>
                    <th scope="col">remark / unified</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.feature}>
                      <th scope="row">{row.feature}</th>
                      {row.cells.map((cell, idx) => (
                        <td key={idx} className={idx === 0 ? "col-us" : undefined}>
                          <span className={`cell cell-${cell}`}>{cellLabel[cell]}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fine-print">
              <strong>Built in</strong>: works with the default install. <strong>Plugin</strong>: an official or community extension exists.{" "}
              <strong>Bring your own</strong>: you write or integrate it. Judged on default behaviour. Need React components inside your
              content? That's MDX's job, and featherdown doesn't try to do it.
            </p>
          </div>
        </section>

        <section id="features" className="section">
          <div className="container">
            <div className="section-head">
              <h2>What you get, rendered live</h2>
              <p>Every example below is real Markdown, parsed in your browser by the package.</p>
            </div>
            <div className="demo-grid">
              {featureDemos.map((demo) => (
                <FeatureDemo key={demo.title} demo={demo} />
              ))}
            </div>
          </div>
        </section>

        <section id="playground" className="section tint">
          <div className="container">
            <div className="section-head">
              <h2>Playground</h2>
              <p>Edit on the left. Everything on the right comes from a single <code>parse()</code> call.</p>
            </div>
            <div className="pg-toolbar">
              <div className="preset-row" role="group" aria-label="Presets">
                {(Object.keys(presetMap) as PresetId[]).map((preset) => (
                  <button key={preset} className={activePreset === preset ? "chip active" : "chip"} onClick={() => applyPreset(preset)}>
                    {presetMap[preset].label}
                  </button>
                ))}
              </div>
              <button type="button" className={wrapLines ? "chip active" : "chip"} role="switch" aria-checked={wrapLines} onClick={toggleWrap}>
                Wrap lines: {wrapLines ? "on" : "off"}
              </button>
            </div>
            <div className="playground">
              <div className="pg-pane">
                <div className="pg-head"><span>Markdown</span></div>
                <div className="playground-editor">
                  <CodeMirror
                    className="playground-codemirror"
                    value={markdown}
                    height="100%"
                    theme={theme}
                    extensions={editorExtensions}
                    basicSetup={{ foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }}
                    onChange={(value) => setMarkdown(value)}
                    aria-label="Markdown editor"
                  />
                </div>
              </div>
              <div className="pg-pane">
                <div className="pg-head">
                  <div className="tabs" role="tablist" aria-label="Output">
                    {outputTabs.map((tab) => (
                      <button key={tab} role="tab" className={activeTab === tab ? "active" : ""} aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>
                        {tab[0].toUpperCase() + tab.slice(1)}
                        {tab === "diagnostics" && diagnostics.length > 0 ? <span className="badge">{diagnostics.length}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pg-output">
                  {errorMessage && <p className="error-message">{errorMessage}</p>}
                  {!errorMessage && activeTab === "preview" && (
                    <div ref={previewRef} className={`preview markdown-surface featherdown-content${wrapLines ? " wrap-code" : ""}`} dangerouslySetInnerHTML={{ __html: result?.html ?? "" }} />
                  )}
                  {!errorMessage && activeTab === "result" && (
                    <div className="result-pane">
                      {isRendering && !result && <p className="muted">Rendering…</p>}
                      {result && (
                        <pre className="json-view"><code>{JSON.stringify(
                          {
                            metadata: result.metadata,
                            stats: result.stats,
                            excerpt: result.excerpt,
                            toc: result.toc,
                            diagnostics: result.diagnostics.length,
                          },
                          null,
                          2,
                        )}</code></pre>
                      )}
                    </div>
                  )}
                  {!errorMessage && activeTab === "diagnostics" && (
                    <div className="result-pane">
                      {diagnostics.length === 0 ? (
                        <p className="muted">Clean parse. Load the “Diagnostics example” preset to see what an issue looks like.</p>
                      ) : (
                        <ul className="diagnostics-list">
                          {diagnostics.map((item: RenderDiagnostic, idx) => (
                            <li key={`${item.code}-${idx}`}>
                              <code>{item.code}</code> {item.message} <span>({item.source})</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {!errorMessage && activeTab === "assets" && (
                    <div className="result-pane">
                      <h4>Styles this document needs</h4>
                      <ul>
                        {(result?.assets.styles ?? []).map((style) => (
                          <li key={style}><code>{style}</code></li>
                        ))}
                      </ul>
                      <h4>Features detected</h4>
                      <ul>
                        {Object.entries(result?.assets.features ?? {}).map(([name, on]) => (
                          <li key={name}>{name}: {String(Boolean(on))}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="fine-print">
              Mermaid diagrams are hydrated client-side in this demo. For build-time SVG output, use <code>featherdown/node</code>.
            </p>
          </div>
        </section>

        <section id="start" className="section">
          <div className="container">
            <div className="section-head">
              <h2>Get started</h2>
              <p>Three steps, then pick the entry point that fits your runtime.</p>
            </div>
            <ol className="steps">
              <li>
                <h3>Install</h3>
                <pre className="code-surface"><code>{installSnippet}</code></pre>
              </li>
              <li>
                <h3>Parse</h3>
                <pre className="code-surface"><code>{`import { Featherdown } from "featherdown";

const fd = new Featherdown({ frontmatter: "auto" });
const { html, metadata, toc } = await fd.parse(md);`}</code></pre>
              </li>
              <li>
                <h3>Style</h3>
                <pre className="code-surface"><code>{`import "featherdown/styles.css";

// or load only what you need:
import "featherdown/styles/base.css";
import "featherdown/styles/code.css";`}</code></pre>
                <p>Use <code>result.assets.styles</code> in SSR to emit only the CSS a page uses. Or skip ours and style the <code>featherdown-content</code> classes yourself.</p>
              </li>
            </ol>
            <div className="entry-grid">
              <article className="entry-card">
                <h3>featherdown</h3>
                <p>Browser-safe. Use it for apps, editors and live previews.</p>
              </article>
              <article className="entry-card">
                <h3>featherdown/node</h3>
                <p><code>parseFile()</code> and build-time Mermaid SVG for publishing jobs.</p>
              </article>
              <article className="entry-card">
                <h3>JSR / Deno</h3>
                <p>Also published as <code>@karuifeather/featherdown</code>. Node 22+ for npm.</p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <p className="footer-version">featherdown v{__FEATHERDOWN_VERSION__}</p>
          <nav>
            <a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>
            <a href={npmUrl} target="_blank" rel="noreferrer">npm</a>
            <a href={`${githubUrl}/blob/main/LICENSE`} target="_blank" rel="noreferrer">License</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
