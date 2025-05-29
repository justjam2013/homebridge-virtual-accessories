import { AccessoryConfiguration } from './configurationAccessory.js';

export abstract class OpeningAccessoryConfiguration extends AccessoryConfiguration {
  defaultState!: string;
  transitionDuration!: number;

  abstract isValid(): [boolean, string[]];
}
