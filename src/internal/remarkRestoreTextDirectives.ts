import type { Root } from 'mdast';
import { SKIP, visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

/**
 * Turns every inline (`:name`) directive back into the text it was written as.
 *
 * remark-directive reads `:30` in `10:30` or `:smile:` as a text directive.
 * Featherdown defines no inline directives, so left alone those render as an
 * empty element and the author's text disappears. Container (`:::`) and leaf
 * (`::`) directives are handled by their own stages.
 */
export default function remarkRestoreTextDirectives() {
  return (tree: Root, file: VFile): undefined => {
    const source = typeof file.value === 'string' ? file.value : undefined;
    visit(tree, 'textDirective', (node, index, parent) => {
      if (!parent || index === undefined) {
        return undefined;
      }
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (source === undefined || start === undefined || end === undefined) {
        return undefined;
      }
      parent.children.splice(index, 1, { type: 'text', value: source.slice(start, end) });
      return [SKIP, index + 1];
    });
  };
}
