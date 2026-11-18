import type { Root } from 'hast';

/**
 * Adds `rel` / `target` to external links.
 *
 * SCAFFOLD: placeholder wired into the pipeline; implemented by the links/images work.
 * Per-parse configuration is read from the vfile via `getPipelineContext(file)?.config`.
 */
export default function rehypeLinks() {
  return (tree: Root): Root => tree;
}
