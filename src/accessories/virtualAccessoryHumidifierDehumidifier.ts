/* eslint-disable brace-style */
/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { UpdatableMeasurementSensor } from '../sensors/updatableSensor.js';
import { HumidifierType } from '../configuration/schema.js';

/**
 * HumidifierDehumidifier - Accessory implementation
 */
export class HumidifierDehumidifier extends Accessory implements UpdatableMeasurementSensor {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.HumidifierDehumidifier;

  private readonly stateStorageKey: string = 'HumidifierDehumidifierActive';
  private readonly targetStateStorageKey: string = 'HumidifierDehumidifierTargetState';
  private readonly humidifierThresholdStorageKey: string = 'HumidifierThreshold';
  private readonly dehumidifierThresholdStorageKey: string = 'DehumidifierThreshold';

  private deviceType: string;

  private states = {
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    let Active: number = HumidifierDehumidifier.INACTIVE;
    const CurrentHumidifierDehumidifierState: number = HumidifierDehumidifier.CURRENTLY_INACTIVE;
    let TargetHumidifierDehumidifierState: number = HumidifierDehumidifier.AUTOMATIC;
    let RelativeHumidityHumidifierThreshold: number = 30;
    let RelativeHumidityDehumidifierThreshold: number = 60;
    const CurrentRelativeHumidity: number = 50;          // This value comes from sensor, set to 50% for now

    // First configure the device based on the accessory details
    RelativeHumidityHumidifierThreshold = this.accessoryConfiguration.humidifierDehumidifier.humidifierThreshold;
    RelativeHumidityDehumidifierThreshold = this.accessoryConfiguration.humidifierDehumidifier.dehumidifierThreshold;

    this.deviceType = this.accessoryConfiguration.humidifierDehumidifier.type;

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
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedTargetState: number = accessoryState[this.targetStateStorageKey] as number;

      if (cachedState !== undefined) {
        Active = cachedState;
      }
      if (cachedTargetState !== undefined) {
        TargetHumidifierDehumidifierState = cachedTargetState;
      }
      if (this.dehumidifies()) {
        const cachedDehumidifierThreshold: number = accessoryState[this.dehumidifierThresholdStorageKey] as number;
        if (cachedDehumidifierThreshold !== undefined) {
          RelativeHumidityDehumidifierThreshold = cachedDehumidifierThreshold;
        }
      }
      if (this.humidifies()) {
        const cachedHumidifierThreshold: number = accessoryState[this.humidifierThresholdStorageKey] as number;
        if (cachedHumidifierThreshold !== undefined) {
          RelativeHumidityHumidifierThreshold = cachedHumidifierThreshold;
        }
      }
    }

    this.refreshDeviceOperationalCondition();

    this.refreshHumidifierDehumidifierServiceProperties(this.service!);

    // Update the initial state of the accessory
    this.updateActive(Active);
    this.updateCurrentHumidifierDehumidifierState(CurrentHumidifierDehumidifierState);
    this.updateTargetHumidifierDehumidifierState(TargetHumidifierDehumidifierState);
    this.updateCurrentRelativeHumidity(CurrentRelativeHumidity);
    if (this.dehumidifies()) { this.updateRelativeHumidityDehumidifierThreshold(RelativeHumidityDehumidifierThreshold); }
    if (this.humidifies()) { this.updateRelativeHumidityHumidifierThreshold(RelativeHumidityHumidifierThreshold); }

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

    this.refreshDeviceOperationalCondition();
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

    this.refreshDeviceOperationalCondition();

    const CurrentHumidifierDehumidifierState: number = this.getCurrentHumidifierDehumidifierState();
    this.log.info(`[${this.accessoryName}] Setting Current Humidifier Dehumidifier State: ${HumidifierDehumidifier.getCurrentStateName(CurrentHumidifierDehumidifierState)}`);
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

    this.refreshDeviceOperationalCondition();
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

    this.refreshDeviceOperationalCondition();
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getActive(),
      [this.targetStateStorageKey]: this.getTargetHumidifierDehumidifierState(),
    };

    if (this.dehumidifies()) {
      Object.assign(jsonState, { [this.dehumidifierThresholdStorageKey]: this.getRelativeHumidityDehumidifierThreshold() });
    }
    if (this.humidifies()) {
      Object.assign(jsonState, { [this.humidifierThresholdStorageKey]: this.getRelativeHumidityHumidifierThreshold() });
    }

    const json = JSON.stringify(jsonState);
    return json;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return HumidifierDehumidifier.ACCESSORY_SERVICE_TYPE;
  }

  //

  private humidifies(): boolean {
    return [HumidifierType.Auto, HumidifierType.Humidifier].includes(this.deviceType);
  }

  private dehumidifies(): boolean {
    return [HumidifierType.Auto, HumidifierType.Dehumidifier].includes(this.deviceType);
  }

  private refreshDeviceOperationalCondition() {
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
        CurrentHumidifierDehumidifierState = HumidifierDehumidifier.CURRENTLY_HUMIDIFYING;
      }
      else if (TargetHumidifierDehumidifierState === HumidifierDehumidifier.DEHUMIDIFY) {
        CurrentHumidifierDehumidifierState = HumidifierDehumidifier.CURRENTLY_DEHUMIDIFYING;
      }
      else {  // (this.states.HumidifierDehumidifierTargetState === HumidifierDehumidifier.AUTOMATIC)
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
  private refreshHumidifierDehumidifierServiceProperties(
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

      this.refreshDeviceOperationalCondition();
    }
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly CURRENTLY_INACTIVE: number =                CharacteristicType.CurrentHumidifierDehumidifierState.INACTIVE;
  static readonly CURRENTLY_IDLE: number =                    CharacteristicType.CurrentHumidifierDehumidifierState.IDLE;
  static readonly CURRENTLY_HUMIDIFYING: number =             CharacteristicType.CurrentHumidifierDehumidifierState.HUMIDIFYING;
  static readonly CURRENTLY_DEHUMIDIFYING: number =           CharacteristicType.CurrentHumidifierDehumidifierState.DEHUMIDIFYING;

  static readonly AUTOMATIC: number =                         CharacteristicType.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER; 
  static readonly HUMIDIFY: number =                          CharacteristicType.TargetHumidifierDehumidifierState.HUMIDIFIER;
  static readonly DEHUMIDIFY: number =                        CharacteristicType.TargetHumidifierDehumidifierState.DEHUMIDIFIER;

  static readonly INACTIVE: number =                          CharacteristicType.Active.INACTIVE;
  static readonly ACTIVE: number =                            CharacteristicType.Active.ACTIVE;

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
}
