export function range(length: number, start: number = 0, step: number = 1): number[] {
  return Array.from({ length }, (v, i) => i * step + start)
}
