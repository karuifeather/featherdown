import type { Root } from 'hast';

/**
 * Drops iframes whose src is not an allowed provider/host and hardens the rest.
 *
 * SCAFFOLD: placeholder wired into the pipeline; implemented by the embeds work.
 * Per-parse configuration is read from the vfile via `getPipelineContext(file)?.config`.
 */
export default function rehypeEmbeds() {
  return (tree: Root): Root => tree;
}
