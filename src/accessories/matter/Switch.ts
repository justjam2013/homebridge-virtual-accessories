/* eslint-disable @typescript-eslint/no-unused-vars */
import type { SerializedMatterAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../../platform.js';
import { AccessoryConfiguration } from '../../configuration/configurationAccessory.js';

/**
 * Switch - Accessory implementation
 */
export class MatterSwitch {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: SerializedMatterAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
  }
}