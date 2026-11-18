import type { Root } from 'mdast';

/**
 * Maps `:::details[Summary]` container directives to `<details class="details"><summary>`.
 *
 * SCAFFOLD: placeholder wired into the pipeline; implemented by the alerts work.
 * Per-parse configuration is read from the vfile via `getPipelineContext(file)?.config`.
 */
export default function remarkDetails() {
  return (tree: Root): Root => tree;
}
