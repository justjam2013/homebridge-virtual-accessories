import { PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

export abstract class ExternalAccessory extends Accessory {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);
  }

  getExternalAccessoryCategory(): number {
    return this.accessory.category;
  }
}
