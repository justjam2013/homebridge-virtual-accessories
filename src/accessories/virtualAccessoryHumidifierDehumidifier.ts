/* eslint-disable brace-style */
/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { UpdatableSensor } from '../sensors/updatableSensor.js';

/**
 * HumidifierDehumidifier - Accessory implementation
 */
export class HumidifierDehumidifier extends Accessory implements UpdatableSensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'HumidifierDehumidifier';

  static readonly CURRENTLY_INACTIVE: number = 0;             // Characteristic.CurrentHumidifierDehumidifierState.INACTIVE
  static readonly CURRENTLY_IDLE: number = 1;                 // Characteristic.CurrentHumidifierDehumidifierState.IDLE
  static readonly CURRENTLY_HUMIDIFYING: number = 2;          // Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING
  static readonly CURRENTLY_DEHUMIDIFYING: number = 3;        // Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING

  static readonly AUTOMATIC: number = 0;                      // Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER 
  static readonly HUMIDIFY: number = 1;                       // Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER
  static readonly DEHUMIDIFY: number = 2;                     // Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER

  static readonly INACTIVE: number = 0;                       // Characteristic.Active.INACTIVE
  static readonly ACTIVE: number = 1;                         // Characteristic.Active.ACTIVE

  private readonly stateStorageKey: string = 'HumidifierDehumidifierActive';
  private readonly targetStateStorageKey: string = 'HumidifierDehumidifierTargetState';
  private readonly humidifierThresholdStorageKey: string = 'HumidifierThreshold';
  private readonly dehumidifierThresholdStorageKey: string = 'DehumidifierThreshold';

  private deviceType: string;

  private states = {
    HumidifierDehumidifierActive: HumidifierDehumidifier.INACTIVE,
    HumidifierDehumidifierCurrentState: HumidifierDehumidifier.CURRENTLY_INACTIVE,
    HumidifierDehumidifierTargetState: HumidifierDehumidifier.AUTOMATIC,
    HumidifierThreshold: 30,
    DehumidifierThreshold: 60,
    CurrentRelativeHumidity: 50,          // This value comes from sensor, set to 50% for now
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.states.HumidifierDehumidifierActive = HumidifierDehumidifier.INACTIVE;
    this.states.HumidifierDehumidifierCurrentState = HumidifierDehumidifier.CURRENTLY_INACTIVE;
    this.states.HumidifierThreshold = this.accessoryConfiguration.humidifierDehumidifier.humidifierThreshold;
    this.states.DehumidifierThreshold = this.accessoryConfiguration.humidifierDehumidifier.dehumidifierThreshold;

    this.deviceType = this.accessoryConfiguration.humidifierDehumidifier.type;

    this.states.HumidifierDehumidifierTargetState = HumidifierDehumidifier.AUTOMATIC;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedTargetState: number = accessoryState[this.targetStateStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.HumidifierDehumidifierActive = cachedState;
      }
      if (cachedTargetState !== undefined) {
        this.states.HumidifierDehumidifierTargetState = cachedTargetState;
      }
      if (this.dehumidifies()) {
        const cachedDehumidifierThreshold: number = accessoryState[this.dehumidifierThresholdStorageKey] as number;
        if (cachedDehumidifierThreshold !== undefined) {
          this.states.DehumidifierThreshold = cachedDehumidifierThreshold;
        }
      }
      if (this.humidifies()) {
        const cachedHumidifierThreshold: number = accessoryState[this.humidifierThresholdStorageKey] as number;
        if (cachedHumidifierThreshold !== undefined) {
          this.states.HumidifierThreshold = cachedHumidifierThreshold;
        }
      }
    }

    this.setDeviceOperationalCondition();

    // get the HumidifierDehumidifier service if it exists, otherwise create a new LightBulb service
    this.service = this.accessory.getService(this.platform.Service.HumidifierDehumidifier) || this.accessory.addService(this.platform.Service.HumidifierDehumidifier);
    // These characteristics will be added back as needed
    this.service.removeCharacteristic(this.service.getCharacteristic(this.platform.Characteristic.RelativeHumidityDehumidifierThreshold));
    this.service.removeCharacteristic(this.service.getCharacteristic(this.platform.Characteristic.RelativeHumidityHumidifierThreshold));

    this.setHumidifierDehumidifierServiceProperties(this.service!);

    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Humidifier/Dehumidifier Current State: ${HumidifierDehumidifier.getCurrentStateName(this.states.HumidifierDehumidifierCurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState, (this.states.HumidifierDehumidifierCurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState, (this.states.HumidifierDehumidifierTargetState));

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
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Characteristics: ${characteristics.join(', ')}`);
  }

  // Handlers

  async setActive(value: CharacteristicValue) {
    this.states.HumidifierDehumidifierActive = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Active: ${HumidifierDehumidifier.getActiveName(this.states.HumidifierDehumidifierActive)}`);
  }

  async getActive(): Promise<CharacteristicValue> {
    const humidifierDehumidifierActive = this.states.HumidifierDehumidifierActive;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Active: ${HumidifierDehumidifier.getActiveName(humidifierDehumidifierActive)}`);

    return humidifierDehumidifierActive;
  }

  async getCurrentHumidifierDehumidifierState(): Promise<CharacteristicValue> {
    const humidifierDehumidifierCurrentState = this.states.HumidifierDehumidifierCurrentState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Humidifier Dehumidifier State: ${HumidifierDehumidifier.getCurrentStateName(humidifierDehumidifierCurrentState)}`);

    return humidifierDehumidifierCurrentState;
  }

  async setTargetHumidifierDehumidifierState(value: CharacteristicValue) {
    this.states.HumidifierDehumidifierTargetState = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Humidifier Dehumidifier State: ${HumidifierDehumidifier.getTargetStateName(this.states.HumidifierDehumidifierTargetState)}`);

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Humidifier Dehumidifier State: ${HumidifierDehumidifier.getCurrentStateName(this.states.HumidifierDehumidifierCurrentState)}`);
  }

  async getTargetHumidifierDehumidifierState(): Promise<CharacteristicValue> {
    const humidifierDehumidifierTargetState = this.states.HumidifierDehumidifierTargetState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target Humidifier Dehumidifier State: ${HumidifierDehumidifier.getTargetStateName(humidifierDehumidifierTargetState)}`);

    return humidifierDehumidifierTargetState;
  }

  async getCurrentRelativeHumidity(): Promise<CharacteristicValue> {
    const currentRelativeHumidity = this.states.CurrentRelativeHumidity;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Relative Humidity: ${currentRelativeHumidity}%`);

    return currentRelativeHumidity;
  }

  async setRelativeHumidityDehumidifierThreshold(value: CharacteristicValue) {
    this.states.DehumidifierThreshold = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Relative Humidity Dehumidifier Threshold: ${this.states.DehumidifierThreshold}%`);
  }

  async getRelativeHumidityDehumidifierThreshold(): Promise<CharacteristicValue>  {
    const dehumidifierThreshold = this.states.DehumidifierThreshold;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Relative Humidity Dehumidifier Threshold: ${dehumidifierThreshold}%`);

    return dehumidifierThreshold;
  }

  async setRelativeHumidityHumidifierThreshold(value: CharacteristicValue) {
    this.states.HumidifierThreshold = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Relative Humidity Humidifier Threshold: ${this.states.HumidifierThreshold}%`);
  }

  async getRelativeHumidityHumidifierThreshold(): Promise<CharacteristicValue> {
    const humidifierThreshold = this.states.HumidifierThreshold;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Relative Humidity Humidifier Threshold: ${humidifierThreshold}%`);

    return humidifierThreshold;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.HumidifierDehumidifierActive,
      [this.targetStateStorageKey]: this.states.HumidifierDehumidifierTargetState,
      [this.dehumidifierThresholdStorageKey]: this.states.DehumidifierThreshold,
      [this.humidifierThresholdStorageKey]: this.states.HumidifierThreshold,
    });
    return json;
  }

  protected getAccessoryTypeName(): string {
    return HumidifierDehumidifier.ACCESSORY_TYPE_NAME;
  }

  private isHumidifier(): boolean {
    return this.deviceType === 'humidifier';
  }

  private isDehumidifier(): boolean {
    return this.deviceType === 'dehumidifier';
  }

  private humidifies(): boolean {
    return this.deviceType === 'auto' || this.deviceType === 'humidifier';
  }

  private dehumidifies(): boolean {
    return this.deviceType === 'auto' || this.deviceType === 'dehumidifier';
  }

  private setDeviceOperationalCondition() {
    if (this.states.HumidifierDehumidifierActive === HumidifierDehumidifier.INACTIVE) {
      this.states.HumidifierDehumidifierCurrentState = HumidifierDehumidifier.CURRENTLY_INACTIVE;
    }
    else {  // (this.states.HumidifierDehumidifierActive === HumidifierDehumidifier.ACTIVE)
      if (this.states.HumidifierDehumidifierTargetState === HumidifierDehumidifier.HUMIDIFY) {
        this.states.HumidifierDehumidifierCurrentState = HumidifierDehumidifier.CURRENTLY_HUMIDIFYING;
      }
      else if (this.states.HumidifierDehumidifierTargetState === HumidifierDehumidifier.DEHUMIDIFY) {
        this.states.HumidifierDehumidifierCurrentState = HumidifierDehumidifier.CURRENTLY_DEHUMIDIFYING;
      }
      else {  // (this.states.HumidifierDehumidifierTargetState === HumidifierDehumidifier.AUTOMATIC)
        if (this.states.CurrentRelativeHumidity < this.states.HumidifierThreshold) {
          if (this.humidifies()) {
            this.states.HumidifierDehumidifierCurrentState = HumidifierDehumidifier.CURRENTLY_HUMIDIFYING;
          }
        }
        else if (this.states.CurrentRelativeHumidity > this.states.DehumidifierThreshold) {
          if (this.dehumidifies()) {
            this.states.HumidifierDehumidifierCurrentState = HumidifierDehumidifier.CURRENTLY_DEHUMIDIFYING;
          }
        }
        else {
          this.states.HumidifierDehumidifierCurrentState = HumidifierDehumidifier.CURRENTLY_IDLE;
        }
      }
    }

    this.service?.setCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState, (this.states.HumidifierDehumidifierCurrentState));

    this.storeState();

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Humidifier/Dehumidifier current state: ${HumidifierDehumidifier.getCurrentStateName(this.states.HumidifierDehumidifierCurrentState)}`);
  }

  static getActiveName(status: number): string {
    let activeName: string;

    switch (status) {
    case undefined: { activeName = 'undefined'; break; }
    case HumidifierDehumidifier.INACTIVE: { activeName = 'INACTIVE'; break; }
    case HumidifierDehumidifier.ACTIVE: { activeName = 'ACTIVE'; break; }
    default: { activeName = status.toString(); }
    }

    return activeName;
  }

  static getCurrentStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case HumidifierDehumidifier.CURRENTLY_INACTIVE: { stateName = 'INACTIVE'; break; }
    case HumidifierDehumidifier.CURRENTLY_IDLE: { stateName = 'IDLE'; break; }
    case HumidifierDehumidifier.CURRENTLY_HUMIDIFYING: { stateName = 'HUMIDIFYING'; break; }
    case HumidifierDehumidifier.CURRENTLY_DEHUMIDIFYING: { stateName = 'DEHUMIDIFYING'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }

  static getTargetStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case HumidifierDehumidifier.AUTOMATIC: { stateName = 'AUTO'; break; }
    case HumidifierDehumidifier.HUMIDIFY: { stateName = 'HUMIDIFY'; break; }
    case HumidifierDehumidifier.DEHUMIDIFY: { stateName = 'DEHUMIDIFY'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
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

    if (this.isHumidifier()) {
      currentStateValues.delete(CurrentHumidifierDehumidifierState.DEHUMIDIFYING);
      targetStateValues.delete(TargetHumidifierDehumidifierState.DEHUMIDIFIER);

      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Is a Humidifier`);
    }
    else if (this.isDehumidifier()) {
      currentStateValues.delete(CurrentHumidifierDehumidifierState.HUMIDIFYING);
      targetStateValues.delete(TargetHumidifierDehumidifierState.HUMIDIFIER);

      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Is a Dehumidifier`);
    }
    else {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Is a Humidifier/Dehumidifier`);
    }

    if (currentStateValues.size > 0) {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Current State values: ${this.getCurrentStateLabels(currentStateValues)}`);

      service.getCharacteristic(CurrentHumidifierDehumidifierState)
        .setProps({
          validValues: Array.from(currentStateValues),
        });

      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Current State Props: ${JSON.stringify(service.getCharacteristic(CurrentHumidifierDehumidifierState).props)}`);
    }
    if (targetStateValues.size > 0) {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Target State values: ${this.getTargetStateLabels(targetStateValues)}`);

      service.getCharacteristic(TargetHumidifierDehumidifierState)
        .setProps({
          validValues: Array.from(targetStateValues),
        });

      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Target State Props: ${JSON.stringify(service.getCharacteristic(TargetHumidifierDehumidifierState).props)}`);
    }
  }

  private getCurrentStateLabels(values: Set<number>): string[] {
    const labels: string[] = [];

    values.forEach(value => {
      labels.push(HumidifierDehumidifier.getCurrentStateName(value));
    });

    return labels;
  }

  private getTargetStateLabels(values: Set<number>): string[] {
    const labels: string[] = [];

    values.forEach(value => {
      labels.push(HumidifierDehumidifier.getTargetStateName(value));
    });

    return labels;
  }

  // Updatable Sensor interface

  updateSensor(value: number, accessoryId: string):void {
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Request update humidity sensor to ${value}%`);

    if (accessoryId !== this.accessoryConfiguration.accessoryID) {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number') {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Value ${value} is not valid for Humidifier/Dehumidifier sensor`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }
    else {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Updating humidity sensor to ${value}%`);

      this.states.CurrentRelativeHumidity = value;
      this.setDeviceOperationalCondition();
    }
  }
}
