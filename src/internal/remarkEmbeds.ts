import type { Root } from 'mdast';

/**
 * Maps `::embed{src=...}` / provider leaf directives to iframe nodes.
 *
 * SCAFFOLD: placeholder wired into the pipeline; implemented by the embeds work.
 * Per-parse configuration is read from the vfile via `getPipelineContext(file)?.config`.
 */
export default function remarkEmbeds() {
  return (tree: Root): Root => tree;
}
