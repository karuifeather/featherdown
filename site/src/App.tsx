import { useEffect, useMemo, useRef, useState } from "react";
import {
  renderMarkdown,
  renderMarkdownDocument,
  renderMarkdownToHtml,
  type RenderDiagnostic,
  type RenderMarkdownDocumentResult,
} from "featherdown";

type PlaygroundTab = "diagnostics" | "metadata";

type PlaygroundPreset = {
  id: string;
  label: string;
  markdown: string;
};

const githubUrl = "https://github.com/karuifeather/featherdown";
const npmUrl = "https://www.npmjs.com/package/featherdown";
const jsrUrl = "https://jsr.io/@karuifeather/featherdown";

const presets: PlaygroundPreset[] = [
  {
    id: "docs",
    label: "Docs",
    markdown: `# Docs page demo

:::note[Browser-safe by default]
This playground imports the default \`featherdown\` entry and runs in the browser.
:::

## Setup

Install the package:

\`\`\`bash title="install.sh" showCopyButton
npm install featherdown
\`\`\`

## API snapshot

- \`renderMarkdownToHtml\`: sanitized HTML only
- \`renderMarkdown\`: HTML + diagnostics
- \`renderMarkdownDocument\`: HTML + diagnostics + metadata
`,
  },
  {
    id: "blog",
    label: "Blog post",
    markdown: `# Shipping a markdown pipeline

:::tip[Keep rendering deterministic]
Dogfood the real package output in your docs and publishing surfaces.
:::

## Highlights

\`\`\`ts title="renderer.ts" {2,4-5} showLineNumbers showCopyButton
import { renderMarkdownDocument } from "featherdown";

export async function toPage(markdown: string) {
  const result = await renderMarkdownDocument(markdown);
  return result;
}
\`\`\`

\`\`\`chart-line
{"labels":["Mon","Tue","Wed"],"datasets":[{"label":"Posts","data":[1,2,4]}]}
\`\`\`
`,
  },
  {
    id: "code",
    label: "Code demo",
    markdown: `# Code-focused output

:::warning[Line-level UX hooks]
Use \`code-line-highlighted\`, \`code-line-numbered\`, and copy-button hooks in your theme layer.
:::

\`\`\`tsx title="PlaygroundCard.tsx" {3,8} showLineNumbers showCopyButton
type PlaygroundCardProps = {
  title: string;
  body: string;
};

export function PlaygroundCard({ title, body }: PlaygroundCardProps) {
  return <article><h3>{title}</h3><p>{body}</p></article>;
}
\`\`\`

\`\`\`chart-bar
not valid json
\`\`\`
`,
  },
];

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

const apiGuidance = [
  {
    api: "renderMarkdownToHtml",
    when: "You only need sanitized HTML.",
  },
  {
    api: "renderMarkdown",
    when: "You need HTML and non-fatal diagnostics.",
  },
  {
    api: "renderMarkdownDocument",
    when: "You need HTML plus toc/headings/excerpt/reading stats.",
  },
  {
    api: "createMarkdownProcessor",
    when: "You want direct access to the default browser-safe unified processor.",
  },
  {
    api: "rehypeChartBlocks + rehypeCdnImages",
    when: "You are composing your own unified pipeline and want focused plugin exports.",
  },
  {
    api: "featherdown/node",
    when: "You are rendering Mermaid to inline SVG in Node publishing builds.",
  },
];

const features = [
  {
    title: "Browser-safe rendering",
    body: "Default entrypoint is Mermaid-free and browser-compatible.",
  },
  {
    title: "Document metadata",
    body: "Generate toc, headings, excerpt, word count, and reading minutes with HTML.",
  },
  {
    title: "Callouts",
    body: "Directive-style callouts emit stable, styleable contract hooks.",
  },
  {
    title: "Code block ergonomics",
    body: "Code titles, highlights, line numbers, and copy-button hooks compose cleanly.",
  },
  {
    title: "Chart placeholders",
    body: "chart-* fences produce mount nodes without bundling chart runtime code.",
  },
  {
    title: "Image rewriting",
    body: "Manifest-based URL rewriting supports publishing and CDN workflows.",
  },
  {
    title: "Node-only Mermaid",
    body: "A separate Node entrypoint keeps browser bundles honest and lean.",
  },
  {
    title: "Diagnostics",
    body: "Collect non-fatal warnings for QA and author tooling.",
  },
  {
    title: "Processor + plugin exports",
    body: "Use defaults quickly or compose lower-level unified pipelines.",
  },
];

