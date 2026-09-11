/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { UpdatableMeasurementSensor } from '../sensors/updatableSensor.js';
import { HumidifierType } from '../configuration/schema.js';

abstract class StorageKeys {
  
  static Active: string = 'HumidifierDehumidifierActive';
  static CurrentRelativeHumidity: string = 'CurrentRelativeHumidity';
  static TargetHumidifierDehumidifierState: string = 'HumidifierDehumidifierTargetState';
  static RelativeHumidityDehumidifierThreshold: string = 'DehumidifierThreshold';
  static RelativeHumidityHumidifierThreshold: string = 'HumidifierThreshold';
  static RotationSpeed: string = 'FanRotationSpeed';
}

/**
 * HumidifierDehumidifier - Accessory implementation
 */
export class HumidifierDehumidifier extends Accessory implements UpdatableMeasurementSensor {

  private deviceType: string;

  private hasFan: boolean;

  private states = {
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.HumidifierDehumidifier);

    let Active: number = HumidifierDehumidifier.INACTIVE;
    const CurrentHumidifierDehumidifierState: number = HumidifierDehumidifier.CURRENTLY_INACTIVE;
    let TargetHumidifierDehumidifierState: number = HumidifierDehumidifier.AUTOMATIC;
    let RelativeHumidityHumidifierThreshold: number = 30;
    let RelativeHumidityDehumidifierThreshold: number = 60;
    let CurrentRelativeHumidity: number = 50;          // This value comes from sensor, set to 50% for now
    let RotationSpeed: number = 0;

    // First configure the device based on the accessory details
    RelativeHumidityHumidifierThreshold = this.accessoryConfiguration.humidifierDehumidifier.humidifierThreshold;
    RelativeHumidityDehumidifierThreshold = this.accessoryConfiguration.humidifierDehumidifier.dehumidifierThreshold;

    this.deviceType = this.accessoryConfiguration.humidifierDehumidifier.type;
    this.hasFan = this.accessoryConfiguration.humidifierDehumidifier.hasFan;

    if (this.deviceType === HumidifierType.Humidifier) {
      TargetHumidifierDehumidifierState = HumidifierDehumidifier.HUMIDIFY;
    }
    else if (this.deviceType === HumidifierType.Dehumidifier) {
      TargetHumidifierDehumidifierState = HumidifierDehumidifier.DEHUMIDIFY;
    }
    else {
      TargetHumidifierDehumidifierState = HumidifierDehumidifier.AUTOMATIC;
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[StorageKeys.Active] as number;
      const cachedCurrentRelativeHumidity: number = accessoryState[StorageKeys.CurrentRelativeHumidity] as number;
      const cachedTargetHumidifierDehumidifierState: number = accessoryState[StorageKeys.TargetHumidifierDehumidifierState] as number;
      const cachedRelativeHumidityHumidifierThreshold: number = accessoryState[StorageKeys.RelativeHumidityHumidifierThreshold] as number;
      const cachedRelativeHumidityDehumidifierThreshold: number = accessoryState[StorageKeys.RelativeHumidityDehumidifierThreshold] as number;
      const cachedRotationSpeed: number = accessoryState[StorageKeys.RotationSpeed] as number;

      if (cachedState !== undefined) {
        Active = cachedState;
      }
      if (cachedCurrentRelativeHumidity !== undefined) {
        CurrentRelativeHumidity = cachedCurrentRelativeHumidity;
      }
      if (cachedTargetHumidifierDehumidifierState !== undefined) {
        TargetHumidifierDehumidifierState = cachedTargetHumidifierDehumidifierState;
      }
      if (cachedRelativeHumidityDehumidifierThreshold !== undefined) {
        RelativeHumidityDehumidifierThreshold = cachedRelativeHumidityDehumidifierThreshold;
      }
      if (cachedRelativeHumidityHumidifierThreshold !== undefined) {
        RelativeHumidityHumidifierThreshold = cachedRelativeHumidityHumidifierThreshold;
      }
      if (cachedRotationSpeed !== undefined) {
        RotationSpeed = cachedRotationSpeed;
      }
    }

    this.updateServiceProperties(this.service!);

