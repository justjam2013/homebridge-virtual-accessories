/**
 * 
 */

type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>;

export type Range<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>> | T;

// Power

export type powerState = 'on' | 'off';

export function isPowerState(value: string): value is powerState {
  return (value as powerState) !== undefined;
}

// Percentage

export type percentage = Range<0, 100>;

export function isPercentage(value: number): value is percentage {
  return (value as percentage) !== undefined;
}

// Rotation

export type rotation = Range<0, 1>;

export function isRotation(value: number): value is rotation {
  return (value as rotation) !== undefined;
}
