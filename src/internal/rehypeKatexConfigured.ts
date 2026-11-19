import type { Root } from 'hast';
import rehypeKatex from 'rehype-katex';
import type { VFile } from 'vfile';
import type { DiagnosticEmitter } from './diagnostics.js';
import { getPipelineContext } from './pipelineContext.js';

const RENDER_SOURCE = 'rehype-katex';

/**
 * KaTeX stage with per-parse configuration.
 *
 * The processor is cached and shared across parses, so KaTeX options cannot be
 * fixed when it is built. This wrapper builds a fresh `rehype-katex`
 * transformer on every run from the config on the vfile (`math` in
 * `PipelineFeatureConfig`). That also gives each parse its own copy of `macros`:
 * KaTeX writes `\gdef` definitions into the object it is given.
 *
 * Without a config (legacy helpers, `createMarkdownProcessor`) the original
 * behavior is kept: HTML output, `trust: false`, no diagnostics.
 */
export default function rehypeKatexConfigured() {
  return (tree: Root, file: VFile): undefined => {
    const context = getPipelineContext(file);
    const math = context?.config?.math;
    if (!math) {
      rehypeKatex({ output: 'html', trust: false })(tree, file);
      return;
    }

    const emit: DiagnosticEmitter | undefined = context.emitDiagnostic;
    const strict =
      math.strict === 'warn'
        ? (code: string, message: string): 'ignore' => {
            emit?.({
              code: 'math.strict',
              message: `Math is not strict LaTeX (${code}): ${message}`,
              severity: 'warning',
              source: 'math',
            });
            return 'ignore';
          }
        : math.strict;

    // KaTeX does not throw for a command that trust blocks; it renders the command name in the
    // error color. Reporting each blocked command tells authors why their `\href` did nothing.
    //
    // When an equation both uses a blocked command and fails to parse, rehype-katex renders it a
    // second time as a fallback and KaTeX asks about the same command again. That repeat is the
    // only case where a render error was logged between two identical questions, so skip it.
    let lastBlocked: { key: string; messages: number } | undefined;
    const trust = math.trust
      ? true
      : (blocked: { command: string; url?: string }): false => {
          const key = `${blocked.command}|${blocked.url ?? ''}`;
          const messages = file.messages.length;
          const isFallbackRepeat = lastBlocked?.key === key && messages > lastBlocked.messages;
          lastBlocked = { key, messages };
          if (!isFallbackRepeat) {
            emit?.({
              code: 'math.trust',
              message: `Blocked ${blocked.command} in math: KaTeX HTML-extension commands need math.trust.`,
              severity: 'warning',
              source: 'math',
            });
          }
          return false;
        };

    const transform = rehypeKatex({
      output: 'html',
      trust,
      strict,
      macros: { ...math.macros },
    });

    const before = file.messages.length;
    transform(tree, file);

    // rehype-katex records one message per equation it could not render.
    for (const message of file.messages.slice(before)) {
      if (message.source !== RENDER_SOURCE) {
        continue;
      }
      emit?.({
        code: 'math.render',
        message: message.cause instanceof Error ? message.cause.message : message.reason,
        severity: 'warning',
        source: 'math',
      });
    }
  };
}
