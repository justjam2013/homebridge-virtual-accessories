import { VirtualAccessoriesPlatform } from '../../platform.js';
import { PlatformAccessory } from 'homebridge';
import { Switch } from '../virtualAccessorySwitch.js';
import { Accessory } from '../virtualAccessory';
import { AccessoryNotAllowedError } from '../../errors.js';

export class CompanionSwitch extends Switch {

  private readonly postfix: string = '-switch';

  private companionName: string;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionName: string,
  ) {
    super(platform, accessory);

    this.companionName = companionName;

    // Override Switch settings
    this.defaultState = Switch.OFF;

    // Replace the Switch Service
    const switchService = this.accessory.getService(this.platform.Service.Switch);
    if (switchService !== undefined) {
      this.accessory.removeService(switchService);
    }

    this.service = this.accessory.getService(companionName) ||
                     this.accessory.addService(this.platform.Service.Switch, companionName, accessory.UUID + this.postfix);

    // Replace the Name Characteristic
    this.service.setCharacteristic(this.platform.Characteristic.Name, companionName!);

    // Remove any decorations
    this.durationTimer = undefined;
    this.companionSensor = undefined;
  }

  public setState(value: boolean, accessory: Accessory) {
    if (accessory.accessory.UUID !== this.accessory.UUID) {
      throw new AccessoryNotAllowedError(`Switch ${accessory.accessoryConfiguration.accessoryName} is not allowed to change the state of this switch`);
    }

    this.states.SwitchState = value;
  }
}
