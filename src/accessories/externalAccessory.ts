import { PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

/**
 * ExternalAccessory - Abstract accessory
 */
export abstract class ExternalAccessory<S extends typeof Service> extends Accessory<S> {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    serviceType: S,
    accessoryTypeName: string,
  ) {
    super(platform, accessory, accessoryConfiguration, serviceType, accessoryTypeName);
  }

  getExternalAccessoryCategory(): number {
    return this.accessory.category;
  }
}
