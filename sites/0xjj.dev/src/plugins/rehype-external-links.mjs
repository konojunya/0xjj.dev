import { visit } from 'unist-util-visit';

const OWN_DOMAINS = ['0xjj.dev'];

function isExternal(href) {
  if (!href || href.startsWith('/') || href.startsWith('#')) return false;
  try {
    const host = new URL(href).hostname;
    return !OWN_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/**
 * Adds target="_blank" and rel="noreferrer noopener" to external anchor elements.
 */
export function rehypeExternalLinks() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return;
      if (!isExternal(node.properties.href)) return;
      node.properties.target = '_blank';
      node.properties.rel = 'noreferrer noopener';
    });
  };
}
