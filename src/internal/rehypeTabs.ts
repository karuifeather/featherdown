import type { Element, ElementContent, Root } from 'hast';
import { visit } from 'unist-util-visit';

function hasClass(node: Element, name: string): boolean {
  const value = node.properties.className;
  return Array.isArray(value) && value.map(String).includes(name);
}

function isPanel(node: ElementContent): node is Element {
  return node.type === 'element' && node.tagName === 'div' && hasClass(node, 'tab-panel');
}

/**
 * Adds the tab list to every `div.tabs` that holds `div.tab-panel` children:
 * one `<button role="tab">` per panel, ARIA links between tabs and panels, and
 * the first tab marked selected. Runs **after** sanitization (like the code
 * copy button), so buttons and generated ids never pass through author input.
 *
 * Ids use a `featherdown-` prefix. Author ids are prefixed `user-content-` by
 * the sanitizer, so the two can never collide.
 *
 * The markup carries no behavior. All panels stay visible until the host app
 * wires it up and marks the container `data-tabs-ready` (see the README).
 */
export default function rehypeTabs() {
  return (tree: Root): undefined => {
    let group = 0;
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'div' || !hasClass(node, 'tabs')) {
        return;
      }
      const panels = node.children.filter(isPanel);
      if (panels.length === 0) {
        return;
      }
      group += 1;

      const buttons: Element[] = panels.map((panel, i) => {
        const n = `${String(group)}-${String(i + 1)}`;
        const label = panel.properties.dataTabLabel;
        const text = typeof label === 'string' && label.trim() ? label.trim() : `Tab ${String(i + 1)}`;
        panel.properties.id = `featherdown-panel-${n}`;
        panel.properties.role = 'tabpanel';
        panel.properties.ariaLabelledBy = `featherdown-tab-${n}`;
        panel.properties.dataTabLabel = text;
        return {
          type: 'element',
          tagName: 'button',
          properties: {
            type: 'button',
            role: 'tab',
            className: ['tabs-tab'],
            id: `featherdown-tab-${n}`,
            ariaControls: `featherdown-panel-${n}`,
            ariaSelected: i === 0 ? 'true' : 'false',
            tabIndex: i === 0 ? 0 : -1,
          },
          children: [{ type: 'text', value: text }],
        };
      });

      node.children.unshift({
        type: 'element',
        tagName: 'div',
        properties: { className: ['tabs-list'], role: 'tablist' },
        children: buttons,
      });
    });
  };
}
