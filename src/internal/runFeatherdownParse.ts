import type { FeatherdownOptions, FeatherdownResult } from '../types.js';
import { buildFeatherdownResult } from './buildFeatherdownResult.js';
import { buildMetadataFromFrontmatter } from './buildMetadataFromFrontmatter.js';
import type { MermaidPluginsFactory } from './createMarkdownProcessorInternal.js';
import { pickRenderMarkdownOptions, toPipelineFeatureConfig, toProcessorGates } from './featherdownParseHelpers.js';
import { parseFrontmatter } from './parseFrontmatter.js';
import { renderMarkdownDocumentDetailed } from './renderMarkdownDocumentInternal.js';
import { resolveFeatherdownOptions } from './resolveFeatherdownOptions.js';
import { throwIfStrictDiagnosticsViolated } from './throwIfStrictDiagnosticsViolated.js';

/**
 * Shared body of `Featherdown.parse()` for the browser and Node entries.
 * `mermaidPlugins` is supplied only by the Node entry when Mermaid SVG is on.
 */
export async function runFeatherdownParse(
  markdown: string,
  mergedOptions: FeatherdownOptions | undefined,
  mermaidPlugins?: MermaidPluginsFactory,
): Promise<FeatherdownResult> {
  const resolvedOptions = resolveFeatherdownOptions(mergedOptions);
  const legacy = pickRenderMarkdownOptions(mergedOptions);

  const fm = parseFrontmatter(markdown, resolvedOptions.frontmatter);
  const metadata = buildMetadataFromFrontmatter(fm.frontmatter);
  const document = await renderMarkdownDocumentDetailed(
    fm.body,
    legacy,
    toProcessorGates(resolvedOptions),
    {
      ...(mermaidPlugins ? { mermaidPlugins } : {}),
      config: toPipelineFeatureConfig(resolvedOptions),
      ...(resolvedOptions.plugins ? { plugins: resolvedOptions.plugins } : {}),
    },
  );

  const result = buildFeatherdownResult({
    body: fm.body,
    frontmatter: fm.frontmatter,
    metadata,
    document,
    detected: document.detected,
    options: resolvedOptions,
    ...(mermaidPlugins ? { mermaidFeature: true } : {}),
  });
  throwIfStrictDiagnosticsViolated(resolvedOptions, result);
  return result;
}
