import { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

/**
 * ExternalAccessory - Abstract accessory
 */
export abstract class ExternalAccessory extends Accessory {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    serviceType: WithUUID<typeof Service>,
  ) {
    super(platform, accessory, accessoryConfiguration, serviceType);
  }

  getExternalAccessoryCategory(): number {
    return this.accessory.category;
  }
}
