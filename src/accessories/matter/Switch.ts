 
import type { PlatformAccessory, SerializedMatterAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../../platform.js';
import { AccessoryConfiguration } from '../../configuration/configurationAccessory.js';
import { Accessory } from '../accessory.js';

/**
 * Switch - Accessory implementation
 */
export class MatterSwitch extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Switch';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: SerializedMatterAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    // This needs to be fixed
    super(platform, accessory as unknown as PlatformAccessory, accessoryConfiguration);
  }

  protected getAccessoryTypeName(): string {
    return MatterSwitch.ACCESSORY_TYPE_NAME;
  }

  protected getJsonState(): string {
    const jsonState = {
      // [this.stateStorageKey]: this.states.SwitchState,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }
}
