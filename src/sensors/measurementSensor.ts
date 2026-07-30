import type { Characteristic, CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from '../accessories/accessory.js';

import { UpdatableMeasurementSensor } from './updatableSensor.js';

/**
 * Sensor - Abstract accessory
 */
export abstract class MeasurementSensor extends Accessory implements UpdatableMeasurementSensor {

  protected valueMeasured: WithUUID<{ new (): Characteristic; }>;
  
  protected states = {
    SensorValue: 0,
    SensorUnits: '',
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.states.SensorValue = this.getDefaultValue();

    this.valueMeasured = this.getMeasurementCharacteristic();

    const sensorService: WithUUID<typeof Service> = this.getService();
    this.service = this.accessory.getService(sensorService) || this.accessory.addService(sensorService as unknown as Service);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Sensor Current Value: ${this.states.SensorValue}`);
    this.service.updateCharacteristic(this.valueMeasured, (this.states.SensorValue));

    // register handlers

    this.service.getCharacteristic(this.valueMeasured)
      .onGet(this.getValueMeasured.bind(this));
  }

  protected abstract getService(): WithUUID<typeof Service>;

  protected abstract getMeasurementCharacteristic(): WithUUID<{ new (): Characteristic; }>;

  // Handlers

  async getValueMeasured(): Promise<CharacteristicValue> {
    const sensorValue = this.states.SensorValue;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Sensor Current State: ${sensorValue}`);

    return sensorValue;
  }

  protected abstract getDefaultValue(): number;

  protected getJsonState(): string {
    return JSON.stringify({});
  }

  // Updatable Sensor interface

  abstract updateMeasurementSensor(value: number, accessoryId: string): void;
}
