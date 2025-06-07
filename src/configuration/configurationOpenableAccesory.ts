import { AccessoryConfiguration } from './configurationAccessory.js';

/**
 * 
 */
export abstract class OpenableAccessoryConfiguration extends AccessoryConfiguration {
  defaultState!: string;
  transitionDuration!: number;

  abstract isValid(prefix: string): [boolean, string[]];
}
