/* eslint-disable brace-style */
/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { UpdatableMeasurementSensor } from '../sensors/updatableSensor.js';
import { HumidifierType } from '../configuration/schema.js';
import { Active, CurrentHumidifierDehumidifierState, TargetHumidifierDehumidifierState } from './accessoryCharacteristics.js';

/**
 * HumidifierDehumidifier - Accessory implementation
 */
export class HumidifierDehumidifier extends Accessory<typeof Service.HumidifierDehumidifier> implements UpdatableMeasurementSensor {

  private static readonly ACCESSORY_TYPE_NAME: string = 'HumidifierDehumidifier';

  private readonly stateStorageKey: string = 'HumidifierDehumidifierActive';
  private readonly targetStateStorageKey: string = 'HumidifierDehumidifierTargetState';
  private readonly humidifierThresholdStorageKey: string = 'HumidifierThreshold';
  private readonly dehumidifierThresholdStorageKey: string = 'DehumidifierThreshold';

  private deviceType: string;

  // Device state
  private Active: number = Active.INACTIVE;
  private CurrentState: number = CurrentHumidifierDehumidifierState.INACTIVE;
  private TargetState: number = TargetHumidifierDehumidifierState.AUTOMATIC;
  private HumidifierThreshold: number = 30;
  private DehumidifierThreshold: number = 60;
  private CurrentRelativeHumidity: number = 50;          // This value comes from sensor, set to 50% for now

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.HumidifierDehumidifier,
      HumidifierDehumidifier.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    this.Active = Active.INACTIVE;
    this.CurrentState = CurrentHumidifierDehumidifierState.INACTIVE;
    this.HumidifierThreshold = this.accessoryConfiguration.humidifierDehumidifier.humidifierThreshold;
    this.DehumidifierThreshold = this.accessoryConfiguration.humidifierDehumidifier.dehumidifierThreshold;

    this.deviceType = this.accessoryConfiguration.humidifierDehumidifier.type;

    if (this.deviceType === HumidifierType.Humidifier) {
      this.TargetState = TargetHumidifierDehumidifierState.HUMIDIFY;
    }
    else if (this.deviceType === HumidifierType.Dehumidifier) {
      this.TargetState = TargetHumidifierDehumidifierState.DEHUMIDIFY;
    }
    else {
      this.TargetState = TargetHumidifierDehumidifierState.AUTOMATIC;
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedTargetState: number = accessoryState[this.targetStateStorageKey] as number;

      if (cachedState !== undefined) {
        this.Active = cachedState;
      }
      if (cachedTargetState !== undefined) {
        this.TargetState = cachedTargetState;
      }
      if (this.dehumidifies()) {
        const cachedDehumidifierThreshold: number = accessoryState[this.dehumidifierThresholdStorageKey] as number;
        if (cachedDehumidifierThreshold !== undefined) {
          this.DehumidifierThreshold = cachedDehumidifierThreshold;
        }
      }
      if (this.humidifies()) {
        const cachedHumidifierThreshold: number = accessoryState[this.humidifierThresholdStorageKey] as number;
        if (cachedHumidifierThreshold !== undefined) {
          this.HumidifierThreshold = cachedHumidifierThreshold;
        }
      }
    }

    this.setDeviceOperationalCondition();

    // These characteristics will be added back as needed
    this.service.removeCharacteristic(this.service.getCharacteristic(this.platform.Characteristic.RelativeHumidityDehumidifierThreshold));
    this.service.removeCharacteristic(this.service.getCharacteristic(this.platform.Characteristic.RelativeHumidityHumidifierThreshold));

