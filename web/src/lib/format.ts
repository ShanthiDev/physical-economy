export function formatTonnes(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} bn t`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} m t`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} k t`;
  return `${Math.round(value)} t`;
}

export function colorToCss(color: [number, number, number, number], alphaScale = 1): string {
  const [red, green, blue, alpha] = color;
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, (alpha / 255) * alphaScale)})`;
}

export function colorSchemeFor(color: [number, number, number, number]): string[] {
  const [red, green, blue] = color;
  // flowmap.gl reverses custom schemes in darkMode, so pass the intended order inverted.
  return [
    `rgba(${Math.min(255, Math.round(red * 1.12))}, ${Math.min(255, Math.round(green * 1.12))}, ${Math.min(255, Math.round(blue * 1.12))}, 0.96)`,
    `rgba(${red}, ${green}, ${blue}, 0.72)`,
    `rgba(${Math.round(red * 0.48)}, ${Math.round(green * 0.48)}, ${Math.round(blue * 0.48)}, 0.28)`
  ];
}

export function withAlpha(color: [number, number, number, number], alpha: number): [number, number, number, number] {
  return [color[0], color[1], color[2], Math.round(255 * Math.max(0, Math.min(1, alpha)))];
}

export function legendLineWidth(ratio: number): number {
  return 1.4 + (11 - 1.4) * Math.sqrt(ratio);
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function random01(seed: string): number {
  return hashString(seed) / 4294967295;
}
