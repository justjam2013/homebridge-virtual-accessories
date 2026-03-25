import { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../../platform.js';
import { AccessoryConfiguration } from '../../configuration/configurationAccessory.js';
import { Switch } from '../virtualAccessorySwitch.js';

import { TriggerableEventAccessory } from '../triggerableEventAccessory.js';

/**
 * CompanionSwitch - Companion accessory
 */
export class CompanionSwitch extends Switch {

  private readonly postfix: string = '-switch';

  private companionName: string;
  private partnerAccessory: TriggerableEventAccessory;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    companionName: string,
    partnerAccessory: TriggerableEventAccessory,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.companionName = companionName;
    this.partnerAccessory = partnerAccessory;

    // Override Switch settings
    this.defaultState = Switch.OFF;
    this.companionSensor = undefined;
    this.muteLogging = false;

    // Replace the Switch Service
    const switchService = this.accessory.getService(ServiceType.Switch);
    if (switchService !== undefined) {
      this.accessory.removeService(switchService);
    }

    this.service = this.accessory.getService(this.companionName) ||
                     this.accessory.addService(ServiceType.Switch, this.companionName, accessory.UUID + this.postfix);

    // Replace the Name Characteristic
    this.setValue(CharacteristicType.Name, this.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Companion Switch Current State: ${Switch.getStateName(this.getOn())}`);
    this.updateOn(this.getOn());

    // register handlers

    this.service!.getCharacteristic(CharacteristicType.On)
      .onGet(this.getOnHandler.bind(this))
      .onSet(this.setOnHandler.bind(this));
  }

  async setOnHandler(value: CharacteristicValue) {
    this.log.debug(`[${this.accessoryName}] Calling super.On()`);
    super.setOnHandler(value);
    this.log.debug(`[${this.accessoryName}] Calling super.On()`);

    if (this.getOn() === CompanionSwitch.ON) {
      this.partnerAccessory.triggerEvent(this);
    }
  }

  async getOnHandler(): Promise<CharacteristicValue> {
    return super.getOnHandler();
  }
}
