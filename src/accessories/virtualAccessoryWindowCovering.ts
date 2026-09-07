import type { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { PositionAccessory } from './positionAccessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';

/**
 * WindowCovering - Accessory implementation
 */
export class WindowCovering extends PositionAccessory {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.WindowCovering;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getOpenableAccessoryConfiguration(): OpenableAccessoryConfiguration {
    return this.accessoryConfiguration.windowCovering;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return WindowCovering.ACCESSORY_SERVICE_TYPE;
  }
}
