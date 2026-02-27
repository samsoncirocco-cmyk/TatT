export function normalizeVector(vec: number[]): number[] {
  if (!Array.isArray(vec) || vec.length === 0) {
    return [];
  }

  const magnitude = Math.sqrt(vec.reduce((sum, value) => sum + (value * value), 0));
  if (magnitude === 0) {
    return vec.map(() => 0);
  }

  return vec.map((value) => value / magnitude);
}

export function assertUnitVector(vec: number[], tolerance: number = 0.01): void {
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error('Vector must be a non-empty number array');
  }

  const magnitude = Math.sqrt(vec.reduce((sum, value) => sum + (value * value), 0));
  if (Math.abs(1 - magnitude) > tolerance) {
    throw new Error(`Vector magnitude ${magnitude.toFixed(6)} is outside tolerance ${tolerance}`);
  }
}
