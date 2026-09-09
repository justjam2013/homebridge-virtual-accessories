import type { PlatformAccessory } from 'homebridge';

import { ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { PositionAccessory } from './positionAccessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';

/**
 * Door - Accessory implementation
 */
export class Door extends PositionAccessory {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.Door);
  }

  protected getOpenableAccessoryConfiguration(): OpenableAccessoryConfiguration {
    return this.accessoryConfiguration.door;
  }
}
