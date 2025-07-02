import { Validatable } from './validatable.js';

/**
 * 
 */
export abstract class AudioAccessoryConfiguration implements Validatable {
  volume!: number;
  mute!: boolean;

  abstract isValid(prefix: string): [boolean, string[]];
}
