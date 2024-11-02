import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from './platform.js';
import { VirtualSwitchAccessory } from './virtualAccessorySwitch.js';
import { VirtualLockAccessory } from './virtualAccessoryLock.js';
import { VirtualDoorbellAccessory } from './virtualAccessoryDoorbell.js';
import { VirtualGarageDoorAccessory } from './virtualAccessoryGarageDoor.js';

/**
 * Virtual Accessory Factory
 * Factory class to create virtual accessories
 */
export abstract class VirtualAccessoryFactory {

  constructor(
  ) {
  
  }
  
  static createVirtualAccessory(
    type: string,
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    switch (type) {
    case 'switch':
      new VirtualSwitchAccessory(platform, accessory);
      break;
    case 'lock':
      new VirtualLockAccessory(platform, accessory);
      break;
    case 'doorbell':
      new VirtualDoorbellAccessory(platform, accessory);
      break;
    case 'garagedoor':
      new VirtualGarageDoorAccessory(platform, accessory);
      break;
    default:
      platform.log.error('Error creating accessory. Invalid type:', type);
    }
  }
}