    this.setHumidifierDehumidifierServiceProperties(this.service!);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Humidifier/Dehumidifier Current State: ${CurrentHumidifierDehumidifierState.getName(this.CurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState, (this.CurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState, (this.TargetState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setActive.bind(this))
      .onGet(this.getActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState)
      .onGet(this.getCurrentHumidifierDehumidifierState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState)
      .onSet(this.setTargetHumidifierDehumidifierState.bind(this))
      .onGet(this.getTargetHumidifierDehumidifierState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getCurrentRelativeHumidity.bind(this));

    if (this.dehumidifies()) {
      // Characteristic was removed when adding the Service
      this.service.addCharacteristic(this.platform.Characteristic.RelativeHumidityDehumidifierThreshold)
        .onSet(this.setRelativeHumidityDehumidifierThreshold.bind(this))
        .onGet(this.getRelativeHumidityDehumidifierThreshold.bind(this));
    }

    if (this.humidifies()) {
      // Characteristic was removed when adding the Service
      this.service.addCharacteristic(this.platform.Characteristic.RelativeHumidityHumidifierThreshold)
        .onSet(this.setRelativeHumidityHumidifierThreshold.bind(this))
        .onGet(this.getRelativeHumidityHumidifierThreshold.bind(this));
    }

    const characteristics: string[] = this.service.characteristics.map(characteristic => characteristic.displayName);
    this.log.debug(`[${this.accessoryName}] Characteristics: ${characteristics.join(', ')}`);
  }

  // Handlers

  async setActive(value: CharacteristicValue) {
    this.Active = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryName}] Setting Active: ${Active.getName(this.Active)}`);
  }

  async getActive(): Promise<CharacteristicValue> {
    const humidifierDehumidifierActive = this.Active;

    this.log.debug(`[${this.accessoryName}] Getting Active: ${Active.getName(humidifierDehumidifierActive)}`);

    return humidifierDehumidifierActive;
  }

  async getCurrentHumidifierDehumidifierState(): Promise<CharacteristicValue> {
    const humidifierDehumidifierCurrentState = this.CurrentState;

    this.log.debug(`[${this.accessoryName}] Getting Current Humidifier Dehumidifier State: ${CurrentHumidifierDehumidifierState.getName(humidifierDehumidifierCurrentState)}`);

    return humidifierDehumidifierCurrentState;
  }

  async setTargetHumidifierDehumidifierState(value: CharacteristicValue) {
    this.TargetState = value as number;

    this.log.info(`[${this.accessoryName}] Setting Target Humidifier Dehumidifier State: ${TargetHumidifierDehumidifierState.getName(this.TargetState)}`);

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryName}] Setting Current Humidifier Dehumidifier State: ${CurrentHumidifierDehumidifierState.getName(this.CurrentState)}`);
  }

  async getTargetHumidifierDehumidifierState(): Promise<CharacteristicValue> {
    const humidifierDehumidifierTargetState = this.TargetState;

    this.log.debug(`[${this.accessoryName}] Getting Target Humidifier Dehumidifier State: ${TargetHumidifierDehumidifierState.getName(humidifierDehumidifierTargetState)}`);

    return humidifierDehumidifierTargetState;
  }

  async getCurrentRelativeHumidity(): Promise<CharacteristicValue> {
    const currentRelativeHumidity = this.CurrentRelativeHumidity;

    this.log.debug(`[${this.accessoryName}] Getting Current Relative Humidity: ${currentRelativeHumidity}%`);

    return currentRelativeHumidity;
  }

  async setRelativeHumidityDehumidifierThreshold(value: CharacteristicValue) {
    this.DehumidifierThreshold = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryName}] Setting Relative Humidity Dehumidifier Threshold: ${this.DehumidifierThreshold}%`);
  }

  async getRelativeHumidityDehumidifierThreshold(): Promise<CharacteristicValue>  {
    const dehumidifierThreshold = this.DehumidifierThreshold;

    this.log.debug(`[${this.accessoryName}] Getting Relative Humidity Dehumidifier Threshold: ${dehumidifierThreshold}%`);

    return dehumidifierThreshold;
  }

  async setRelativeHumidityHumidifierThreshold(value: CharacteristicValue) {
    this.HumidifierThreshold = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryName}] Setting Relative Humidity Humidifier Threshold: ${this.HumidifierThreshold}%`);
  }

  async getRelativeHumidityHumidifierThreshold(): Promise<CharacteristicValue> {
    const humidifierThreshold = this.HumidifierThreshold;

    this.log.debug(`[${this.accessoryName}] Getting Relative Humidity Humidifier Threshold: ${humidifierThreshold}%`);

    return humidifierThreshold;
  }

  //

  protected override getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.Active,
      [this.targetStateStorageKey]: this.TargetState,
      [this.dehumidifierThresholdStorageKey]: this.DehumidifierThreshold,
      [this.humidifierThresholdStorageKey]: this.HumidifierThreshold,
    });
    return json;
  }

  private humidifies(): boolean {
    return [HumidifierType.Auto, HumidifierType.Humidifier].includes(this.deviceType);
  }

  private dehumidifies(): boolean {
    return [HumidifierType.Auto, HumidifierType.Dehumidifier].includes(this.deviceType);
  }

  private setDeviceOperationalCondition() {
    if (this.Active === Active.INACTIVE) {
      this.CurrentState = CurrentHumidifierDehumidifierState.INACTIVE;
    }
    else {  // (this.Active === Active.ACTIVE)
      if (this.TargetState === TargetHumidifierDehumidifierState.HUMIDIFY) {
        this.CurrentState = CurrentHumidifierDehumidifierState.HUMIDIFYING;
      }
      else if (this.TargetState === TargetHumidifierDehumidifierState.DEHUMIDIFY) {
        this.CurrentState = CurrentHumidifierDehumidifierState.DEHUMIDIFYING;
      }
      else {  // (this.TargetState === TargetHumidifierDehumidifierState.AUTOMATIC)
        if (this.CurrentRelativeHumidity < this.HumidifierThreshold) {
          if (this.humidifies()) {
            this.CurrentState = CurrentHumidifierDehumidifierState.HUMIDIFYING;
          }
        }
        else if (this.CurrentRelativeHumidity > this.DehumidifierThreshold) {
          if (this.dehumidifies()) {
            this.CurrentState = CurrentHumidifierDehumidifierState.DEHUMIDIFYING;
          }
        }
        else {
          this.CurrentState = CurrentHumidifierDehumidifierState.IDLE;
        }
      }
    }

    this.service?.setCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState, (this.CurrentState));

    this.storeState();

    this.log.debug(`[${this.accessoryName}] Humidifier/Dehumidifier current state: ${CurrentHumidifierDehumidifierState.getName(this.CurrentState)}`);
  }

  /**
   * Ensure all the property values are set, then remove as required
   */
  private setHumidifierDehumidifierServiceProperties(
    service: Service,
  ) {
    const CurrentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState;
    const TargetHumidifierDehumidifierState = this.platform.Characteristic.TargetHumidifierDehumidifierState;

    const currentStateValues: Set<number> = new Set([
      CurrentHumidifierDehumidifierState.INACTIVE,
      CurrentHumidifierDehumidifierState.IDLE,
      CurrentHumidifierDehumidifierState.HUMIDIFYING,
      CurrentHumidifierDehumidifierState.DEHUMIDIFYING,
    ]);
    const targetStateValues: Set<number> = new Set([
      TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER,
      TargetHumidifierDehumidifierState.HUMIDIFIER,
      TargetHumidifierDehumidifierState.DEHUMIDIFIER,
    ]);

    // HUMIDIFIER: On/off humidifier
    // DEHUMIDIFIER: On/off dehumidifier
    // HUMIDIFIER_OR_DEHUMIDIFIER: Uses threshold values to humidify/dehumidify -> AUTO

    if (this.deviceType === HumidifierType.Humidifier) {
      currentStateValues.delete(CurrentHumidifierDehumidifierState.DEHUMIDIFYING);
      targetStateValues.delete(TargetHumidifierDehumidifierState.DEHUMIDIFIER);

      // Remove this only if we want manual operation only
      // targetStateValues.delete(TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER);

      this.log.debug(`[${this.accessoryName}] Is a Humidifier`);
    }
    else if (this.deviceType === HumidifierType.Dehumidifier) {
      currentStateValues.delete(CurrentHumidifierDehumidifierState.HUMIDIFYING);
      targetStateValues.delete(TargetHumidifierDehumidifierState.HUMIDIFIER);

      // Remove this only if we want manual operation only
      // targetStateValues.delete(TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER);

      this.log.debug(`[${this.accessoryName}] Is a Dehumidifier`);
    }
    else {
      this.log.debug(`[${this.accessoryName}] Is a Humidifier/Dehumidifier`);
    }

    if (currentStateValues.size > 0) {
      this.log.debug(`[${this.accessoryName}] Setting Current State values: ${this.getCurrentStateLabels(currentStateValues)}`);

      service.getCharacteristic(CurrentHumidifierDehumidifierState)
        .setProps({
          validValues: Array.from(currentStateValues),
        });

      this.log.debug(`[${this.accessoryName}] Current State Props: ${JSON.stringify(service.getCharacteristic(CurrentHumidifierDehumidifierState).props)}`);
    }
    if (targetStateValues.size > 0) {
      this.log.debug(`[${this.accessoryName}] Setting Target State values: ${this.getTargetStateLabels(targetStateValues)}`);

      service.getCharacteristic(TargetHumidifierDehumidifierState)
        .setProps({
          validValues: Array.from(targetStateValues),
        });

      this.log.debug(`[${this.accessoryName}] Target State Props: ${JSON.stringify(service.getCharacteristic(TargetHumidifierDehumidifierState).props)}`);
    }
  }

  private getCurrentStateLabels(values: Set<number>): string[] {
    const labels: string[] = [];

    values.forEach(value => {
      labels.push(CurrentHumidifierDehumidifierState.getName(value));
    });

    return labels;
  }

  private getTargetStateLabels(values: Set<number>): string[] {
    const labels: string[] = [];

    values.forEach(value => {
      labels.push(TargetHumidifierDehumidifierState.getName(value));
    });

    return labels;
  }

  // Updatable Sensor interface

  updateMeasurementSensor(value: number, accessoryId: string):void {
    this.log.debug(`[${this.accessoryName}] Request update humidity sensor to ${value}%`);

    if (accessoryId !== this.accessoryId) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number') {
      this.log.error(`[${this.accessoryName}] Value ${value} is not valid for Humidifier/Dehumidifier sensor`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }
    else {
      this.log.debug(`[${this.accessoryName}] Updating humidity sensor to ${value}%`);

      this.CurrentRelativeHumidity = value;
      this.setDeviceOperationalCondition();
    }
  }
}
