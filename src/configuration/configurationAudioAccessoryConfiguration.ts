import { AccessoryConfiguration } from './configurationAccessory.js';

/**
 * 
 */
export abstract class AudioAccessoryConfiguration extends AccessoryConfiguration {
  volume!: number;
  mute!: boolean;

  abstract isValid(prefix: string): [boolean, string[]];
}
