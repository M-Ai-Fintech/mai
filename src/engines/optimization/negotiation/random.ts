export interface RandomSource {
  next(): number;
  nextInt(maximumExclusive: number): number;
  nextGaussian(mean?: number, standardDeviation?: number): number;
}

export function createSeededRandom(seed: number): RandomSource {
  return new Mulberry32Random(seed);
}

class Mulberry32Random implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(maximumExclusive: number): number {
    if (!Number.isInteger(maximumExclusive) || maximumExclusive <= 0) {
      throw new Error(
        `Invalid random bound ${maximumExclusive}; expected a positive integer.`,
      );
    }
    return Math.floor(this.next() * maximumExclusive);
  }

  nextGaussian(mean = 0, standardDeviation = 1): number {
    const u = 1 - this.next();
    const v = this.next();
    const magnitude = Math.sqrt(-2 * Math.log(u));
    return mean + standardDeviation * magnitude * Math.cos(2 * Math.PI * v);
  }
}
