import { visit } from 'unist-util-visit';

/**
 * Converts Zenn-style :::message and :::message alert container directives
 * to hast div elements with a `zenn-message` class.
 */
export function remarkZennMessage() {
  return (tree) => {
    visit(tree, 'containerDirective', (node) => {
      if (node.name !== 'message') return;

      const variant = node.attributes?.class ?? '';
      const isAlert = variant.includes('alert');

      node.data = node.data ?? {};
      node.data.hName = 'div';
      node.data.hProperties = {
        className: ['zenn-message', isAlert ? 'zenn-message--alert' : 'zenn-message--info'],
      };
    });
  };
}
