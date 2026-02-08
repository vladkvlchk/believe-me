/**
 * Mock TwitterScore service.
 * In production, replace with real API call (e.g., Ethersign, Twitter API, etc.)
 */

// Configurable mock scores for testing
const mockScores: Record<string, number> = {};

export function setMockScore(wallet: string, score: number) {
  mockScores[wallet.toLowerCase()] = score;
}

export function getTwitterScore(wallet: string): number {
  const key = wallet.toLowerCase();
  if (key in mockScores) {
    return mockScores[key];
  }
  // Default: generate a deterministic-ish score from the address
  // Last 2 hex chars -> 0-255, so roughly half will be > 100
  const lastBytes = parseInt(wallet.slice(-4), 16);
  return lastBytes % 256;
}
