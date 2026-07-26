import type { Characteristic, CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from '../accessories/accessory.js';

import { UpdatableMeasurementSensor } from './updatableSensor.js';

/**
 * Sensor - Abstract accessory
 */
export abstract class MeasurementSensor<S extends typeof Service> extends Accessory<S> implements UpdatableMeasurementSensor {

  protected valueMeasured: WithUUID<{ new (): Characteristic; }>;
  
  // Device states
  protected Value: number = 0;
  protected Units: string = '';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    serviceType: S,
    accessoryTypeName: string,
  ) {
    super(
      platform,accessory,
      accessoryConfiguration,
      serviceType,
      accessoryTypeName,
    );

    // First configure the device based on the accessory details
    this.Value = this.getDefaultValue();
    this.Units = this.accessoryConfiguration.measurement.units;

    this.valueMeasured = this.getMeasurementCharacteristic();

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Sensor Current Value: ${this.Value}`);
    this.service.updateCharacteristic(this.valueMeasured, (this.Value));

    // register handlers

    this.service.getCharacteristic(this.valueMeasured)
      .onGet(this.getValueMeasured.bind(this));
  }

  protected abstract getMeasurementCharacteristic(): WithUUID<{ new (): Characteristic; }>;

  // Handlers

  async getValueMeasured(): Promise<CharacteristicValue> {
    const sensorValue = this.Value;

    this.log.debug(`[${this.accessoryName}] Getting Sensor Current State: ${sensorValue}`);

    return sensorValue;
  }

  protected abstract getDefaultValue(): number;

  protected getJsonState(): string {
    return JSON.stringify({});
  }

  // Updatable Sensor interface

  abstract updateMeasurementSensor(value: number, accessoryId: string): void;
}