    // Update the initial state of the accessory
    this.updateActive(Active);
    this.updateCurrentHumidifierDehumidifierState(CurrentHumidifierDehumidifierState);
    this.updateTargetHumidifierDehumidifierState(TargetHumidifierDehumidifierState);
    this.updateCurrentRelativeHumidity(CurrentRelativeHumidity);
    if (this.dehumidifies()) { this.updateRelativeHumidityDehumidifierThreshold(RelativeHumidityDehumidifierThreshold); }
    if (this.humidifies()) { this.updateRelativeHumidityHumidifierThreshold(RelativeHumidityHumidifierThreshold); }
    if (this.hasFan) { this.setRotationSpeed(RotationSpeed); }

    this.updateAccessoryOperationalCondition();

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.Active)
      .onSet(this.setActiveHandler.bind(this))
      .onGet(this.getActiveHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.CurrentHumidifierDehumidifierState)
      .onGet(this.getCurrentHumidifierDehumidifierStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.TargetHumidifierDehumidifierState)
      .onSet(this.setTargetHumidifierDehumidifierStateHandler.bind(this))
      .onGet(this.getTargetHumidifierDehumidifierStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.CurrentRelativeHumidity)
      .onGet(this.getCurrentRelativeHumidityHandler.bind(this));

    if (this.dehumidifies()) {
      // Characteristic was removed when adding the Service
      this.service.getCharacteristic(CharacteristicType.RelativeHumidityDehumidifierThreshold)
        .onSet(this.setRelativeHumidityDehumidifierThresholdHandler.bind(this))
        .onGet(this.getRelativeHumidityDehumidifierThresholdHandler.bind(this));
    }
    else {
      this.removeCharacteristic(this.service.getCharacteristic(CharacteristicType.RelativeHumidityDehumidifierThreshold));
    }

    if (this.humidifies()) {
      // Characteristic was removed when adding the Service
      this.service.getCharacteristic(CharacteristicType.RelativeHumidityHumidifierThreshold)
        .onSet(this.setRelativeHumidityHumidifierThresholdHandler.bind(this))
        .onGet(this.getRelativeHumidityHumidifierThresholdHandler.bind(this));
    }
    else {
      this.removeCharacteristic(this.service.getCharacteristic(CharacteristicType.RelativeHumidityHumidifierThreshold));
    }

    if (this.hasFan) {
      this.service.getCharacteristic(CharacteristicType.RotationSpeed)
        .onSet(this.setRotationSpeedHandler.bind(this))
        .onGet(this.getRotationSpeedHandler.bind(this));
    }

    const characteristics: string[] = this.service.characteristics.map(characteristic => characteristic.displayName);
    this.log.debug(`[${this.accessoryName}] Characteristics: ${characteristics.join(', ')}`);
  }

  //
  // ****************************** Handlers ******************************
  //

  // Active

  async getActiveHandler(): Promise<CharacteristicValue> {
    const Active: number = this.getActive();
    this.log.debug(`[${this.accessoryName}] Getting Active: ${HumidifierDehumidifier.getActiveName(Active)}`);

    return Active;
  }

  async setActiveHandler(value: CharacteristicValue) {
    let Active: number = value as number;
    Active = this.updateActive(Active);
    this.log.info(`[${this.accessoryName}] Setting Active: ${HumidifierDehumidifier.getActiveName(Active)}`);

    this.updateAccessoryOperationalCondition();
  }

  // CurrentHumidifierDehumidifierState

  async getCurrentHumidifierDehumidifierStateHandler(): Promise<CharacteristicValue> {
    const CurrentHumidifierDehumidifierState: number = this.getCurrentHumidifierDehumidifierState();
    this.log.debug(`[${this.accessoryName}] Getting Current Humidifier Dehumidifier State: ${HumidifierDehumidifier.getCurrentStateName(CurrentHumidifierDehumidifierState)}`);

    return CurrentHumidifierDehumidifierState;
  }

  // TargetHumidifierDehumidifierState

  async getTargetHumidifierDehumidifierStateHandler(): Promise<CharacteristicValue> {
    const TargetHumidifierDehumidifierState: number = this.getTargetHumidifierDehumidifierState();
    this.log.debug(`[${this.accessoryName}] Getting Target Humidifier Dehumidifier State: ${HumidifierDehumidifier.getTargetStateName(TargetHumidifierDehumidifierState)}`);

    return TargetHumidifierDehumidifierState;
  }

  async setTargetHumidifierDehumidifierStateHandler(value: CharacteristicValue) {
    let TargetHumidifierDehumidifierState: number = value as number;
    TargetHumidifierDehumidifierState = this.updateTargetHumidifierDehumidifierState(TargetHumidifierDehumidifierState);
    this.log.info(`[${this.accessoryName}] Setting Target Humidifier Dehumidifier State: ${HumidifierDehumidifier.getTargetStateName(TargetHumidifierDehumidifierState)}`);

    this.updateAccessoryOperationalCondition();
  }

  // CurrentRelativeHumidity

  async getCurrentRelativeHumidityHandler(): Promise<CharacteristicValue> {
    const CurrentRelativeHumidity: number = this.getCurrentRelativeHumidity();
    this.log.debug(`[${this.accessoryName}] Getting Current Relative Humidity: ${CurrentRelativeHumidity}%`);

    return CurrentRelativeHumidity;
  }

  // RelativeHumidityDehumidifierThreshold

  async getRelativeHumidityDehumidifierThresholdHandler(): Promise<CharacteristicValue>  {
    const RelativeHumidityDehumidifierThreshold = this.getRelativeHumidityDehumidifierThreshold();
    this.log.debug(`[${this.accessoryName}] Getting Relative Humidity Dehumidifier Threshold: ${RelativeHumidityDehumidifierThreshold}%`);

    return RelativeHumidityDehumidifierThreshold;
  }

  async setRelativeHumidityDehumidifierThresholdHandler(value: CharacteristicValue) {
    let RelativeHumidityDehumidifierThreshold: number = value as number;
    RelativeHumidityDehumidifierThreshold = this.updateRelativeHumidityDehumidifierThreshold(RelativeHumidityDehumidifierThreshold);
    this.log.info(`[${this.accessoryName}] Setting Relative Humidity Dehumidifier Threshold: ${RelativeHumidityDehumidifierThreshold}%`);

    this.updateAccessoryOperationalCondition();
  }

  // RelativeHumidityHumidifierThreshold

  async getRelativeHumidityHumidifierThresholdHandler(): Promise<CharacteristicValue> {
    const RelativeHumidityHumidifierThreshold: number = this.getRelativeHumidityHumidifierThreshold();
    this.log.debug(`[${this.accessoryName}] Getting Relative Humidity Humidifier Threshold: ${RelativeHumidityHumidifierThreshold}%`);

    return RelativeHumidityHumidifierThreshold;
  }

  async setRelativeHumidityHumidifierThresholdHandler(value: CharacteristicValue) {
    let RelativeHumidityHumidifierThreshold: number = value as number;
    RelativeHumidityHumidifierThreshold = this.updateRelativeHumidityHumidifierThreshold(RelativeHumidityHumidifierThreshold);
    this.log.info(`[${this.accessoryName}] Setting Relative Humidity Humidifier Threshold: ${RelativeHumidityHumidifierThreshold}%`);

    this.updateAccessoryOperationalCondition();
  }

  // RotationSpeed

  async getRotationSpeedHandler(): Promise<CharacteristicValue> {
    const RotationSpeed: number = this.getRotationSpeed();
    this.log.debug(`[${this.accessoryName}] Getting Rotation Speed: ${RotationSpeed}%`);

    return RotationSpeed;
  }

  async setRotationSpeedHandler(value: CharacteristicValue) {
    let RotationSpeed: number = value as number;
    RotationSpeed = this.updateRotationSpeed(RotationSpeed);
    this.log.info(`[${this.accessoryName}] Setting Rotation Speed: ${RotationSpeed}%`);

    this.saveState();
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [StorageKeys.Active]: this.getActive(),
      [StorageKeys.CurrentRelativeHumidity]: this.getCurrentRelativeHumidity(),
      [StorageKeys.TargetHumidifierDehumidifierState]: this.getTargetHumidifierDehumidifierState(),
    };

    if (this.dehumidifies()) {
      Object.assign(jsonState, { [StorageKeys.RelativeHumidityDehumidifierThreshold]: this.getRelativeHumidityDehumidifierThreshold() });
    }
    if (this.humidifies()) {
      Object.assign(jsonState, { [StorageKeys.RelativeHumidityHumidifierThreshold]: this.getRelativeHumidityHumidifierThreshold() });
    }

    if (this.hasFan) {
      Object.assign(jsonState, { [StorageKeys.RotationSpeed]: this.getRotationSpeed() });
    }

    const json = JSON.stringify(jsonState);
    return json;
  }

  //

  private humidifies(): boolean {
    return [HumidifierType.Auto, HumidifierType.Humidifier].includes(this.deviceType);
  }

  private dehumidifies(): boolean {
    return [HumidifierType.Auto, HumidifierType.Dehumidifier].includes(this.deviceType);
  }

  private updateAccessoryOperationalCondition() {
    const Active: number = this.getActive();
    const TargetHumidifierDehumidifierState: number = this.getTargetHumidifierDehumidifierState();
    const CurrentRelativeHumidity: number = this.getCurrentRelativeHumidity();
    const RelativeHumidityHumidifierThreshold: number = this.getRelativeHumidityHumidifierThreshold();
    const RelativeHumidityDehumidifierThreshold: number = this.getRelativeHumidityDehumidifierThreshold();
    let CurrentHumidifierDehumidifierState: number = this.getCurrentHumidifierDehumidifierState();

    if (Active === HumidifierDehumidifier.INACTIVE) {
      CurrentHumidifierDehumidifierState = HumidifierDehumidifier.CURRENTLY_INACTIVE;
    }
    else {  // (Active === HumidifierDehumidifier.ACTIVE)
      if (TargetHumidifierDehumidifierState === HumidifierDehumidifier.HUMIDIFY) {
        if (CurrentRelativeHumidity < RelativeHumidityHumidifierThreshold) {
          CurrentHumidifierDehumidifierState = HumidifierDehumidifier.CURRENTLY_HUMIDIFYING;
        }
        else {  // (CurrentRelativeHumidity >= RelativeHumidityHumidifierThreshold)
          CurrentHumidifierDehumidifierState = HumidifierDehumidifier.CURRENTLY_IDLE;
        }
      }
      else if (TargetHumidifierDehumidifierState === HumidifierDehumidifier.DEHUMIDIFY) {
        if (CurrentRelativeHumidity > RelativeHumidityDehumidifierThreshold) {
          CurrentHumidifierDehumidifierState = HumidifierDehumidifier.CURRENTLY_DEHUMIDIFYING;
        }
        else {  // (CurrentRelativeHumidity <= RelativeHumidityDehumidifierThreshold)
          CurrentHumidifierDehumidifierState = HumidifierDehumidifier.CURRENTLY_IDLE;
        }
      }
      else {  // (TargetHumidifierDehumidifierState === HumidifierDehumidifier.AUTOMATIC)
        if (CurrentRelativeHumidity < RelativeHumidityHumidifierThreshold) {
          if (this.humidifies()) {
            CurrentHumidifierDehumidifierState = HumidifierDehumidifier.CURRENTLY_HUMIDIFYING;
          }
        }
        else if (CurrentRelativeHumidity > RelativeHumidityDehumidifierThreshold) {
          if (this.dehumidifies()) {
            CurrentHumidifierDehumidifierState = HumidifierDehumidifier.CURRENTLY_DEHUMIDIFYING;
          }
        }
        else {
          CurrentHumidifierDehumidifierState = HumidifierDehumidifier.CURRENTLY_IDLE;
        }
      }
    }

    CurrentHumidifierDehumidifierState = this.updateCurrentHumidifierDehumidifierState(CurrentHumidifierDehumidifierState);
    this.log.debug(`[${this.accessoryName}] Humidifier/Dehumidifier current state: ${HumidifierDehumidifier.getCurrentStateName(CurrentHumidifierDehumidifierState)}`);

    this.saveState();
  }

  /**
   * Ensure all the property values are set, then remove as required
   */
  private updateServiceProperties(
    service: Service,
  ) {
    const CurrentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState;
    const TargetHumidifierDehumidifierState = this.platform.Characteristic.TargetHumidifierDehumidifierState;

    const currentStateValues: Set<number> = new Set([
      CurrentHumidifierDehumidifierState.INACTIVE,
      CurrentHumidifierDehumidifierState.IDLE,
    ]);
    const targetStateValues: Set<number> = new Set([
    ]);

    if (this.humidifies()) {
      currentStateValues.add(CurrentHumidifierDehumidifierState.HUMIDIFYING);
      targetStateValues.add(TargetHumidifierDehumidifierState.HUMIDIFIER);

      this.log.debug(`[${this.accessoryName}] Adding humidifying properties`);
    }

    if (this.dehumidifies()) {
      currentStateValues.add(CurrentHumidifierDehumidifierState.DEHUMIDIFYING);
      targetStateValues.add(TargetHumidifierDehumidifierState.DEHUMIDIFIER);

      this.log.debug(`[${this.accessoryName}] Adding dehumidifying properties`);
    }

    if (this.humidifies() && this.dehumidifies()) {
      targetStateValues.add(TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER);

      this.log.debug(`[${this.accessoryName}] Adding auto property`);
    }

    // Set Current State values
    this.log.debug(`[${this.accessoryName}] Setting Current State values: ${this.getCurrentStateLabels(currentStateValues)}`);

    service.getCharacteristic(CurrentHumidifierDehumidifierState)
      .setProps({
        validValues: Array.from(currentStateValues),
      });

    this.log.debug(`[${this.accessoryName}] Current State Props: ${JSON.stringify(service.getCharacteristic(CurrentHumidifierDehumidifierState).props)}`);

    // Set Target State values
    this.log.debug(`[${this.accessoryName}] Setting Target State values: ${this.getTargetStateLabels(targetStateValues)}`);

    service.getCharacteristic(TargetHumidifierDehumidifierState)
      .setProps({
        validValues: Array.from(targetStateValues),
      });

    this.log.debug(`[${this.accessoryName}] Target State Props: ${JSON.stringify(service.getCharacteristic(TargetHumidifierDehumidifierState).props)}`);
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

  updateMeasurementSensor(value: number, accessoryId: string):void {
    this.log.debug(`[${this.accessoryName}] Request update humidity sensor to ${value}%`);

    if (accessoryId !== this.accessoryConfiguration.accessoryID) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number') {
      this.log.error(`[${this.accessoryName}] Value ${value} is not valid for Humidifier/Dehumidifier sensor`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }
    else {
      this.log.debug(`[${this.accessoryName}] Updating humidity sensor to ${value}%`);

      let CurrentRelativeHumidity: number = value;
      CurrentRelativeHumidity = this.updateCurrentRelativeHumidity(CurrentRelativeHumidity);
      this.log.info(`[${this.accessoryName}] Setting Current Relative Humidity: ${CurrentRelativeHumidity}%`);

      this.updateAccessoryOperationalCondition();
    }
  }

  //
  // ****************************** Characteristics ******************************
  //

  // Lazy static getters

  static get CURRENTLY_INACTIVE(): number       { return CharacteristicType.CurrentHumidifierDehumidifierState.INACTIVE; }
  static get CURRENTLY_IDLE(): number           { return CharacteristicType.CurrentHumidifierDehumidifierState.IDLE; }
  static get CURRENTLY_HUMIDIFYING(): number    { return CharacteristicType.CurrentHumidifierDehumidifierState.HUMIDIFYING; }
  static get CURRENTLY_DEHUMIDIFYING(): number  { return CharacteristicType.CurrentHumidifierDehumidifierState.DEHUMIDIFYING; }

  static get AUTOMATIC(): number                { return CharacteristicType.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER; } 
  static get HUMIDIFY(): number                 { return CharacteristicType.TargetHumidifierDehumidifierState.HUMIDIFIER; }
  static get DEHUMIDIFY(): number               { return CharacteristicType.TargetHumidifierDehumidifierState.DEHUMIDIFIER; }

  static get INACTIVE(): number                 { return CharacteristicType.Active.INACTIVE; }
  static get ACTIVE(): number                   { return CharacteristicType.Active.ACTIVE; }

  static getActiveName(status: number): string {
    let name: string;

    switch (status) {
    case undefined: { name = 'undefined'; break; }
    case HumidifierDehumidifier.INACTIVE: { name = 'INACTIVE'; break; }
    case HumidifierDehumidifier.ACTIVE: { name = 'ACTIVE'; break; }
    default: { name = status.toString(); }
    }

    return name;
  }

  static getCurrentStateName(state: number): string { 
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case HumidifierDehumidifier.CURRENTLY_INACTIVE: { name = 'INACTIVE'; break; }
    case HumidifierDehumidifier.CURRENTLY_IDLE: { name = 'IDLE'; break; }
    case HumidifierDehumidifier.CURRENTLY_HUMIDIFYING: { name = 'HUMIDIFYING'; break; }
    case HumidifierDehumidifier.CURRENTLY_DEHUMIDIFYING: { name = 'DEHUMIDIFYING'; break; }
    default: { name = state.toString(); }
    }

    return name;
  }

  static getTargetStateName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case HumidifierDehumidifier.AUTOMATIC: { name = 'AUTO'; break; }
    case HumidifierDehumidifier.HUMIDIFY: { name = 'HUMIDIFY'; break; }
    case HumidifierDehumidifier.DEHUMIDIFY: { name = 'DEHUMIDIFY'; break; }
    default: { name = state.toString(); }
    }

    return name;
  }
}
