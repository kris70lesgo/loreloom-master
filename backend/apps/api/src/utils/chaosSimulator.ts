export function simulateChaos(providerName: string, targetProviderName: string): void {
  if (providerName === targetProviderName) {
    const errorTypes = [500, 429];
    const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    throw new Error(`HTTP Error ${randomError}`);
  }
}
