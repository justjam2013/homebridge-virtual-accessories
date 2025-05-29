import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { OpeningAccessory } from './openingAccessory.js';

/**
 * Door - Accessory implementation
 */
export class Door extends OpeningAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Door';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory, platform.Service.Door);
  }

  protected getAccessoryTypeName(): string {
    return Door.ACCESSORY_TYPE_NAME;
  }
}
