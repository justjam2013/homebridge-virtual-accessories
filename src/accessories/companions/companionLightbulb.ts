import { PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../../platform.js';
import { AccessoryConfiguration } from '../../configuration/configurationAccessory.js';

import { Lightbulb } from '../virtualAccessoryLightbulb.js';

// UNUSED - Was created to provide timer capability

/**
 * CompanionLightbulb - Companion accessory
 */
export class CompanionLightbulb extends Lightbulb {

  private companionName: string;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    companionName: string,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.companionName = companionName;
  }
}
