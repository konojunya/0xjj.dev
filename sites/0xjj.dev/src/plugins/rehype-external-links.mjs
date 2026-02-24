import { visit } from 'unist-util-visit';

/**
 * Adds target="_blank" and rel="noreferrer noopener" to all anchor elements.
 */
export function rehypeExternalLinks() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return;
      node.properties.target = '_blank';
      node.properties.rel = 'noreferrer noopener';
    });
  };
}
