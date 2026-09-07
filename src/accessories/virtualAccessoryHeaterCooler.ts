/* eslint-disable brace-style */
/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { UpdatableMeasurementSensor } from '../sensors/updatableSensor.js';
import { HeaterType, TemperatureUnit, ThresholdTemperature } from '../configuration/schema.js';

/**
 * HeaterCooler - Accessory implementation
 */
export class HeaterCooler extends Accessory implements UpdatableMeasurementSensor {

  private readonly stateStorageKey: string = 'HeaterCoolerActive';
  private readonly targetStateStorageKey: string = 'HeaterCoolerTargetState';
  private readonly heatingThresholdStorageKey: string = 'HeatingThreshold';
  private readonly coolingThresholdStorageKey: string = 'CoolingThreshold';
  private readonly temperatureDisplayUnitsStorageKey: string = 'TemperatureDisplayUnits';
  private readonly fanRotatioSpeedStorageKey: string = 'FanRotationSpeed';

  private deviceType: string;

  private hasFan: boolean;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.HeaterCooler);

    let Active: number = HeaterCooler.INACTIVE;
    const CurrentHeaterCoolerState: number = HeaterCooler.CURRENTLY_INACTIVE;
    let TargetHeaterCoolerState: number = HeaterCooler.AUTO;
    // HomeKit units are in celsius
    let HeatingThresholdTemperature: number = 18;           // 18ºC considered a minimum for health and safety
    let CoolingThresholdTemperature: number = 27;           // 27ºC
    const CurrentTemperature: number = 22;                  // This value comes from sensor, set to 22ºC for now - room temperature
    let TemperatureDisplayUnits: number = HeaterCooler.CELSIUS;
    let FanRotationSpeed: number = 0;

    // First configure the device based on the accessory details
    TemperatureDisplayUnits = this.accessoryConfiguration.heaterCooler.temperatureDisplayUnits === TemperatureUnit.Celsius ? HeaterCooler.CELSIUS : HeaterCooler.FAHRENHEIT;
    HeatingThresholdTemperature = this.accessoryConfiguration.heaterCooler.heatingThreshold as number;
    CoolingThresholdTemperature = this.accessoryConfiguration.heaterCooler.coolingThreshold as number;

    this.deviceType = this.accessoryConfiguration.heaterCooler.type;
    this.hasFan = this.accessoryConfiguration.heaterCooler.hasFan;

    if (this.deviceType === HeaterType.Heater) {
      TargetHeaterCoolerState = HeaterCooler.HEAT;
    }
    else if (this.deviceType === HeaterType.Cooler) {
      TargetHeaterCoolerState = HeaterCooler.COOL;
    }
    else {
      TargetHeaterCoolerState = HeaterCooler.AUTO;
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedTargetState: number = accessoryState[this.targetStateStorageKey] as number;
      const cachedTemperatureDisplayUnits: number = accessoryState[this.temperatureDisplayUnitsStorageKey] as number;
      const cachedFanRotationSpeed: number = accessoryState[this.fanRotatioSpeedStorageKey] as number;

      if (cachedState !== undefined) {
        Active = cachedState;
      }
      if (cachedTargetState !== undefined) {
        TargetHeaterCoolerState = cachedTargetState;
      }
      if (cachedTemperatureDisplayUnits !== undefined) {
        TemperatureDisplayUnits = cachedTemperatureDisplayUnits;
      }
      if (cachedFanRotationSpeed !== undefined) {
        FanRotationSpeed = cachedFanRotationSpeed;
      }
      if (this.cools()) {
        const cachedCoolingThreshold: number = accessoryState[this.coolingThresholdStorageKey] as number;
        if (cachedCoolingThreshold !== undefined) {
          CoolingThresholdTemperature = cachedCoolingThreshold;
        }
      }
      if (this.heats()) {
        const cachedHeatingThreshold: number = accessoryState[this.heatingThresholdStorageKey] as number;
        if (cachedHeatingThreshold !== undefined) {
          HeatingThresholdTemperature = cachedHeatingThreshold;
        }
      }
    }

    this.refreshDeviceOperationalCondition();

    this.refreshHeaterCoolerServiceProperties(this.service!);

    // Update the initial state of the accessory
    this.setActive(Active);
    this.setCurrentHeaterCoolerState(CurrentHeaterCoolerState);
    this.setTargetHeaterCoolerState(TargetHeaterCoolerState);
    this.setCurrentTemperature(CurrentTemperature);
    this.setTemperatureDisplayUnits(TemperatureDisplayUnits);
    if (this.cools()) { this.setCoolingThresholdTemperature(CoolingThresholdTemperature); }
    if (this.heats()) { this.setHeatingThresholdTemperature(HeatingThresholdTemperature); }

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.Active)
      .onSet(this.setActiveHandler.bind(this))
      .onGet(this.getActiveHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.CurrentHeaterCoolerState)
      .onGet(this.getCurrentHeaterCoolerStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.TargetHeaterCoolerState)
      .onSet(this.setTargetHeaterCoolerStateHandler.bind(this))
      .onGet(this.getTargetHeaterCoolerStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.CurrentTemperature)
      .onGet(this.getCurrentTemperatureHandler.bind(this));

    if (this.cools()) {
      this.service.getCharacteristic(CharacteristicType.CoolingThresholdTemperature)
        .onSet(this.setCoolingThresholdTemperatureHandler.bind(this))
        .onGet(this.getCoolingThresholdTemperatureHandler.bind(this));
    }
    else {
      this.removeCharacteristic(this.service.getCharacteristic(CharacteristicType.CoolingThresholdTemperature));
    }

    if (this.heats()) {
      this.service.getCharacteristic(CharacteristicType.HeatingThresholdTemperature)
        .onSet(this.setHeatingThresholdTemperatureHandler.bind(this))
        .onGet(this.getHeatingThresholdTemperatureHandler.bind(this));
    }
    else {
      this.removeCharacteristic(this.service.getCharacteristic(CharacteristicType.HeatingThresholdTemperature));
    }

    this.service.getCharacteristic(CharacteristicType.TemperatureDisplayUnits)
      .onSet(this.setTemperatureDisplayUnitsHandler.bind(this))
      .onGet(this.getTemperatureDisplayUnitsHandler.bind(this));

    const characteristics: string[] = this.service.characteristics.map(characteristic => characteristic.displayName);
    this.log.debug(`[${this.accessoryName}] Characteristics: ${characteristics.join(', ')}`);

    if (this.hasFan) {
      const lockManagementServiceName = `${this.accessoryName} Fan`;
      const fanService =
        this.accessory.getService(lockManagementServiceName) ||
        this.accessory.addService(ServiceType.Fan, lockManagementServiceName, this.accessory.UUID + '-Fan');

      fanService.setCharacteristic(CharacteristicType.RotationSpeed, FanRotationSpeed);

      // Last register handlers

      fanService.getCharacteristic(CharacteristicType.RotationSpeed)
        .onSet(this.setRotationSpeedHandler.bind(this))
        .onGet(this.getRotationSpeedHandler.bind(this));
    }
  }

  //
  // ****************************** Handlers ******************************
  //

  // Active

  async getActiveHandler(): Promise<CharacteristicValue> {
    const Active: number = this.getActive();
    this.log.debug(`[${this.accessoryName}] Getting Active: ${HeaterCooler.getActiveName(Active)}`);

    return Active;
  }

  async setActiveHandler(value: CharacteristicValue) {
    let Active: number = value as number;
    Active = this.updateActive(Active);
    this.log.info(`[${this.accessoryName}] Setting Active: ${HeaterCooler.getActiveName(Active)}`);

    this.refreshDeviceOperationalCondition();
  }

  // CurrentHeaterCoolerState

  async getCurrentHeaterCoolerStateHandler(): Promise<CharacteristicValue> {
    const CurrentHeaterCoolerState: number = this.getCurrentHeaterCoolerState();
    this.log.debug(`[${this.accessoryName}] Getting Current Heater Cooler State: ${HeaterCooler.getCurrentStateName(CurrentHeaterCoolerState)}`);

    return CurrentHeaterCoolerState;
  }

  // TargetHeaterCoolerState

  async getTargetHeaterCoolerStateHandler(): Promise<CharacteristicValue> {
    const TargetHeaterCoolerState: number = this.getTargetHeaterCoolerState();
    this.log.debug(`[${this.accessoryName}] Getting Target Heater Cooler State: ${HeaterCooler.getTargetStateName(TargetHeaterCoolerState)}`);

    return TargetHeaterCoolerState;
  }

  async setTargetHeaterCoolerStateHandler(value: CharacteristicValue) {
    let TargetHeaterCoolerState: number = value as number;
    TargetHeaterCoolerState = this.updateTargetHeaterCoolerState(TargetHeaterCoolerState);
    this.log.info(`[${this.accessoryName}] Setting Target Heater Cooler State: ${HeaterCooler.getTargetStateName(TargetHeaterCoolerState)}`);

    this.refreshDeviceOperationalCondition();

    const CurrentHeaterCoolerState: number = this.getCurrentHeaterCoolerState();
    this.log.info(`[${this.accessoryName}] Setting Current Heater Cooler State: ${HeaterCooler.getCurrentStateName(CurrentHeaterCoolerState)}`);
  }

  // CurrentTemperature

  async getCurrentTemperatureHandler(): Promise<CharacteristicValue> {
    const CurrentTemperature: number = this.getCurrentTemperature();
    this.log.debug(`[${this.accessoryName}] Getting Current Temperature: ${this.displayTemperature(CurrentTemperature)}${this.getDegreeUnits()}`);

    return CurrentTemperature;
  }

  // CoolingThresholdTemperature

  async getCoolingThresholdTemperatureHandler(): Promise<CharacteristicValue>  {
    const CoolingThresholdTemperature: number = this.getCoolingThresholdTemperature();
    this.log.debug(`[${this.accessoryName}] Getting Cooling Threshold Temperature: ${this.displayTemperature(CoolingThresholdTemperature)}${this.getDegreeUnits()}`);

    return CoolingThresholdTemperature;
  }

  async setCoolingThresholdTemperatureHandler(value: CharacteristicValue) {
    let CoolingThresholdTemperature: number = value as number;
    CoolingThresholdTemperature = this.updateCoolingThresholdTemperature(CoolingThresholdTemperature);
    this.log.info(`[${this.accessoryName}] Setting Cooling Threshold Temperature: ${this.displayTemperature(CoolingThresholdTemperature)}${this.getDegreeUnits()}`);

    this.refreshDeviceOperationalCondition();
  }

  // HeatingThresholdTemperature

  async getHeatingThresholdTemperatureHandler(): Promise<CharacteristicValue> {
    const HeatingThresholdTemperature: number = this.getHeatingThresholdTemperature();
    this.log.debug(`[${this.accessoryName}] Getting Heating Threshold Temperature: ${this.displayTemperature(HeatingThresholdTemperature)}${this.getDegreeUnits()}`);

    return HeatingThresholdTemperature;
  }

  async setHeatingThresholdTemperatureHandler(value: CharacteristicValue) {
    let HeatingThresholdTemperature: number = value as number;
    HeatingThresholdTemperature = this.updateHeatingThresholdTemperature(HeatingThresholdTemperature);
    this.log.info(`[${this.accessoryName}] Setting Heating Threshold Temperature: ${this.displayTemperature(HeatingThresholdTemperature)}${this.getDegreeUnits()}`);

    this.refreshDeviceOperationalCondition();
  }

  // TemperatureDisplayUnits

  async getTemperatureDisplayUnitsHandler(): Promise<CharacteristicValue> {
    const TemperatureDisplayUnits: number = this.getTemperatureDisplayUnits();
    this.log.debug(`[${this.accessoryName}] Getting Temperature Display Units: ${HeaterCooler.getTemperatureDisplayUnitsName(TemperatureDisplayUnits)}`);

    return TemperatureDisplayUnits;
  }

  async setTemperatureDisplayUnitsHandler(value: CharacteristicValue) {
    let TemperatureDisplayUnits: number = value as number;
    TemperatureDisplayUnits = this.updateTemperatureDisplayUnits(TemperatureDisplayUnits);
    this.log.info(`[${this.accessoryName}] Setting Temperature Display Units: ${HeaterCooler.getTemperatureDisplayUnitsName(TemperatureDisplayUnits)}`);

    this.saveState();
  }

  // Fan Handlers

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
      [this.stateStorageKey]: this.getActive(),
      [this.targetStateStorageKey]: this.getTargetHeaterCoolerState(),
      [this.temperatureDisplayUnitsStorageKey]: this.getTemperatureDisplayUnits(),
    };

    if (this.cools()) {
      Object.assign(jsonState, { [this.coolingThresholdStorageKey]: this.getCoolingThresholdTemperature() });
    }
    if (this.heats()) {
      Object.assign(jsonState, { [this.heatingThresholdStorageKey]: this.getHeatingThresholdTemperature() });
    }

    if (this.hasFan) {
      Object.assign(jsonState, { [this.fanRotatioSpeedStorageKey]: this.getRotationSpeed() });
    }

    const json = JSON.stringify(jsonState);
    return json;
  }

  //

  private heats(): boolean {
    return [HeaterType.Auto, HeaterType.Heater].includes(this.deviceType);
  }

  private cools(): boolean {
    return [HeaterType.Auto, HeaterType.Cooler].includes(this.deviceType);
  }

  private refreshDeviceOperationalCondition() {
    const Active: number = this.getActive();
    const TargetHeaterCoolerState: number = this.getTargetHeaterCoolerState();
    const CurrentTemperature: number = this.getCurrentTemperature();
    const CoolingThresholdTemperature: number = this.getCoolingThresholdTemperature();
    const HeatingThresholdTemperature: number = this.getHeatingThresholdTemperature();
    let CurrentHeaterCoolerState: number = this.getCurrentHeaterCoolerState();
  
    if (Active === HeaterCooler.INACTIVE) {
      CurrentHeaterCoolerState = HeaterCooler.CURRENTLY_INACTIVE;
    }
    else {  // (Active === HeaterCooler.ACTIVE)
      if (TargetHeaterCoolerState === HeaterCooler.HEAT) {
        CurrentHeaterCoolerState = HeaterCooler.CURRENTLY_HEATING;
      }
      else if (TargetHeaterCoolerState === HeaterCooler.COOL) {
        CurrentHeaterCoolerState = HeaterCooler.CURRENTLY_COOLING;
      }
      else {  // (this.states.HeaterCoolerTargetState === HeaterCooler.AUTO)
        if (CurrentTemperature < HeatingThresholdTemperature) {
          if (this.heats()) {
            CurrentHeaterCoolerState = HeaterCooler.CURRENTLY_HEATING;
          }
        }
        else if (CurrentTemperature > CoolingThresholdTemperature) {
          if (this.cools()) {
            CurrentHeaterCoolerState = HeaterCooler.CURRENTLY_COOLING;
          }
        }
        else {
          CurrentHeaterCoolerState = HeaterCooler.CURRENTLY_IDLE;
        }
      }
    }

    CurrentHeaterCoolerState = this.updateCurrentHeaterCoolerState(CurrentHeaterCoolerState);
    this.log.debug(`[${this.accessoryName}] Heater/Cooler current state: ${HeaterCooler.getCurrentStateName(CurrentHeaterCoolerState)}`);

    this.saveState();
  }

  /**
   * Ensure all the property values are set, then remove as required
   */
  private refreshHeaterCoolerServiceProperties(
    service: Service,
  ) {
    const CurrentHeaterCoolerState = CharacteristicType.CurrentHeaterCoolerState;
    const TargetHeaterCoolerState = CharacteristicType.TargetHeaterCoolerState;

    const currentStateValues: Set<number> = new Set([
      CurrentHeaterCoolerState.INACTIVE,
      CurrentHeaterCoolerState.IDLE,
      CurrentHeaterCoolerState.CurrentHeaterCoolerState.HEATING,
      CurrentHeaterCoolerState.CurrentHeaterCoolerState.COOLING,
    ]);
    const targetStateValues: Set<number> = new Set([
      TargetHeaterCoolerState.AUTO,
      TargetHeaterCoolerState.HEAT,
      TargetHeaterCoolerState.COOL,
    ]);

    // HEAT: On/off heater
    // COOL: On/off cooler
    // AUTO: Uses threshold values to heat/cool

    if ((this.deviceType === HeaterType.Heater) || (this.deviceType === HeaterType.Sauna)) {
      currentStateValues.delete(CurrentHeaterCoolerState.COOLING);
      targetStateValues.delete(TargetHeaterCoolerState.COOL);

      // Remove this only if we want manual operation only
      //targetStateValues.delete(TargetHeaterCoolerState.AUTO);

      this.log.debug(`[${this.accessoryName}] Is a Heater ${this.deviceType === HeaterType.Sauna ? '(sauna)' : ''}`);
    }
    else if (this.deviceType === HeaterType.Cooler) {
      currentStateValues.delete(CurrentHeaterCoolerState.HEATING);
      targetStateValues.delete(TargetHeaterCoolerState.HEAT);

      // Remove this only if we want manual operation only
      //targetStateValues.delete(TargetHeaterCoolerState.AUTO);

      this.log.debug(`[${this.accessoryName}] Is a Cooler`);
    }
    else {
      this.log.debug(`[${this.accessoryName}] Is a Heater/Cooler`);
    }

    if (currentStateValues.size > 0) {
      this.log.debug(`[${this.accessoryName}] Setting Current State values: ${this.getCurrentStateLabels(currentStateValues)}`);

      service.getCharacteristic(CurrentHeaterCoolerState)
        .setProps({
          validValues: Array.from(currentStateValues),
        });

      this.log.debug(`[${this.accessoryName}] Current State Props: ${JSON.stringify(service.getCharacteristic(CurrentHeaterCoolerState).props)}`);
    }
    if (targetStateValues.size > 0) {
      this.log.debug(`[${this.accessoryName}] Setting Target State values: ${this.getTargetStateLabels(targetStateValues)}`);

      service.getCharacteristic(TargetHeaterCoolerState)
        .setProps({
          validValues: Array.from(targetStateValues),
        });

      this.log.debug(`[${this.accessoryName}] Target State Props: ${JSON.stringify(service.getCharacteristic(TargetHeaterCoolerState).props)}`);
    }

    // Modify min/max thresholds for sauna
    if (this.deviceType === HeaterType.Sauna) {
      service.getCharacteristic(CharacteristicType.HeatingThresholdTemperature)
        .setProps({
          minValue: ThresholdTemperature.SaunaHeatingThresholdMin,
          maxValue: ThresholdTemperature.SaunaHeatingThresholdMax,
        });

    }
  }

  private getCurrentStateLabels(values: Set<number>): string[] {
    const labels: string[] = [];

    values.forEach(value => {
      labels.push(HeaterCooler.getCurrentStateName(value));
    });

    return labels;
  }

  private getTargetStateLabels(values: Set<number>): string[] {
    const labels: string[] = [];

    values.forEach(value => {
      labels.push(HeaterCooler.getTargetStateName(value));
    });

    return labels;
  }

  private displayTemperature(temperature: number): number {
    const TemperatureDisplayUnits: number = this.getTemperatureDisplayUnits();
    const displayTemperature = (TemperatureDisplayUnits === HeaterCooler.CELSIUS) ? temperature : (temperature * 9/5) + 32;

    return Math.round(displayTemperature * 10) / 10;
  }

  private getDegreeUnits(): string {
    let units: string;

    const TemperatureDisplayUnits: number = this.getTemperatureDisplayUnits();
    switch (TemperatureDisplayUnits) {
    case undefined: { units = 'º'; break; }
    case HeaterCooler.CELSIUS: { units = 'ºC'; break; }
    case HeaterCooler.FAHRENHEIT: { units = 'ºF'; break; }
    default: { units = 'º'; }
    }

    return units;
  }

  // Updatable Sensor interface

  updateMeasurementSensor(value: number, accessoryId: string): void {
    this.log.debug(`[${this.accessoryName}] Request update temperature sensor to ${value}${this.getDegreeUnits()}`);

    if (accessoryId !== this.accessoryConfiguration.accessoryID) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number') {
      this.log.error(`[${this.accessoryName}] Value ${value} is not valid for Heater/Cooler sensor`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }
    else {
      this.log.debug(`[${this.accessoryName}] Updating temperature sensor to ${value}${this.getDegreeUnits()}`);

      let CurrentTemperature: number = this.toCelsius(value);
      CurrentTemperature = this.updateCurrentTemperature(CurrentTemperature);
      this.log.info(`[${this.accessoryName}] Setting Current Temperature: ${this.displayTemperature(CurrentTemperature)}${this.getDegreeUnits()}`);

      this.refreshDeviceOperationalCondition();
    }
  }

  private toCelsius(temperature: number): number {
    const TemperatureDisplayUnits: number = this.getTemperatureDisplayUnits();
    const temperatureCelsius = (TemperatureDisplayUnits === HeaterCooler.CELSIUS) ? temperature : (temperature - 32) * 5/9;

    return Math.round(temperatureCelsius * 10) / 10;
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly CURRENTLY_INACTIVE: number =          CharacteristicType.CurrentHeaterCoolerState.INACTIVE;
  static readonly CURRENTLY_IDLE: number =              CharacteristicType.CurrentHeaterCoolerState.IDLE;
  static readonly CURRENTLY_HEATING: number =           CharacteristicType.CurrentHeaterCoolerState.HEATING;
  static readonly CURRENTLY_COOLING: number =           CharacteristicType.CurrentHeaterCoolerState.COOLING;

  static readonly AUTO: number =                        CharacteristicType.TargetHeaterCoolerState.AUTO; 
  static readonly HEAT: number =                        CharacteristicType.TargetHeaterCoolerState.HEAT;
  static readonly COOL: number =                        CharacteristicType.TargetHeaterCoolerState.COOL;

  static readonly INACTIVE: number =                    CharacteristicType.Active.INACTIVE;
  static readonly ACTIVE: number =                      CharacteristicType.Active.ACTIVE;

  static readonly CELSIUS: number =                     CharacteristicType.TemperatureDisplayUnits.CELSIUS;
  static readonly FAHRENHEIT: number =                  CharacteristicType.TemperatureDisplayUnits.FAHRENHEIT;

  static getActiveName(status: number): string {
    let activeName: string;

    switch (status) {
    case undefined: { activeName = 'undefined'; break; }
    case HeaterCooler.INACTIVE: { activeName = 'INACTIVE'; break; }
    case HeaterCooler.ACTIVE: { activeName = 'ACTIVE'; break; }
    default: { activeName = status.toString(); }
    }

    return activeName;
  }

  static getCurrentStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case HeaterCooler.CURRENTLY_INACTIVE: { stateName = 'INACTIVE'; break; }
    case HeaterCooler.CURRENTLY_IDLE: { stateName = 'IDLE'; break; }
    case HeaterCooler.CURRENTLY_HEATING: { stateName = 'HEATING'; break; }
    case HeaterCooler.CURRENTLY_COOLING: { stateName = 'COOLING'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }

  static getTargetStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case HeaterCooler.AUTO: { stateName = 'AUTO'; break; }
    case HeaterCooler.HEAT: { stateName = 'HEAT'; break; }
    case HeaterCooler.COOL: { stateName = 'COOL'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }

  static getTemperatureDisplayUnitsName(state: number): string {
    let unitsName: string;

    switch (state) {
    case undefined: { unitsName = 'undefined'; break; }
    case HeaterCooler.CELSIUS: { unitsName = 'CELSIUS'; break; }
    case HeaterCooler.FAHRENHEIT: { unitsName = 'FAHRENHEIT'; break; }
    default: { unitsName = state.toString(); }
    }

    return unitsName;
  }
}
