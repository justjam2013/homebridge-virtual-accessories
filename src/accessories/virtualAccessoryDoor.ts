import type { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { PositionAccessory } from './positionAccessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';

/**
 * Door - Accessory implementation
 */
export class Door extends PositionAccessory {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.Door;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getOpenableAccessoryConfiguration(): OpenableAccessoryConfiguration {
    return this.accessoryConfiguration.door;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return Door.ACCESSORY_SERVICE_TYPE;
  }
}
