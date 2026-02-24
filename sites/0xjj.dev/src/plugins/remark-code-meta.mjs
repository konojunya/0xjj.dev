import { visit } from 'unist-util-visit';

/**
 * Parses Zenn-style `lang:filename` code fence identifiers.
 * Extracts the lang and stores the filename in node.meta.
 * Also handles plain `lang` (no filename).
 */
export function remarkCodeMeta() {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (!node.lang) return;
      const colonIdx = node.lang.indexOf(':');
      if (colonIdx === -1) return;

      const filename = node.lang.slice(colonIdx + 1);
      node.lang = node.lang.slice(0, colonIdx) || null;
      const existing = node.meta ? node.meta + ' ' : '';
      node.meta = `${existing}filename="${filename}"`;
    });
  };
}
