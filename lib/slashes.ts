// Pengganti regex /\/+$/ dan /^\/+|\/+$/g (ditandai SonarQube sebagai rawan backtracking).

export function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end--;
  return value.slice(0, end);
}

export function trimSlashes(value: string): string {
  let start = 0;
  while (start < value.length && value[start] === '/') start++;
  return trimTrailingSlashes(value.slice(start));
}
