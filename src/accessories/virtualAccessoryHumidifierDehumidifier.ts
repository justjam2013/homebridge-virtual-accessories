/* eslint-disable brace-style */
/* eslint-disable max-len */
import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

/**
 * HumidifierDehumidifier - Accessory implementation
 */
export class HumidifierDehumidifier extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'HumidifierDehumidifier';

  //static readonly INACTIVE: number = 0;     // Characteristic.CurrentHumidifierDehumidifierState.INACTIVE
  static readonly IDLE: number = 1;           // Characteristic.CurrentHumidifierDehumidifierState.IDLE
  static readonly HUMIDIFYING: number = 2;    // Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING
  static readonly DEHUMIDIFYING: number = 3;  // Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING

  static readonly AUTO: number = 0;                        // Characteristic.TargetHumidifierDehumidifierState.AUTO 
  static readonly HUMIDIFIER_OR_DEHUMIDIFIER: number = 0;  // Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER
  static readonly HUMIDIFIER: number = 1;                  // Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER
  static readonly DEHUMIDIFIER: number = 2;                // Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER

  static readonly INACTIVE: number = 0;  // Characteristic.Active.INACTIVE
  static readonly ACTIVE: number = 1;    // Characteristic.Active.ACTIVE

  private readonly stateStorageKey: string = 'HumidifierDehumidifierActive';
  private readonly targetStateStorageKey: string = 'HumidifierDehumidifierTargetState';
  private readonly humidifierThresholdStorageKey: string = 'HumidifierThreshold';
  private readonly dehumidifierThresholdStorageKey: string = 'DehumidifierThreshold';

  private deviceType: string;

  private states = {
    HumidifierDehumidifierActive: HumidifierDehumidifier.INACTIVE,
    HumidifierDehumidifierCurrentState: HumidifierDehumidifier.INACTIVE,
    HumidifierDehumidifierTargetState: HumidifierDehumidifier.AUTO,
    HumidifierThreshold: 30,
    DehumidifierThreshold: 60,
    CurrentRelativeHumidity: 50,          // This value comes from sensor, set to 50% for now
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.states.HumidifierDehumidifierActive = HumidifierDehumidifier.INACTIVE;
    this.states.HumidifierDehumidifierCurrentState = HumidifierDehumidifier.INACTIVE;
    this.states.HumidifierThreshold = this.accessoryConfiguration.humidifierDehumidifier.humidifierThreshold;
    this.states.DehumidifierThreshold = this.accessoryConfiguration.humidifierDehumidifier.dehumidifierThreshold;

    this.deviceType = this.accessoryConfiguration.humidifierDehumidifier.type;

    if (this.isHumidifierOnly()) {
      this.states.HumidifierDehumidifierTargetState = HumidifierDehumidifier.HUMIDIFIER;
    }
    else if (this.isDehumidifierOnly()) {
      this.states.HumidifierDehumidifierTargetState = HumidifierDehumidifier.DEHUMIDIFIER;
    }
    else {
      this.states.HumidifierDehumidifierTargetState = HumidifierDehumidifier.AUTO;
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedTargetState: number = accessoryState[this.targetStateStorageKey] as number;
      const cachedHumidifierThreshold: number = accessoryState[this.humidifierThresholdStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.HumidifierDehumidifierActive = cachedState;
      }
      if (cachedTargetState !== undefined) {
        this.states.HumidifierDehumidifierTargetState = cachedTargetState;
      }
      if (this.deviceDehumidifies()) {
        const cachedDehumidifierThreshold: number = accessoryState[this.dehumidifierThresholdStorageKey] as number;
        if (cachedDehumidifierThreshold !== undefined) {
          this.states.DehumidifierThreshold = cachedDehumidifierThreshold;
        }
      }
      if (this.deviceHumidifies()) {
        if (cachedHumidifierThreshold !== undefined) {
          this.states.HumidifierThreshold = cachedHumidifierThreshold;
        }
      }
    }

    this.setDeviceOperationalCondition();

    // get the HumidifierDehumidifier service if it exists, otherwise create a new LightBulb service
    this.service = this.accessory.getService(this.platform.Service.HumidifierDehumidifier) || this.accessory.addService(this.platform.Service.HumidifierDehumidifier);

    this.setHumidifierDehumidifierServiceProperties(this.service!);

    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Humidifier/Dehumidifier Current State: ${HumidifierDehumidifier.getCurrentStateName(this.states.HumidifierDehumidifierCurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState, (this.states.HumidifierDehumidifierCurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState, (this.states.HumidifierDehumidifierTargetState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.handleActiveSet.bind(this))
      .onGet(this.handleActiveGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState)
      .onGet(this.handleCurrentHumidifierDehumidifierStateGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState)
      .onSet(this.handleTargetHumidifierDehumidifierStateSet.bind(this))
      .onGet(this.handleTargetHumidifierDehumidifierStateGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.handleCurrentRelativeHumidityGet.bind(this));

    if (this.deviceDehumidifies()) {
      this.service.getCharacteristic(this.platform.Characteristic.RelativeHumidityDehumidifierThreshold)
        .onSet(this.handleRelativeHumidityDehumidifierThresholdSet.bind(this))
        .onGet(this.handleRelativeHumidityDehumidifierThresholdGet.bind(this));
    }

    if (this.deviceHumidifies()) {
      this.service.getCharacteristic(this.platform.Characteristic.RelativeHumidityHumidifierThreshold)
        .onSet(this.handleRelativeHumidityHumidifierThresholdSet.bind(this))
        .onGet(this.handleRelativeHumidityHumidifierThresholdGet.bind(this));
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   */
  async handleActiveSet(value: CharacteristicValue) {
    this.states.HumidifierDehumidifierActive = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Active: ${HumidifierDehumidifier.getActiveName(this.states.HumidifierDehumidifierActive)}`);
  }

  /**
   * Handle the "GET" requests from HomeKit
    */
  async handleActiveGet(): Promise<CharacteristicValue> {
    const humidifierDehumidifierActive = this.states.HumidifierDehumidifierActive;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Active: ${HumidifierDehumidifier.getActiveName(humidifierDehumidifierActive)}`);

    return humidifierDehumidifierActive;
  }

  /**
   * Handle "GET" requests from HomeKit
   */
  async handleCurrentHumidifierDehumidifierStateGet(): Promise<CharacteristicValue> {
    const humidifierDehumidifierCurrentState = this.states.HumidifierDehumidifierCurrentState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Humidifier Dehumidifier State: ${HumidifierDehumidifier.getCurrentStateName(humidifierDehumidifierCurrentState)}`);

    return humidifierDehumidifierCurrentState;
  }

  /**
   * Handle "SET" requests from HomeKit
   */
  async handleTargetHumidifierDehumidifierStateSet(value: CharacteristicValue) {
    this.states.HumidifierDehumidifierTargetState = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Humidifier Dehumidifier State: ${HumidifierDehumidifier.getTargetStateName(this.states.HumidifierDehumidifierTargetState)}`);

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Humidifier Dehumidifier State: ${HumidifierDehumidifier.getCurrentStateName(this.states.HumidifierDehumidifierCurrentState)}`);
  }

  /**
   * Handle the "GET" requests from HomeKit
   */
  async handleTargetHumidifierDehumidifierStateGet(): Promise<CharacteristicValue> {
    const humidifierDehumidifierTargetState = this.states.HumidifierDehumidifierTargetState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target Humidifier Dehumidifier State: ${HumidifierDehumidifier.getTargetStateName(humidifierDehumidifierTargetState)}`);

    return humidifierDehumidifierTargetState;
  }

  /**
   * Handle "GET" requests from HomeKit
   */
  async handleCurrentRelativeHumidityGet(): Promise<CharacteristicValue> {
    const currentRelativeHumidity = this.states.CurrentRelativeHumidity;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Relative Humidity: ${currentRelativeHumidity}`);

    return currentRelativeHumidity;
  }

  async handleRelativeHumidityDehumidifierThresholdSet(value: CharacteristicValue) {
    this.states.DehumidifierThreshold = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Relative Humidity Dehumidifier Threshold: ${HumidifierDehumidifier.getTargetStateName(this.states.DehumidifierThreshold)}`);
  }

  async handleRelativeHumidityDehumidifierThresholdGet(): Promise<CharacteristicValue>  {
    const dehumidifierThreshold = this.states.DehumidifierThreshold;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Relative Humidity Dehumidifier Threshold: ${dehumidifierThreshold}`);

    return dehumidifierThreshold;
  }

  async handleRelativeHumidityHumidifierThresholdSet(value: CharacteristicValue) {
    this.states.HumidifierThreshold = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Relative Humidity Humidifier Threshold: ${HumidifierDehumidifier.getTargetStateName(this.states.HumidifierThreshold)}`);
  }

  async handleRelativeHumidityHumidifierThresholdGet(): Promise<CharacteristicValue> {
    const humidifierThreshold = this.states.HumidifierThreshold;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Relative Humidity Humidifier Threshold: ${humidifierThreshold}`);

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

  private isHumidifierOnly(): boolean {
    return ['humidifier'].includes(this.deviceType);
  }

  private isDehumidifierOnly(): boolean {
    return ['dehumidifier'].includes(this.deviceType);
  }

  private deviceHumidifies(): boolean {
    return ['auto', 'humidifier'].includes(this.deviceType);
  }

  private deviceDehumidifies(): boolean {
    return ['auto', 'dehumidifier'].includes(this.deviceType);
  }

  private setDeviceOperationalCondition() {
    if (this.states.HumidifierDehumidifierActive === HumidifierDehumidifier.ACTIVE) {
      this.states.HumidifierDehumidifierCurrentState = HumidifierDehumidifier.IDLE;

      if (this.states.CurrentRelativeHumidity < this.states.HumidifierThreshold) {
        if (this.deviceHumidifies()) {
          this.states.HumidifierDehumidifierCurrentState = HumidifierDehumidifier.HUMIDIFYING;
        }
      }
      else if (this.states.CurrentRelativeHumidity > this.states.DehumidifierThreshold) {
        if (this.deviceDehumidifies()) {
          this.states.HumidifierDehumidifierCurrentState = HumidifierDehumidifier.DEHUMIDIFYING;
        }
      }
    }
    else {
      this.states.HumidifierDehumidifierCurrentState = HumidifierDehumidifier.INACTIVE;
    }
  }

  static getActiveName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case HumidifierDehumidifier.INACTIVE: { eventName = 'INACTIVE'; break; }
    case HumidifierDehumidifier.ACTIVE: { eventName = 'ACTIVE'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }

  static getCurrentStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case HumidifierDehumidifier.INACTIVE: { stateName = 'INACTIVE'; break; }
    case HumidifierDehumidifier.IDLE: { stateName = 'IDLE'; break; }
    case HumidifierDehumidifier.HUMIDIFYING: { stateName = 'HUMIDIFYING'; break; }
    case HumidifierDehumidifier.DEHUMIDIFYING: { stateName = 'DEHUMIDIFYING'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }

  static getTargetStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case HumidifierDehumidifier.AUTO: { stateName = 'AUTO'; break; }
    case HumidifierDehumidifier.HUMIDIFIER_OR_DEHUMIDIFIER: { stateName = 'HUMIDIFIER_OR_DEHUMIDIFIER'; break; }
    case HumidifierDehumidifier.HUMIDIFIER: { stateName = 'HUMIDIFIER'; break; }
    case HumidifierDehumidifier.DEHUMIDIFIER: { stateName = 'DEHUMIDIFIER'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }

  private setHumidifierDehumidifierServiceProperties(
    service: Service,
  ) {
    const currentStateValues: number[] = [];
    const targetStateValues: number[] = [];

    if (this.isHumidifierOnly()) {
      currentStateValues.push(this.platform.Characteristic.CurrentHumidifierDehumidifierState.INACTIVE);
      currentStateValues.push(this.platform.Characteristic.CurrentHumidifierDehumidifierState.IDLE);
      currentStateValues.push(this.platform.Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING);

      targetStateValues.push(this.platform.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER);

      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Is a Humidifier`);
    }
    else if (this.isDehumidifierOnly()) {
      currentStateValues.push(this.platform.Characteristic.CurrentHumidifierDehumidifierState.INACTIVE);
      currentStateValues.push(this.platform.Characteristic.CurrentHumidifierDehumidifierState.IDLE);
      currentStateValues.push(this.platform.Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING);

      targetStateValues.push(this.platform.Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER);

      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Is a Dehumidifier`);
    }
    else {
      // Is both a humidifier and dehumidifier

      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Is a Humidifier/Dehumidifier`);
    }

    if (currentStateValues.length > 0) {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Current State values: ${this.getCurrentStateLabels(currentStateValues)}`);

      service.getCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState)
        .setProps({
          validValues: currentStateValues,
        });
    }
    if (targetStateValues.length > 0) {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Target State values: ${this.getTargetStateLabels(targetStateValues)}`);

      service.getCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState)
        .setProps({
          validValues: targetStateValues,
        });
    }

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Props: ${JSON.stringify(service.getCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState).props)}`);
  }

  private getCurrentStateLabels(values: number[]): string[] {
    const labels: string[] = [];

    values.forEach(value => {
      labels.push(HumidifierDehumidifier.getCurrentStateName(value));
    });

    return labels;
  }

  private getTargetStateLabels(values: number[]): string[] {
    const labels: string[] = [];

    values.forEach(value => {
      labels.push(HumidifierDehumidifier.getTargetStateName(value));
    });

    return labels;
  }
}
