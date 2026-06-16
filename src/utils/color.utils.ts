export function stringToColor(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hash1 = h1 >>> 0;
  const hash2 = h2 >>> 0;

  const h = hash1 % 360;

  const s = 65 + (hash2 % 26);

  const l = 35 + ((hash1 >>> 8) % 21);

  return `hsl(${h}, ${s}%, ${l}%)`;
}

export const DEFAULT_COLOR = '#94a3b8';
