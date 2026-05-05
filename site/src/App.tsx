import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { Featherdown, type FeatherdownResult, type RenderDiagnostic } from "featherdown";

type PlaygroundTab = "preview" | "markdown" | "result" | "diagnostics" | "assets";
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

const storyCards = [
  {
    title: "Metadata",
    body: "Front matter becomes typed publishing metadata.",
    sample: "result.metadata.title",
  },
  {
    title: "Navigation",
    body: "Headings and TOC come from the same parse.",
    sample: "result.toc",
  },
  {
    title: "Diagnostics",
    body: "Warn in editors or fail builds with strict mode.",
    sample: "result.diagnostics",
  },
  {
    title: "Style assets",
    body: "Know which exported CSS paths the rendered document needs.",
    sample: "result.assets.styles",
  },
];

const installSnippet = "npm install featherdown";

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

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("featherdown-site-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [markdown, setMarkdown] = useState(releasePresetMarkdown);
  const [activeTab, setActiveTab] = useState<PlaygroundTab>("result");
  const [activePreset, setActivePreset] = useState<PresetId>("release");
  const [result, setResult] = useState<FeatherdownResult | null>(null);
  const featherdown = useMemo(
    () =>
      new Featherdown({
        ...defaultManifest,
        frontmatter: "auto",
      }),
    [],
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [installCopyLabel, setInstallCopyLabel] = useState("Copy install snippet");
  const [heroCopyLabel, setHeroCopyLabel] = useState("Click to copy");
  const [resetLabel, setResetLabel] = useState("Reset preset");
  const previewRef = useRef<HTMLDivElement>(null);
  const mermaidIdRef = useRef(0);

  const diagnostics = result?.diagnostics ?? [];
  const headingCount = result?.headings.length ?? 0;
  const wordCount = result?.wordCount ?? 0;
  const diagnosticCount = diagnostics.length;
  const heroBadges = ["Browser-safe default", "Front matter metadata", "Strict diagnostics", "Explicit CSS", "Node build tools"];
  const outputTabs: PlaygroundTab[] = ["result", "preview", "markdown", "diagnostics", "assets"];

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("md");
    if (!encoded) return;
    try {
      const decoded = decodeUtf8Base64(encoded);
      if (!cancelled) setMarkdown(decoded);
    } catch {
      if (!cancelled) setErrorMessage("Could not decode URL state.");
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const next = new URL(window.location.href);
    next.searchParams.set("md", encodeUtf8Base64(markdown));
    window.history.replaceState({}, "", next.toString());
  }, [markdown]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("featherdown-site-theme", theme);
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
    runRender();
    return () => {
      cancelled = true;
    };
  }, [markdown, featherdown]);

  useEffect(() => {
    if (activeTab !== "preview") return;
    const root = previewRef.current;
    if (!root) return;

    const onClick = async (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest<HTMLButtonElement>("[data-code-copy]");
      if (!button) return;
      const copyTarget = button.getAttribute("data-code-copy-target");
      if (!copyTarget) return;
      const codeNode = root.querySelector<HTMLElement>(`[data-code-copy-target="${copyTarget}"]`);
      if (!codeNode || !(codeNode instanceof HTMLElement)) return;
      await navigator.clipboard.writeText(codeNode.innerText);
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1200);
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    const mounts = root.querySelectorAll<HTMLElement>(".chart-mount");
    mounts.forEach((mount) => {
      const rawType = String(mount.dataset.chart ?? "chart");
      const rawData = String(mount.dataset.chartData ?? "{}");
      let labels = 0;
      let datasets = 0;
      try {
        const parsed = JSON.parse(rawData) as { labels?: unknown[]; datasets?: unknown[] };
        labels = Array.isArray(parsed.labels) ? parsed.labels.length : 0;
        datasets = Array.isArray(parsed.datasets) ? parsed.datasets.length : 0;
      } catch {
        labels = 0;
        datasets = 0;
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
      hint.textContent = "Demo placeholder - hydrate with your chart runtime.";
      mount.append(title, meta, bars, hint);
    });
  }, [activeTab, result?.html]);

  useEffect(() => {
    if (activeTab !== "preview") return;
    if (!previewRef.current) return;

    let cancelled = false;

    async function hydrateMermaidBlocks() {
      const rootEl = previewRef.current;
      if (!rootEl) return;
      const hasMermaidBlock = rootEl.querySelector(
        ".code-block pre code.language-mermaid, .code-block pre code[class*='language-mermaid'], pre code.language-mermaid, pre code[class*='language-mermaid']",
      );
      if (!hasMermaidBlock) return;
      const candidates = Array.from(
        rootEl.querySelectorAll<HTMLElement>(
          ".code-block pre code.language-mermaid, .code-block pre code[class*='language-mermaid'], pre code.language-mermaid, pre code[class*='language-mermaid']",
        ),
      );

      let mermaidModule: { default: { initialize: (config: object) => void; render: (id: string, code: string) => Promise<{ svg: string }> } };
      try {
        mermaidModule = (await import("mermaid")) as typeof mermaidModule;
      } catch {
        return;
      }
      if (cancelled) return;

      mermaidModule.default.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: theme === "dark" ? "dark" : "default",
      });

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
          const renderId = `fd-mermaid-${mermaidIdRef.current}`;
          const { svg } = await mermaidModule.default.render(renderId, source);
          if (cancelled) break;

          const wrapper = document.createElement("figure");
          wrapper.className = "mermaid-diagram-card";
          const body = document.createElement("div");
          body.className = "mermaid-diagram-body";
          body.innerHTML = svg;
          const caption = document.createElement("figcaption");
          caption.textContent = "Client-side Mermaid preview in demo.";
          wrapper.append(body, caption);
          block.replaceWith(wrapper);
        } catch {
          block.classList.add("mermaid-source-fallback");
          const note = document.createElement("p");
          note.className = "mermaid-fallback-note";
          note.textContent = "Mermaid preview failed. Showing source block.";
          block.insertAdjacentElement("afterend", note);
        }
      }
    }

    void hydrateMermaidBlocks();

    return () => {
      cancelled = true;
    };
  }, [activeTab, result?.html, theme]);

  const resultSummary = useMemo(() => {
    if (!result) return null;
    return {
      metadata: result.metadata,
      stats: result.stats,
      tocItems: result.toc.length,
      headingItems: result.headings.length,
      excerpt: result.excerpt,
      frontmatterKeys: Object.keys(result.frontmatter),
    };
  }, [result]);

  async function copyTextWithFeedback(value: string, setLabel: (next: string) => void, successText: string, idleText: string) {
    try {
      await navigator.clipboard.writeText(value);
      setLabel(successText);
    } catch {
      setLabel("Copy failed");
    } finally {
      window.setTimeout(() => setLabel(idleText), 1100);
    }
  }

  function applyPreset(preset: PresetId) {
    setActivePreset(preset);
    setMarkdown(presetMap[preset].markdown);
  }

  function resetPreset() {
    setMarkdown(presetMap[activePreset].markdown);
    setActiveTab("result");
    setResetLabel("Example reset");
    window.setTimeout(() => setResetLabel("Reset preset"), 1100);
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="container">
          <div className="hero-layout">
            <div className="hero-main">
              <div className="hero-top-row">
                <p className="eyebrow">featherdown</p>
                <button className="theme-toggle" type="button" onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}>
                  {theme === "dark" ? "Light" : "Dark"}
                </button>
              </div>
              <h1>Markdown in. Publishable content out.</h1>
              <p className="hero-copy">
                Featherdown turns one Markdown source into sanitized HTML, metadata, table-of-contents data, diagnostics, and style asset
                hints - without making you wire a full unified pipeline.
              </p>
              <div className="hero-metrics" aria-label="Package highlights">
                {heroBadges.map((badge) => (
                  <span key={badge}>{badge}</span>
                ))}
              </div>
              <div className="cta-row">
                <button
                  type="button"
                  className="cta-primary cta-install"
                  onClick={() => copyTextWithFeedback(installSnippet, setHeroCopyLabel, "Copied command", "Copy install")}
                >
                  npm install featherdown
                </button>
                <a className="cta-primary" href="#playground">Open playground</a>
                <a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>
              </div>
              <p className="copy-hint">{heroCopyLabel}</p>
            </div>
            <aside className="hero-aside">
              <p className="hero-aside-label">One parse transformation</p>
              <p className="hero-proof-title">Markdown source</p>
              <ul className="hero-proof-list">
                <li>front matter</li>
                <li>headings</li>
                <li>code</li>
                <li>charts</li>
              </ul>
              <p className="hero-arrow">→ FeatherdownResult</p>
              <ul className="hero-proof-list">
                <li>html</li>
                <li>metadata</li>
                <li>toc</li>
                <li>diagnostics</li>
                <li>assets.styles</li>
              </ul>
              <div className="hero-proof-stats" aria-label="Live render proof">
                <article><span>Headings</span><strong>{headingCount}</strong></article>
                <article><span>Word count</span><strong>{wordCount}</strong></article>
                <article><span>Diagnostics</span><strong>{diagnosticCount}</strong></article>
              </div>
            </aside>
          </div>
        </div>
      </header>

      <main>
        <section className="section muted-section">
          <div className="container">
            <div className="section-head">
              <h2>More than Markdown to HTML</h2>
              <p>Basic Markdown parsers stop at HTML. Featherdown gives publishing apps the document data they usually build by hand.</p>
            </div>
            <div className="feature-grid">
              {storyCards.map((card) => (
                <article key={card.title} className="feature-card">
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                  <pre><code>{card.sample}</code></pre>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Quick start</h2>
              <p>Install once, parse once, and ship HTML plus publishing data.</p>
            </div>
            <article className="feature-card feature-card-strong">
              <pre className="quickstart-snippet"><code>{`npm install featherdown`}</code></pre>
              <pre className="quickstart-snippet"><code>{`import { Featherdown } from "featherdown";
import "featherdown/styles.css";

const featherdown = new Featherdown({
  frontmatter: "auto",
});

const result = await featherdown.parse(markdown);`}</code></pre>
            </article>
          </div>
        </section>

        <section className="section muted-section">
          <div className="container">
            <div className="section-head">
              <h2>Style it your way</h2>
              <p>
                Featherdown ships CSS as explicit package exports, but it does not inject styles into your app. Start with the all-in
                stylesheet, load only the pieces you need, or bring your own Markdown and code-block theme.
              </p>
            </div>
            <div className="feature-grid style-grid">
              <article className="feature-card">
                <h3>Fastest setup</h3>
                <pre><code>{`import "featherdown/styles.css";`}</code></pre>
              </article>
              <article className="feature-card">
                <h3>Selective imports</h3>
                <pre><code>{`import "featherdown/styles/base.css";
import "featherdown/styles/katex.css";
import "featherdown/styles/code.css";`}</code></pre>
              </article>
              <article className="feature-card">
                <h3>Custom theme</h3>
                <pre><code>{`// Keep Featherdown's baseline layout styles if you want them.
import "featherdown/styles/base.css";

import "./markdown-theme.css";
import "./code-theme.css";`}</code></pre>
                <p>Start from <code>base.css</code> and override it, or skip it and fully own rendered Markdown styles in your app.</p>
                <p>Code highlighting uses highlight.js-style <code>hljs</code> token classes, so custom themes can target <code>.hljs-keyword</code>, <code>.hljs-string</code>, and <code>.hljs-comment</code>.</p>
              </article>
            </div>
            <p className="style-note">
              For SSR and static publishing pipelines, <code>result.assets.styles</code> reports the exported style paths needed by the
              rendered document.
            </p>
          </div>
        </section>

        <section id="playground" className="section">
          <div className="container">
            <div className="section-head">
              <h2>Live playground</h2>
              <p>Proof of the output contract from one parse call.</p>
              <p className="playground-note">
                Client-side Mermaid preview in demo. Build-time Mermaid SVG rendering is available via <code>featherdown/node</code>.
              </p>
            </div>

            <div className="playground-actions">
              <div className="control-group">
                <span className="control-label">Presets</span>
                <div className="preset-row">
                  {(Object.keys(presetMap) as PresetId[]).map((preset) => (
                    <button key={preset} className={activePreset === preset ? "active" : ""} onClick={() => applyPreset(preset)}>
                      {presetMap[preset].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="control-group control-group-end">
                <span className="control-label">Quick actions</span>
                <div className="preset-row">
                  <button className="copy-install" onClick={resetPreset}>{resetLabel}</button>
                  <button
                    className="copy-install"
                    onClick={() => copyTextWithFeedback(installSnippet, setInstallCopyLabel, "Copied install", "Copy install snippet")}
                  >
                    {installCopyLabel}
                  </button>
                </div>
              </div>
            </div>

            <div className="playground-tabs" role="tablist" aria-label="Playground tabs">
              {outputTabs.map((tab) => (
                <button key={tab} role="tab" className={activeTab === tab ? "active" : ""} aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>
                  {tab[0].toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="playground-shell">
              <div className="playground-grid">
                {activeTab === "preview" && (
                  <article className="panel preview-panel">
                    {errorMessage ? (
                      <p className="error-message">{errorMessage}</p>
                    ) : (
                      <div ref={previewRef} className="preview markdown-surface featherdown-content" dangerouslySetInnerHTML={{ __html: result?.html ?? "" }} />
                    )}
                  </article>
                )}

                {activeTab === "markdown" && (
                  <article className="panel editor-panel">
                    <div className="playground-editor">
                      <CodeMirror
                        className="playground-codemirror"
                        value={markdown}
                        height="100%"
                        extensions={[markdownLanguage()]}
                        basicSetup={{ foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }}
                        onChange={(value) => setMarkdown(value)}
                        aria-label="Markdown editor"
                      />
                    </div>
                  </article>
                )}

                {activeTab === "result" && (
                  <article className="panel secondary-panel">
                    {isRendering && <p className="muted">Rendering...</p>}
                    {!isRendering && resultSummary && (
                      <div className="result-grid result-summary-grid">
                        <section className="result-card">
                          <h3>Metadata</h3>
                          <ul>
                            <li>title: {resultSummary.metadata.title ?? "—"}</li>
                            <li>description: {resultSummary.metadata.description ?? "—"}</li>
                            <li>status: {resultSummary.metadata.status ?? "—"}</li>
                            <li>tags: {resultSummary.metadata.tags?.join(", ") ?? "—"}</li>
                          </ul>
                        </section>
                        <section className="result-card">
                          <h3>Stats</h3>
                          <ul>
                            <li>word count: {resultSummary.stats.wordCount}</li>
                            <li>reading time: {resultSummary.stats.readingTimeMinutes} min</li>
                          </ul>
                        </section>
                        <section className="result-card">
                          <h3>Navigation</h3>
                          <ul>
                            <li>toc items: {resultSummary.tocItems}</li>
                            <li>headings: {resultSummary.headingItems}</li>
                          </ul>
                          <p className="muted">
                            {result?.toc[0]
                              ? `First item: ${result.toc[0].text} (h${result.toc[0].depth})`
                              : "No toc entries for this document."}
                          </p>
                        </section>
                        <section className="result-card">
                          <h3>Diagnostics</h3>
                          <p className="muted">
                            {diagnosticCount === 0 ? "Status: clean (0 diagnostics)" : `Status: needs review (${diagnosticCount} diagnostics)`}
                          </p>
                          <p className="muted">{diagnostics[0] ? `Latest: ${diagnostics[0].code} - ${diagnostics[0].message}` : "No warnings for this parse."}</p>
                        </section>
                        <section className="result-card">
                          <h3>Assets</h3>
                          <ul>
                            {(result?.assets.styles ?? []).length > 0
                              ? (result?.assets.styles ?? []).map((style) => <li key={style}><code>{style}</code></li>)
                              : <li>No exported style paths</li>}
                          </ul>
                          <p className="muted">
                            enabled features:{" "}
                            {Object.entries(result?.assets.features ?? {})
                              .filter(([, enabled]) => Boolean(enabled))
                              .map(([feature]) => feature)
                              .join(", ") || "none"}
                          </p>
                        </section>
                        <section className="result-card">
                          <h3>Front matter extraction</h3>
                          <p className="muted">{resultSummary.frontmatterKeys.length ? resultSummary.frontmatterKeys.join(", ") : "None"}</p>
                        </section>
                        <section className="result-card">
                          <h3>Excerpt</h3>
                          <p className="muted">{resultSummary.excerpt ?? "No excerpt generated."}</p>
                        </section>
                      </div>
                    )}
                  </article>
                )}

                {activeTab === "diagnostics" && (
                  <article className="panel secondary-panel">
                    <h3>Diagnostics</h3>
                    {diagnostics.length === 0 ? (
                      <p className="muted">No diagnostics were produced. Try the Diagnostics example preset.</p>
                    ) : (
                      <ul className="diagnostics-list">
                        {diagnostics.map((item: RenderDiagnostic, idx) => (
                          <li key={`${item.code}-${idx}`}>
                            <code>{item.code}</code> {item.message} <span>({item.source})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                )}

                {activeTab === "assets" && (
                  <article className="panel secondary-panel">
                    <h3>Assets and feature hints</h3>
                    <div className="assets-grid">
                      <section>
                        <h4>Styles</h4>
                        <ul>
                          {(result?.assets.styles ?? []).map((style) => (
                            <li key={style}><code>{style}</code></li>
                          ))}
                        </ul>
                      </section>
                      <section>
                        <h4>Features</h4>
                        <ul>
                          <li>math: {String(result?.assets.features.math ?? false)}</li>
                          <li>code: {String(result?.assets.features.code ?? false)}</li>
                          <li>charts: {String(result?.assets.features.charts ?? false)}</li>
                          <li>mermaid: {String(result?.assets.features.mermaid ?? false)}</li>
                        </ul>
                      </section>
                    </div>
                  </article>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="section muted-section">
          <div className="container">
            <div className="section-head">
              <h2>API paths</h2>
              <p>Pick the entrypoint for your runtime and depth.</p>
            </div>
            <div className="api-grid">
              <article className="api-card">
                <h3>featherdown</h3>
                <p>Browser-safe <code>parse()</code> for apps and previews.</p>
                <pre><code>{`import { Featherdown } from "featherdown";`}</code></pre>
              </article>
              <article className="api-card">
                <h3>featherdown/node</h3>
                <p><code>parseFile()</code> and build-time Mermaid SVG rendering.</p>
                <pre><code>{`import { Featherdown } from "featherdown/node";`}</code></pre>
              </article>
              <article className="api-card">
                <h3>featherdown/advanced</h3>
                <p>Direct unified processor and plugin access.</p>
                <pre><code>{`import { createMarkdownProcessor } from "featherdown/advanced";`}</code></pre>
              </article>
              <article className="api-card">
                <h3>Legacy helpers</h3>
                <p>Compatibility exports for older integrations.</p>
                <pre><code>{`import { renderMarkdown } from "featherdown";`}</code></pre>
              </article>
            </div>
            <article className="boundary-note">
              <h3>Client-side Mermaid previews</h3>
              <p>
                The browser-safe <code>featherdown</code> entry does not bundle Mermaid. For live previews, parse Markdown first, then hydrate{" "}
                <code>code.language-mermaid</code> blocks in your app with the <code>mermaid</code> package. The demo uses this client-side
                approach. For build-time SVG output, use <code>featherdown/node</code>.
              </p>
              <p><strong>Client-side Mermaid is app-level hydration, not part of the default Featherdown browser bundle.</strong></p>
              <pre className="boundary-snippet"><code>{`import mermaid from "mermaid";

const result = await featherdown.parse(markdown);

mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

for (const block of document.querySelectorAll("code.language-mermaid")) {
  const source = block.textContent ?? "";
  const { svg } = await mermaid.render(\`diagram-\${crypto.randomUUID()}\`, source);

  block.closest("pre")?.replaceWith(
    Object.assign(document.createElement("div"), {
      innerHTML: svg,
    }),
  );
}`}</code></pre>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <p className="footer-version">featherdown v{__FEATHERDOWN_VERSION__}</p>
          <p className="footer-note">Browser-safe rendering for publishable markdown surfaces.</p>
          <nav>
            <a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>
            <a href={npmUrl} target="_blank" rel="noreferrer">npm</a>
            <a href="https://github.com/karuifeather/featherdown/blob/main/LICENSE">License</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
