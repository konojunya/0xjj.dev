// ─── CIDR matching ────────────────────────────────────────────────────────────

function ipToBytes(ip: string): Uint8Array | null {
  if (ip.includes(':')) return ipv6ToBytes(ip);
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return null;
  return new Uint8Array(parts);
}

function ipv6ToBytes(ip: string): Uint8Array | null {
  const halves = ip.split('::');
  let groups: string[];
  if (halves.length === 2) {
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const fill = 8 - left.length - right.length;
    if (fill < 0) return null;
    groups = [...left, ...Array(fill).fill('0'), ...right];
  } else {
    groups = ip.split(':');
  }
  if (groups.length !== 8) return null;

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const val = parseInt(groups[i], 16);
    if (isNaN(val)) return null;
    bytes[i * 2] = (val >> 8) & 0xff;
    bytes[i * 2 + 1] = val & 0xff;
  }
  return bytes;
}

function isInCidr(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split('/');
  const prefix = Number(prefixStr);
  const ipBytes = ipToBytes(ip);
  const netBytes = ipToBytes(network);
  if (!ipBytes || !netBytes || ipBytes.length !== netBytes.length) return false;

  const fullBytes = Math.floor(prefix / 8);
  const remainBits = prefix % 8;

  for (let i = 0; i < fullBytes; i++) {
    if (ipBytes[i] !== netBytes[i]) return false;
  }

  if (remainBits > 0 && fullBytes < ipBytes.length) {
    const mask = (~0 << (8 - remainBits)) & 0xff;
    if ((ipBytes[fullBytes] & mask) !== (netBytes[fullBytes] & mask)) return false;
  }

  return true;
}

// ─── provider IP ranges ──────────────────────────────────────────────────────

const PROVIDERS: { name: string; cidrs: string[] }[] = [
  {
    name: 'Cloudflare',
    cidrs: [
      // IPv4 — https://www.cloudflare.com/ips-v4/
      '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
      '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
      '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
      '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
      // IPv6 — https://www.cloudflare.com/ips-v6/
      '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32',
      '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
    ],
  },
  {
    name: 'Fastly',
    cidrs: [
      '23.235.32.0/20', '43.249.72.0/22', '103.244.50.0/24', '103.245.222.0/23',
      '103.245.224.0/24', '104.156.80.0/20', '140.248.64.0/18', '140.248.128.0/17',
      '146.75.0.0/17', '151.101.0.0/16', '157.52.64.0/18', '167.82.0.0/17',
      '167.82.128.0/20', '167.82.160.0/20', '167.82.224.0/20', '172.111.64.0/18',
      '185.31.16.0/22', '199.27.72.0/21', '199.232.0.0/16',
      '2a04:4e40::/32', '2a04:4e42::/32',
    ],
  },
  {
    name: 'Vercel',
    cidrs: ['76.76.21.0/24'],
  },
  {
    name: 'GitHub Pages',
    cidrs: [
      '185.199.108.0/22',
      '2606:50c0:8000::/48', '2606:50c0:8001::/48',
      '2606:50c0:8002::/48', '2606:50c0:8003::/48',
    ],
  },
  {
    name: 'Netlify',
    cidrs: ['75.2.60.0/24', '99.83.231.0/24'],
  },
  {
    name: 'Firebase Hosting',
    cidrs: ['199.36.158.0/23'],
  },
  {
    name: 'Fly.io',
    cidrs: ['66.241.124.0/22', '137.66.0.0/16'],
  },
  {
    name: 'AWS CloudFront',
    cidrs: [
      '13.32.0.0/15', '13.35.0.0/16', '13.224.0.0/14',
      '18.64.0.0/14', '18.68.0.0/16', '18.154.0.0/15', '18.160.0.0/14', '18.164.0.0/14',
      '18.172.0.0/15',
      '52.84.0.0/15', '52.222.128.0/17',
      '54.182.0.0/16', '54.192.0.0/16', '54.230.0.0/16', '54.239.128.0/18', '54.240.128.0/18',
      '99.84.0.0/16', '99.86.0.0/16',
      '108.138.0.0/15', '108.156.0.0/14',
      '143.204.0.0/16', '144.220.0.0/16',
      '204.246.164.0/22', '204.246.168.0/22', '205.251.200.0/21',
    ],
  },
  {
    name: 'Google Cloud',
    cidrs: [
      '34.0.0.0/9', '34.128.0.0/10',
      '35.184.0.0/13', '35.192.0.0/14', '35.196.0.0/15', '35.198.0.0/16',
      '35.199.0.0/17', '35.199.128.0/18', '35.200.0.0/13',
      '35.208.0.0/12', '35.224.0.0/12', '35.240.0.0/13',
    ],
  },
];

// ─── public API ──────────────────────────────────────────────────────────────

export function identifyProvider(ip: string): string | undefined {
  for (const provider of PROVIDERS) {
    if (provider.cidrs.some((cidr) => isInCidr(ip, cidr))) {
      return provider.name;
    }
  }
  return undefined;
}
