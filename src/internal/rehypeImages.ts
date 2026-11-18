import type { Root } from 'hast';

/**
 * Adds `loading` / `decoding` to images and optional figure captions.
 *
 * SCAFFOLD: placeholder wired into the pipeline; implemented by the links/images work.
 * Per-parse configuration is read from the vfile via `getPipelineContext(file)?.config`.
 */
export default function rehypeImages() {
  return (tree: Root): Root => tree;
}
