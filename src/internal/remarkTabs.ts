import type { BlockContent, Root } from 'mdast';
import type { ContainerDirective } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import { getPipelineContext } from './pipelineContext.js';
import { extractDirectiveLabel } from './remarkCallouts.js';

function isTab(node: unknown): node is ContainerDirective {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as { type?: string }).type === 'containerDirective' &&
    (node as { name?: string }).name === 'tab'
  );
}

/**
 * Maps a `::::tabs` container holding `:::tab[Label]` containers to
 * `div.tabs > div.tab-panel[data-tab-label]`. The tab buttons and ARIA wiring
 * are added after sanitization by `rehypeTabs`; this stage only produces the
 * author-content skeleton, which the sanitize schema allows.
 *
 * remark-directive needs the outer fence to use more colons than the inner one
 * (`::::tabs` around `:::tab`). A `tabs` block with no `tab` children, content
 * outside a `tab`, or a `tab` outside any `tabs` is reported as `tabs.invalid`
 * (the first case is left as plain text by `remarkCallouts`).
 */
export default function remarkTabs() {
  return (tree: Root, file: VFile): undefined => {
    const emit = getPipelineContext(file)?.emitDiagnostic;
    const report = (message: string): void => {
      emit?.({ code: 'tabs.invalid', message, severity: 'warning', source: 'tabs' });
    };

    visit(tree, 'containerDirective', (node) => {
      if (node.name !== 'tabs') {
        return;
      }
      const { bodyChildren } = extractDirectiveLabel(node.children as BlockContent[]);
      const panels = bodyChildren.filter(isTab);
      if (panels.length === 0) {
        report('Ignored a :::tabs block with no :::tab[Label] panels. Use ::::tabs (four colons) around :::tab.');
        return;
      }
      if (panels.length !== bodyChildren.length) {
        report('Removed content inside :::tabs that is not wrapped in a :::tab[Label] panel.');
      }

      let position = 0;
      for (const panel of panels) {
        position += 1;
        const { label, bodyChildren: body } = extractDirectiveLabel(panel.children as BlockContent[]);
        panel.children = body;
        // Retype so remarkCallouts (which turns unknown container directives
        // back into text) leaves the panel alone.
        (panel as { type: string }).type = 'featherdownTabPanel';
        panel.data = {
          ...(panel.data ?? {}),
          hName: 'div',
          hProperties: {
            className: ['tab-panel'],
            dataTabLabel: label ?? `Tab ${String(position)}`,
          },
        };
      }
      node.children = panels;
      (node as { type: string }).type = 'featherdownTabs';
      node.data = {
        ...(node.data ?? {}),
        hName: 'div',
        hProperties: { className: ['tabs'] },
      };
    });

    // Anything still a `tab` container was not inside a valid `tabs` block.
    visit(tree, 'containerDirective', (node) => {
      if (node.name === 'tab') {
        report('Ignored a :::tab outside a ::::tabs block.');
      }
    });
  };
}
