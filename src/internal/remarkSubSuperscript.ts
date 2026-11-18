import type { Emphasis, Parent, PhrasingContent, Root, Text } from 'mdast';
import { SKIP, visit } from 'unist-util-visit';

/**
 * `^sup^` and `~sub~`: the delimiter pair must enclose at least one character
 * and no whitespace (Pandoc's rule). That keeps prose such as `a ^ b ^ c`,
 * `~/src and ~/dist` and `2 ^ 3` untouched.
 */
const MARKED = /([\^~])([^\s^~]+)\1/g;

function mark(tag: 'sub' | 'sup', value: string): Emphasis {
  // An `emphasis` node carrying `hName` renders as the given element and stays
  // a well-typed mdast node for every other plugin that walks the tree.
  return { type: 'emphasis', data: { hName: tag }, children: [{ type: 'text', value }] };
}

function split(value: string): PhrasingContent[] | undefined {
  const out: PhrasingContent[] = [];
  let last = 0;
  for (const match of value.matchAll(MARKED)) {
    const at = match.index;
    if (at > last) {
      out.push({ type: 'text', value: value.slice(last, at) });
    }
    out.push(mark(match[1] === '^' ? 'sup' : 'sub', match[2] ?? ''));
    last = at + match[0].length;
  }
  if (out.length === 0) {
    return undefined;
  }
  if (last < value.length) {
    out.push({ type: 'text', value: value.slice(last) });
  }
  return out;
}

/** GFM literal autolinks (`https://x.com/a~b~c`) have a text child spanning the whole link. */
function isLiteralAutolinkText(parent: Parent, node: Text): boolean {
  if (parent.type !== 'link') {
    return false;
  }
  const a = parent.position;
  const b = node.position;
  return a !== undefined && b !== undefined && a.start.offset === b.start.offset && a.end.offset === b.end.offset;
}

/**
 * Turns `H~2~O` into `H<sub>2</sub>O` and `x^2^` into `x<sup>2</sup>`.
 *
 * Works on plain text nodes only, so inline code, math, code fences, link
 * destinations and footnote references (`[^1]`) are never touched. Backslash
 * escapes are already resolved by the time text nodes exist, so `\^x\^` cannot
 * be told apart from `^x^` and is converted too. To show a literal pair, put a
 * space inside it or use the `&#94;` entity for one of the marks.
 *
 * Pair this with `remark-gfm`'s `singleTilde: false`, otherwise `~x~` is
 * parsed as strikethrough before this plugin runs.
 */
export default function remarkSubSuperscript() {
  return (tree: Root): undefined => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === undefined || (!node.value.includes('^') && !node.value.includes('~'))) {
        return undefined;
      }
      if (isLiteralAutolinkText(parent, node)) {
        return undefined;
      }
      const replacement = split(node.value);
      if (!replacement) {
        return undefined;
      }
      parent.children.splice(index, 1, ...replacement);
      return [SKIP, index + replacement.length];
    });
  };
}
