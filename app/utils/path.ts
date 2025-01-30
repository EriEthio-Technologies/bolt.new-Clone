export function dirname(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '.';
}

export function relative(from: string, to: string): string {
  const fromParts = from.split('/').filter(Boolean);
  const toParts = to.split('/').filter(Boolean);

  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i++;
  }

  const upCount = fromParts.length - i;
  const relativeParts = Array(upCount).fill('..').concat(toParts.slice(i));

  return relativeParts.join('/') || '.';
} 