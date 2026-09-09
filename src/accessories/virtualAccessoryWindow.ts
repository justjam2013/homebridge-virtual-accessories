import type { PlatformAccessory } from 'homebridge';

import { ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { PositionAccessory } from './positionAccessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';

/**
 * Window - Accessory implementation
 */
export class Window extends PositionAccessory {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.Window);
  }

  protected getOpenableAccessoryConfiguration(): OpenableAccessoryConfiguration {
    return this.accessoryConfiguration.window;
  }
}
