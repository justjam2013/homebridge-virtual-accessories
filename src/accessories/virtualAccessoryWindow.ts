import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { OpeningAccessory } from './openingAccessory.js';

/**
 * Window - Accessory implementation
 */
export class Window extends OpeningAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Window';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory, platform.Service.Window);
  }

  protected getAccessoryTypeName(): string {
    return Window.ACCESSORY_TYPE_NAME;
  }
}
