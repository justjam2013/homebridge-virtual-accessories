import { Validatable } from './validatable.js';

/**
 * 
 */
export abstract class OpenableAccessoryConfiguration implements Validatable {
  defaultState!: string;
  transitionDuration!: number;

  abstract isValid(prefix: string): [boolean, string[]];
}
