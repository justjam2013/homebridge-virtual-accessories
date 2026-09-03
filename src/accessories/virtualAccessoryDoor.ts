import type { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { PositionAccessory } from './positionAccessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';

/**
 * Door - Accessory implementation
 */
export class Door extends PositionAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Door';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getOpeningAccessoryConfiguration(): OpenableAccessoryConfiguration {
    return this.accessoryConfiguration.door;
  }

  protected getAccessoryTypeName(): string {
    return Door.ACCESSORY_TYPE_NAME;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return ServiceType.Door;
  }
}
