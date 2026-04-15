import type { Heading, Root } from 'mdast';
import { visit } from 'unist-util-visit';

const TRAILING_ID = /\s+\{#([\w-]+)\}\s*$/;

/**
 * Remark plugin: strips ` {#custom-id}` from heading text and sets `hProperties.id`
 * so remark-rehype puts `id` on the heading in hast before `rehype-sanitize`.
 * `rehype-slug` runs after sanitize and only fills in missing ids, so it does not
 * overwrite these (see `!node.properties.id` in rehype-slug).
 */
export function remarkHeadingIds(): (tree: Root) => undefined {
  return function (tree: Root): undefined {
    visit(tree, 'heading', (node: Heading) => {
      const last = node.children[node.children.length - 1];
      if (!last || last.type !== 'text') return;

      const match = TRAILING_ID.exec(last.value);
      if (!match?.[1]) return;

      if (!node.data) node.data = {};
      if (!node.data.hProperties) node.data.hProperties = {};
      const id = match[1];
      const data = node.data as typeof node.data & {
        id?: string;
        hProperties: Record<string, string | undefined>;
      };
      data.id = id;
      data.hProperties.id = id;
      data.hProperties.dataHeadingCustomId = 'true';

      last.value = last.value.slice(0, match.index).replace(/\s+$/, '');
    });
  };
}
