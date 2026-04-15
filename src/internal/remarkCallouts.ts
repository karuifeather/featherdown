import type { BlockContent, Root, RootContent } from 'mdast';
import { SKIP, visit } from 'unist-util-visit';

const SUPPORTED_CALLOUT_TYPES = [
  'note',
  'tip',
  'warning',
  'info',
  'success',
  'danger',
  'error',
  'caution',
  'important',
] as const;
type SupportedCalloutType = (typeof SUPPORTED_CALLOUT_TYPES)[number];

const DEFAULT_TITLES: Record<SupportedCalloutType, string> = {
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
  info: 'Info',
  success: 'Success',
  danger: 'Danger',
  error: 'Error',
  caution: 'Caution',
  important: 'Important',
};

function isSupportedCalloutType(value: string): value is SupportedCalloutType {
  return (SUPPORTED_CALLOUT_TYPES as readonly string[]).includes(value);
}

function createMarkerParagraph(value: string): RootContent {
  return {
    type: 'paragraph',
    children: [{ type: 'text', value }],
  };
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function createTitleNode(title: string): BlockContent {
  return {
    type: 'paragraph',
    data: {
      hName: 'div',
      hProperties: {
        className: ['callout-title'],
      },
    },
    children: [{ type: 'text', value: title }],
  };
}

function toPlainMarkdownNodes(name: string, label: string | null | undefined, children: RootContent[]): RootContent[] {
  const openMarker = label ? `:::${name}[${label}]` : `:::${name}`;
  return [createMarkerParagraph(openMarker), ...children, createMarkerParagraph(':::')];
}

function extractDirectiveLabel(children: BlockContent[]): { label: string | null; bodyChildren: BlockContent[] } {
  const first = children[0];
  if (!first || first.type !== 'paragraph') {
    return { label: null, bodyChildren: children };
  }

  const hasDirectiveLabelFlag = (first.data as { directiveLabel?: boolean } | undefined)?.directiveLabel === true;
  if (!hasDirectiveLabelFlag) {
    return { label: null, bodyChildren: children };
  }

  const label = first.children
    .map((child) => (child.type === 'text' ? child.value : ''))
    .join('');
  const normalizedLabel = normalizeWhitespace(label);

  return {
    label: normalizedLabel || null,
    bodyChildren: children.slice(1),
  };
}

type DirectiveNode = RootContent & {
  type: 'containerDirective';
  name: string;
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
  children: BlockContent[];
};

/**
 * Maps supported :::type directives to stable callout HTML.
 */
export function remarkCallouts() {
  return (tree: Root): void => {
    visit(tree, 'containerDirective', (node, index, parent) => {
      if (index === undefined || !parent) {
        return;
      }

      const directive = node as DirectiveNode;
      const name = directive.name;
      const { label, bodyChildren } = extractDirectiveLabel(directive.children);

      if (isSupportedCalloutType(name)) {
        const title = label ?? DEFAULT_TITLES[name];
        directive.children = [createTitleNode(title), ...bodyChildren];
        directive.data = {
          ...(directive.data ?? {}),
          hName: 'div',
          hProperties: {
            ...(directive.data?.hProperties ?? {}),
            className: ['callout', `callout-${name}`],
          },
        };
        return;
      }

      const replacement = toPlainMarkdownNodes(name, label, bodyChildren);
      parent.children.splice(index, 1, ...replacement);
      return [SKIP, index + replacement.length];
    });
  };
}
