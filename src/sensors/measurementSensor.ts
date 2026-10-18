import type { Characteristic, CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from '../accessories/accessory.js';

import { UpdatableMeasurementSensor } from './updatableSensor.js';

/**
 * Sensor - Abstract accessory
 */
export abstract class MeasurementSensor extends Accessory implements UpdatableMeasurementSensor {

  private static readonly stateStorageKey: string = 'SensorValue';

  protected MeasurementCharacteristic: WithUUID<{ new (): Characteristic; }>;

  protected SensorUnits: string = '';
  
  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    serviceType: WithUUID<typeof Service>,
    measurementCharacteristic: WithUUID<{ new (): Characteristic; }>,
  ) {
    super(platform, accessory, accessoryConfiguration, serviceType);

    let SensorValue: number = 0;

    this.MeasurementCharacteristic = measurementCharacteristic;

    // First configure the device based on the accessory details
    SensorValue = this.getDefaultValue(); 

    // If the sensor is stateful, restore the last value it was set to
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const cachedValue = MeasurementSensor.getStoredSensorValue(this.loadAccessoryState(this.storagePath));
      if (cachedValue !== undefined) {
        this.log.debug(`[${this.accessoryName}] Restoring Sensor Current Value: ${cachedValue}`);
        SensorValue = cachedValue;
      }
    }

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Sensor Current Value: ${SensorValue}`);
    this.service.setCharacteristic(this.MeasurementCharacteristic, (SensorValue));

    // Last register handlers

    this.service.getCharacteristic(this.MeasurementCharacteristic)
      .onGet(this.getMeasurementHandler.bind(this));
  }

  getSensorValue(): number {
    return this.getCharacteristicValue(this.MeasurementCharacteristic) as number;
  }

  //
  // ****************************** Handlers ******************************
  //

  // Measurement

  async getMeasurementHandler(): Promise<CharacteristicValue> {
    const SensorValue: number = this.getSensorValue();
    this.log.debug(`[${this.accessoryName}] Getting Sensor Current Value: ${SensorValue}`);

    return SensorValue;
  }

  protected abstract getDefaultValue(): number;

  /**
   * Read a stored sensor value, ignoring anything that is not a finite number
   */
  private static getStoredSensorValue(json: Record<string, unknown> | undefined): number | undefined {
    const value = json?.[MeasurementSensor.stateStorageKey];
    return (typeof value === 'number' && Number.isFinite(value)) ? value : undefined;
  }

  protected getJsonState(): string {
    return JSON.stringify({ [MeasurementSensor.stateStorageKey]: this.getSensorValue() });
  }

  // Updatable Sensor interface

  abstract updateMeasurementSensor(value: number, accessoryId: string): void;
}
