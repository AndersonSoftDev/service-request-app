// OpenAPI string lengths count Unicode code points, not UTF-16 code units.
export function textLength(value: string): number {
  return Array.from(value).length
}
