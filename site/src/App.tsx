import { useEffect, useRef, useState } from "react";
import {
  renderMarkdown,
  renderMarkdownDocument,
  renderMarkdownToHtml,
  type RenderDiagnostic,
  type RenderMarkdownDocumentResult,
} from "featherdown";

type PlaygroundTab = "diagnostics" | "metadata";
type PrimaryView = "markdown" | "preview";
type Theme = "light" | "dark";

const githubUrl = "https://github.com/karuifeather/featherdown";
const npmUrl = "https://www.npmjs.com/package/featherdown";
const jsrUrl = "https://jsr.io/@karuifeather/featherdown";

const canonicalExample = `# Building a release note page with featherdown

## Why this pipeline exists

Teams often need one markdown source that can ship to docs, changelogs, and in-app release notes without rebuilding every renderer.

:::tip[Production-safe default]
Use the browser-safe \`featherdown\` entry for client rendering, then keep Node-only transforms in publishing builds.
:::

## Render entrypoint

\`\`\`ts title="renderReleaseNotes.ts" {4,8-9} showLineNumbers showCopyButton
import { renderMarkdownDocument } from "featherdown";

export async function renderReleaseNotes(markdown: string) {
  const result = await renderMarkdownDocument(markdown);
  return {
    html: result.html,
    excerpt: result.excerpt,
    readingMinutes: result.estimatedReadingMinutes,
  };
}
\`\`\`

## Rollout metrics

\`\`\`chart-line
{"labels":["Week 1","Week 2","Week 3","Week 4"],"datasets":[{"label":"Adoption %","data":[24,39,58,72]}]}
\`\`\`

## Publishing checklist

- Validate non-fatal diagnostics before publishing.
- Use metadata output for article previews and TOC navigation.
- Keep Mermaid rendering in Node pipelines via \`featherdown/node\`.

![Logo](./images/logo.png)
`;

const defaultManifest = {
  kind: "post",
  slug: "playground",
  manifest: {
    map: {
      "post/playground/images/logo.png": {
        url: "https://cdn.example.com/featherdown/logo.hash.png",
      },
    },
  },
};

const featureGroups = [
  {
    title: "Ship browser-safe output by default",
    body: "Sanitized HTML, stable contracts, and honest runtime boundaries make production theming predictable.",
    bullets: ["Callouts and code UX hooks", "Chart mount placeholders", "Manifest-based image rewriting"],
  },
  {
    title: "Turn markdown into usable document data",
    body: "Extract toc, headings, excerpt, word count, and reading time from the same render pass.",
    bullets: ["Metadata for previews and navigation", "Diagnostics for author QA", "Composable processor/plugin exports"],
  },
];

const installSnippet = "npm install featherdown";

function compactJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("featherdown-site-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [markdown, setMarkdown] = useState(canonicalExample);
  const [primaryView, setPrimaryView] = useState<PrimaryView>("preview");
  const [activeTab, setActiveTab] = useState<PlaygroundTab>("diagnostics");
  const [isDataPanelOpen, setIsDataPanelOpen] = useState(false);
  const [htmlOnly, setHtmlOnly] = useState("");
  const [documentResult, setDocumentResult] = useState<RenderMarkdownDocumentResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<RenderDiagnostic[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [installCopyLabel, setInstallCopyLabel] = useState("Copy install snippet");
  const [heroCopyLabel, setHeroCopyLabel] = useState("Click to copy");
  const [resetLabel, setResetLabel] = useState("Reset example");
  const previewRef = useRef<HTMLDivElement>(null);
  const headingCount = documentResult?.headings.length ?? 0;
  const wordCount = documentResult?.wordCount ?? 0;
  const diagnosticCount = diagnostics.length;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("md");
    if (!encoded) return;
    try {
      const decoded = atob(encoded);
      if (!cancelled) {
        setMarkdown(decoded);
      }
    } catch {
      if (!cancelled) {
        setErrorMessage("Could not decode URL state.");
      }
    }
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyTextWithFeedback(
    value: string,
    setLabel: (next: string) => void,
    successText: string,
    idleText: string,
  ) {
    try {
      await navigator.clipboard.writeText(value);
      setLabel(successText);
    } catch {
      setLabel("Copy failed");
    } finally {
      window.setTimeout(() => {
        setLabel(idleText);
      }, 1100);
    }
  }

  function resetExample() {
    setMarkdown(canonicalExample);
    setPrimaryView("markdown");
    setResetLabel("Example reset");
    window.setTimeout(() => {
      setResetLabel("Reset example");
    }, 1100);
  }

  useEffect(() => {
    const next = new URL(window.location.href);
    next.searchParams.set("md", btoa(markdown));
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
        const [html, full, document] = await Promise.all([
          renderMarkdownToHtml(markdown, defaultManifest),
          renderMarkdown(markdown, defaultManifest),
          renderMarkdownDocument(markdown, defaultManifest),
        ]);
        if (cancelled) return;
        setHtmlOnly(html);
        setDiagnostics(full.diagnostics);
        setDocumentResult(document);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Unknown render error.");
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    }
    runRender();
    return () => {
      cancelled = true;
    };
  }, [markdown]);

  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    const onClick = async (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest<HTMLButtonElement>("[data-code-copy]");
      if (!button) return;
      const copyTarget = button.getAttribute("data-code-copy-target");
      if (!copyTarget) return;
      const codeNode = root.querySelector<HTMLElement>(
        `[data-code-copy-target="${copyTarget}"]`,
      );
      if (!codeNode || !(codeNode instanceof HTMLElement)) return;
      const codeText = codeNode.innerText;
      await navigator.clipboard.writeText(codeText);
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1200);
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="container">
          <div className="hero-layout">
            <div className="hero-main">
              <div className="hero-top-row">
                <p className="eyebrow">featherdown</p>
                <button
                  className="theme-toggle"
                  type="button"
                  onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                >
                  {theme === "dark" ? "Light" : "Dark"}
                </button>
              </div>
              <h1>Publish markdown like product content, not loose documentation.</h1>
              <p className="hero-copy">
                featherdown turns markdown into sanitized article HTML plus diagnostics
                and metadata, so your docs and release surfaces ship with the same
                predictable contracts.
              </p>
              <div className="hero-metrics" aria-label="Package highlights">
                <span>Browser-safe defaults</span>
                <span>Structured metadata</span>
                <span>Stable HTML contracts</span>
              </div>
              <div className="cta-row">
                <a className="cta-primary" href="#playground">
                  Open live playground
                </a>
                <a href={githubUrl} target="_blank" rel="noreferrer">
                  GitHub
                </a>
                <a href={npmUrl} target="_blank" rel="noreferrer">
                  npm
                </a>
                <a href={jsrUrl} target="_blank" rel="noreferrer">
                  JSR
                </a>
              </div>
            </div>
            <aside className="hero-aside">
              <p className="hero-aside-label">Package proof</p>
              <p className="hero-proof-title">Drop-in install, production-safe output</p>
              <button
                className="hero-install-copy"
                aria-label="Copy install command"
                onClick={() =>
                  copyTextWithFeedback(
                    installSnippet,
                    setHeroCopyLabel,
                    "Copied command",
                    "Click to copy",
                  )
                }
              >
                <pre>
                  <code>{installSnippet}</code>
                </pre>
              </button>
              <p className="copy-hint">{heroCopyLabel}</p>
              <ul className="hero-proof-list">
                <li>Sanitized article HTML from the default browser-safe entry.</li>
                <li>Diagnostics and metadata from the same markdown input.</li>
                <li>Mermaid stays Node-only through <code>featherdown/node</code>.</li>
              </ul>
              <div className="hero-proof-stats" aria-label="Live render proof">
                <article>
                  <span>Headings</span>
                  <strong>{headingCount}</strong>
                </article>
                <article>
                  <span>Word count</span>
                  <strong>{wordCount}</strong>
                </article>
                <article>
                  <span>Diagnostics</span>
                  <strong>{diagnosticCount}</strong>
                </article>
              </div>
              <p className="hero-support">
                This live workbench renders the canonical publishing example with the real package APIs.
              </p>
            </aside>
          </div>
        </div>
      </header>

      <main>
        <section id="playground" className="section">
          <div className="container">
            <div className="section-head">
              <h2>Live playground</h2>
              <p>
                One realistic article example rendered in-browser with the default{" "}
                <code>featherdown</code> entrypoint.
              </p>
            </div>

            <div className="playground-actions">
              <div className="control-group">
                <span className="control-label">Primary view</span>
                <div className="preset-row" role="tablist" aria-label="Primary playground view">
                  <button
                    id="preview-tab"
                    role="tab"
                    aria-controls="preview-panel"
                    aria-selected={primaryView === "preview"}
                    tabIndex={primaryView === "preview" ? 0 : -1}
                    className={primaryView === "preview" ? "active" : ""}
                    onClick={() => setPrimaryView("preview")}
                  >
                    Preview
                  </button>
                  <button
                    id="markdown-tab"
                    role="tab"
                    aria-controls="markdown-panel"
                    aria-selected={primaryView === "markdown"}
                    tabIndex={primaryView === "markdown" ? 0 : -1}
                    className={primaryView === "markdown" ? "active" : ""}
                    onClick={() => setPrimaryView("markdown")}
                  >
                    Markdown
                  </button>
                </div>
              </div>
              <div className="control-group control-group-end">
                <span className="control-label">Quick action</span>
                <div className="preset-row">
                  <button
                    className="copy-install"
                    onClick={() => setIsDataPanelOpen((open) => !open)}
                  >
                    {isDataPanelOpen ? "Hide data panel" : "Show data panel"}
                  </button>
                  <button className="copy-install" onClick={resetExample}>
                    {resetLabel}
                  </button>
                  <button
                    className="copy-install"
                    onClick={() =>
                      copyTextWithFeedback(
                        installSnippet,
                        setInstallCopyLabel,
                        "Copied install",
                        "Copy install snippet",
                      )
                    }
                  >
                    {installCopyLabel}
                  </button>
                </div>
              </div>
            </div>

            <div className="playground-shell">
              <div className="playground-grid">
                {primaryView === "markdown" ? (
                  <article
                    id="markdown-panel"
                    role="tabpanel"
                    aria-labelledby="markdown-tab"
                    className="panel editor-panel"
                  >
                    <h3>Markdown input</h3>
                    <textarea
                      aria-label="Markdown editor"
                      value={markdown}
                      onChange={(event) => {
                        setMarkdown(event.target.value);
                      }}
                    />
                  </article>
                ) : (
                  <article
                    id="preview-panel"
                    role="tabpanel"
                    aria-labelledby="preview-tab"
                    className="panel preview-panel"
                  >
                    <div className="preview-head">
                      <p className="preview-kicker">Live output</p>
                      <h3>Rendered preview</h3>
                    </div>
                    {errorMessage ? (
                      <p className="error-message">{errorMessage}</p>
                    ) : (
                      <div
                        ref={previewRef}
                        className="preview markdown-surface"
                        dangerouslySetInnerHTML={{ __html: documentResult?.html ?? htmlOnly }}
                      />
                    )}
                  </article>
                )}
              </div>

              {isDataPanelOpen && (
                <article className="panel secondary-panel">
                  <div className="tabs" role="tablist" aria-label="Playground data views">
                    <button
                      role="tab"
                      aria-selected={activeTab === "diagnostics"}
                      className={activeTab === "diagnostics" ? "active" : ""}
                      onClick={() => setActiveTab("diagnostics")}
                    >
                      Diagnostics
                    </button>
                    <button
                      role="tab"
                      aria-selected={activeTab === "metadata"}
                      className={activeTab === "metadata" ? "active" : ""}
                      onClick={() => setActiveTab("metadata")}
                    >
                      Document metadata
                    </button>
                  </div>
                  {isRendering && <p className="muted">Rendering…</p>}
                  {!isRendering && activeTab === "diagnostics" && (
                    <pre className="json-panel">
                      {diagnostics.length > 0
                        ? compactJson(diagnostics)
                        : "No diagnostics were produced for this input."}
                    </pre>
                  )}
                  {!isRendering && activeTab === "metadata" && (
                    <pre className="json-panel">
                      {documentResult
                        ? compactJson({
                            toc: documentResult.toc,
                            headings: documentResult.headings,
                            excerpt: documentResult.excerpt,
                            wordCount: documentResult.wordCount,
                            estimatedReadingMinutes: documentResult.estimatedReadingMinutes,
                          })
                        : "No render metadata yet."}
                    </pre>
                  )}
                </article>
              )}
            </div>
          </div>
        </section>

        <section className="section muted-section">
          <div className="container">
            <div className="section-head">
              <h2>Built for publishing surfaces</h2>
              <p>Concise primitives that scale from simple rendering to full article pipelines.</p>
            </div>
            <div className="feature-grid">
              {featureGroups.map((group) => (
                <article
                  key={group.title}
                  className={`feature-card ${group.title.includes("browser-safe") ? "feature-card-strong" : ""}`}
                >
                  <h3>{group.title}</h3>
                  <p>{group.body}</p>
                  <ul>
                    {group.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>API path</h2>
              <p>Start simple, then move up only when you need richer output.</p>
            </div>
            <div className="api-grid">
              <article className="api-card">
                <h3>
                  <code>renderMarkdownToHtml</code>
                </h3>
                <p>Use first when you only need sanitized HTML.</p>
              </article>
              <article className="api-card">
                <h3>
                  <code>renderMarkdown</code> and <code>renderMarkdownDocument</code>
                </h3>
                <p>
                  Move here when you need diagnostics, toc, headings, excerpt, and
                  reading stats from the same input.
                </p>
              </article>
              <article className="api-card">
                <h3>
                  <code>createMarkdownProcessor</code> and plugin exports
                </h3>
                <p>
                  Compose lower-level pipelines when you need custom transforms around
                  featherdown defaults.
                </p>
              </article>
            </div>
            <aside className="boundary-note">
              <h3>Mermaid runtime boundary</h3>
              <p>
                Mermaid rendering is intentionally excluded from the default browser-safe
                entry. Use <code>renderMarkdownToHtmlWithMermaid</code> from{" "}
                <code>featherdown/node</code> in Node publishing pipelines.
              </p>
            </aside>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <p className="footer-version">featherdown v{__FEATHERDOWN_VERSION__}</p>
          <p className="footer-note">Browser-safe rendering for publishable markdown surfaces.</p>
          <nav>
            <a href={githubUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={npmUrl} target="_blank" rel="noreferrer">
              npm
            </a>
            <a href={jsrUrl} target="_blank" rel="noreferrer">
              JSR
            </a>
            <a href="https://github.com/karuifeather/featherdown/blob/main/LICENSE">
              License
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
