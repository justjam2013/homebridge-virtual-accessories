/**
 * 
 */

type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>;

export type Range<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>> | T;

// Power

export type PowerState = 'on' | 'off';

export function isPowerState(value: string): boolean {
  //return (value as PowerState) !== undefined;

  let isPowerState = false;

  if (value !== undefined && (value === 'on' || value === 'off')) {
    isPowerState = true;
  }

  return isPowerState;
}

// Percentage

export type Percentage = Range<0, 100>;

export function isPercentage(value: number): boolean {
  let isPercentage = false;

  if (value !== undefined && value >= 0 && value <= 100) {
    isPercentage = true;
  }

  return isPercentage;
}

// Rotation

export type Rotation = Range<0, 1>;

export function isRotation(value: number): boolean {
  // return (value as Rotation) !== undefined;

  let isRotation = false;

  if (value !== undefined && value >= 0 && value <= 1) {
    isRotation = true;
  }

  return isRotation;
}