const installSnippet = "npm install featherdown";

function compactJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function App() {
  const [markdown, setMarkdown] = useState(`${presets[0].markdown}\n![Logo](./images/logo.png)\n`);
  const [activePresetId, setActivePresetId] = useState(presets[0].id);
  const [activeTab, setActiveTab] = useState<PlaygroundTab>("diagnostics");
  const [htmlOnly, setHtmlOnly] = useState("");
  const [documentResult, setDocumentResult] = useState<RenderMarkdownDocumentResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<RenderDiagnostic[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("md");
    if (!encoded) return;
    try {
      const decoded = atob(encoded);
      if (!cancelled) {
        setMarkdown(decoded);
        setActivePresetId("custom");
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

  useEffect(() => {
    const next = new URL(window.location.href);
    next.searchParams.set("md", btoa(markdown));
    window.history.replaceState({}, "", next.toString());
  }, [markdown]);

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

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === activePresetId) ?? null,
    [activePresetId],
  );

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="container">
          <p className="eyebrow">featherdown</p>
          <h1>Markdown rendering for publishing surfaces</h1>
          <p className="hero-copy">
            featherdown turns Markdown into sanitized HTML with diagnostics and
            metadata, while keeping browser and Node runtime boundaries explicit.
          </p>
          <p className="hero-support">
            The live playground below uses the browser-safe default entry. Mermaid
            rendering is available through the separate Node-only entrypoint.
          </p>
          <div className="cta-row">
            <a href={githubUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={npmUrl} target="_blank" rel="noreferrer">
              npm
            </a>
            <a href={jsrUrl} target="_blank" rel="noreferrer">
              JSR
            </a>
            <a href="#playground">Try the playground</a>
          </div>
        </div>
      </header>

      <main>
        <section id="playground" className="section">
          <div className="container">
            <div className="section-head">
              <h2>Live playground</h2>
              <p>
                Browser-safe rendering powered by the default <code>featherdown</code>{" "}
                entrypoint.
              </p>
            </div>

            <div className="playground-actions">
              <div className="preset-row">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    className={preset.id === activePresetId ? "active" : ""}
                    onClick={() => {
                      setActivePresetId(preset.id);
                      setMarkdown(`${preset.markdown}\n![Logo](./images/logo.png)\n`);
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
                {selectedPreset === null && <span className="custom-tag">Custom</span>}
              </div>
              <button
                className="copy-install"
                onClick={() => navigator.clipboard.writeText(installSnippet)}
              >
                Copy install snippet
              </button>
            </div>

            <div className="playground-grid">
              <article className="panel">
                <h3>Markdown input</h3>
                <textarea
                  aria-label="Markdown editor"
                  value={markdown}
                  onChange={(event) => {
                    setActivePresetId("custom");
                    setMarkdown(event.target.value);
                  }}
                />
              </article>

              <article className="panel">
                <h3>Rendered preview</h3>
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
            </div>

            <article className="panel secondary-panel">
              <div className="tabs">
                <button
                  className={activeTab === "diagnostics" ? "active" : ""}
                  onClick={() => setActiveTab("diagnostics")}
                >
                  Diagnostics
                </button>
                <button
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
                    : "No diagnostics for this input."}
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
          </div>
        </section>

        <section className="section muted-section">
          <div className="container">
            <div className="section-head">
              <h2>Features that stay out of your way</h2>
              <p>Stable HTML contracts you can theme and hydrate in your own app.</p>
            </div>
            <div className="feature-grid">
              {features.map((feature) => (
                <article key={feature.title} className="feature-card">
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Choose the right API</h2>
              <p>Use the highest-level helper that matches your needs.</p>
            </div>
            <div className="api-grid">
              {apiGuidance.map((entry) => (
                <article className="api-card" key={entry.api}>
                  <h3>
                    <code>{entry.api}</code>
                  </h3>
                  <p>{entry.when}</p>
                </article>
              ))}
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
          <p>featherdown v{__FEATHERDOWN_VERSION__}</p>
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
