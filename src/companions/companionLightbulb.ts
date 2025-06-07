import { VirtualAccessoriesPlatform } from '../platform.js';
import { PlatformAccessory } from 'homebridge';

import { Lightbulb } from '../accessories/virtualAccessoryLightbulb.js';

/**
 * CompanionLightbulb - Companion accessory
 */
export class CompanionLightbulb extends Lightbulb {

  private companionName: string;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionName: string,
  ) {
    super(platform, accessory);

    this.companionName = companionName;
  }
}
