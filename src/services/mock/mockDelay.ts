export function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 250))
}
