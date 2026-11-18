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
 * It also runs after `rehype-slug`, so it can see every id already in the
 * document. Generated ids are `featherdown-tab-<group>-<n>` and
 * `featherdown-panel-<group>-<n>`; a group number is skipped when any of its
 * ids is taken (for example by a heading titled "Featherdown tab 1 1"), so ids
 * stay unique.
 *
 * The markup carries no behavior. All panels stay visible until the host app
 * wires it up and marks the container `data-tabs-ready` (see the README).
 */
export default function rehypeTabs() {
  return (tree: Root): undefined => {
    const taken = new Set<string>();
    visit(tree, 'element', (node) => {
      if (typeof node.properties.id === 'string') {
        taken.add(node.properties.id);
      }
    });

    let group = 0;
    const idsFor = (count: number, g: number): string[] =>
      Array.from({ length: count }, (_, i) => [
        `featherdown-tab-${String(g)}-${String(i + 1)}`,
        `featherdown-panel-${String(g)}-${String(i + 1)}`,
      ]).flat();

    visit(tree, 'element', (node) => {
      if (node.tagName !== 'div' || !hasClass(node, 'tabs')) {
        return;
      }
      const panels = node.children.filter(isPanel);
      if (panels.length === 0) {
        return;
      }

      do {
        group += 1;
      } while (idsFor(panels.length, group).some((id) => taken.has(id)));
      for (const id of idsFor(panels.length, group)) {
        taken.add(id);
      }

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
