import { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Switch } from '../accessories/virtualAccessorySwitch.js';
import { TriggerableEventAccessory } from '../accessories/triggerableEventAccessory.js';

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
    companionName: string,
    partnerAccessory: TriggerableEventAccessory,
  ) {
    super(platform, accessory);

    this.companionName = companionName;
    this.partnerAccessory = partnerAccessory;

    // Override Switch settings
    this.defaultState = Switch.OFF;
    this.companionSensor = undefined;
    this.muteLogging = false;

    // Replace the Switch Service
    const switchService = this.accessory.getService(this.platform.Service.Switch);
    if (switchService !== undefined) {
      this.accessory.removeService(switchService);
    }

    this.service = this.accessory.getService(this.companionName) ||
                     this.accessory.addService(this.platform.Service.Switch, this.companionName, accessory.UUID + this.postfix);

    // Replace the Name Characteristic
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.companionName!);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Companion Switch Current State: ${Switch.getStateName(this.states.SwitchState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.states.SwitchState));

    // register handlers

    this.service!.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));
  }

  async setOn(value: CharacteristicValue) {
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Calling super.On()`, this.muteLogging);
    super.setOn(value);
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Calling super.On()`, this.muteLogging);

    if (this.states.SwitchState === CompanionSwitch.ON) {
      this.partnerAccessory.triggerEvent(this);
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    return super.getOn();
  }
}
