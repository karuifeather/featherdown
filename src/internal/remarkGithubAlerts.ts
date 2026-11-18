import type { Root } from 'mdast';

/**
 * Maps GitHub alerts (`> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`) to callout markup.
 *
 * SCAFFOLD: placeholder wired into the pipeline; implemented by the alerts work.
 * Per-parse configuration is read from the vfile via `getPipelineContext(file)?.config`.
 */
export default function remarkGithubAlerts() {
  return (tree: Root): Root => tree;
}
