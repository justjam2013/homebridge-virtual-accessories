/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { UpdatableMeasurementSensor } from '../sensors/updatableSensor.js';
import { HeaterType, TemperatureUnit, ThresholdTemperature } from '../configuration/schema.js';

abstract class StorageKeys {

  static Active: string = 'HeaterCoolerActive';
  static CurrentTemperature: string = 'CurrentTemperature';
  static TargetHeaterCoolerState: string = 'HeaterCoolerTargetState';
  static CoolingThresholdTemperature: string = 'CoolingThreshold';
  static HeatingThresholdTemperature: string = 'HeatingThreshold';
  static TemperatureDisplayUnits: string = 'TemperatureDisplayUnits';
  static RotationSpeed: string = 'FanRotationSpeed';
}

/**
 * HeaterCooler - Accessory implementation
 */
export class HeaterCooler extends Accessory implements UpdatableMeasurementSensor {

  private deviceType: string;

  private hasFan: boolean;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.HeaterCooler);

    // Make sure the old Fan service is removed
    const legacyFanService = this.accessory.getServiceById(
      ServiceType.Fan,
      `${this.accessory.UUID}-Fan`,
    );

    if (legacyFanService) {
      this.accessory.removeService(legacyFanService);
    }
    // ******************************

    let Active: number = HeaterCooler.INACTIVE;
    const CurrentHeaterCoolerState: number = HeaterCooler.CURRENTLY_INACTIVE;
    let TargetHeaterCoolerState: number = HeaterCooler.AUTO;
    // HomeKit units are in celsius
    let HeatingThresholdTemperature: number = 18;           // 18ºC considered a minimum for health and safety
    let CoolingThresholdTemperature: number = 27;           // 27ºC
    let CurrentTemperature: number = 22;                    // This value comes from sensor, set to 22ºC for now - room temperature
    let TemperatureDisplayUnits: number = HeaterCooler.CELSIUS;
    let RotationSpeed: number = 0;

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
    else {  // (this.deviceType === HeaterType.Auto)
      TargetHeaterCoolerState = HeaterCooler.AUTO;
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedActive: number = accessoryState[StorageKeys.Active] as number;
      const cachedCurrentTemperature: number = accessoryState[StorageKeys.CurrentTemperature] as number;
      const cachedTargetHeaterCoolerState: number = accessoryState[StorageKeys.TargetHeaterCoolerState] as number;
      const cachedTemperatureDisplayUnits: number = accessoryState[StorageKeys.TemperatureDisplayUnits] as number;
      const cachedCoolingThresholdTemperature: number = accessoryState[StorageKeys.CoolingThresholdTemperature] as number;
      const cachedHeatingThresholdTemperature: number = accessoryState[StorageKeys.HeatingThresholdTemperature] as number;
      const cachedRotationSpeed: number = accessoryState[StorageKeys.RotationSpeed] as number;

      if (cachedActive !== undefined) {
        Active = cachedActive;
      }
      if (cachedCurrentTemperature !== undefined) {
        CurrentTemperature = cachedCurrentTemperature;
      }
      if (cachedTargetHeaterCoolerState !== undefined) {
        TargetHeaterCoolerState = cachedTargetHeaterCoolerState;
      }
      if (cachedTemperatureDisplayUnits !== undefined) {
        TemperatureDisplayUnits = cachedTemperatureDisplayUnits;
      }
      if (cachedCoolingThresholdTemperature !== undefined) {
        CoolingThresholdTemperature = cachedCoolingThresholdTemperature;
      }
      if (cachedHeatingThresholdTemperature !== undefined) {
        HeatingThresholdTemperature = cachedHeatingThresholdTemperature;
      }
      if (cachedRotationSpeed !== undefined) {
        RotationSpeed = cachedRotationSpeed;
      }
    }

    this.updateServiceProperties(this.service!);

    // Update the initial state of the accessory
    this.setActive(Active);
    this.setCurrentHeaterCoolerState(CurrentHeaterCoolerState);
    this.setTargetHeaterCoolerState(TargetHeaterCoolerState);
    this.setCurrentTemperature(CurrentTemperature);
    this.setTemperatureDisplayUnits(TemperatureDisplayUnits);
    if (this.cools()) { this.setCoolingThresholdTemperature(CoolingThresholdTemperature); }
    if (this.heats()) { this.setHeatingThresholdTemperature(HeatingThresholdTemperature); }
    if (this.hasFan) { this.setRotationSpeed(RotationSpeed); }

    this.updateAccessoryOperationalCondition();

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

    this.service.getCharacteristic(CharacteristicType.TemperatureDisplayUnits)
      .onSet(this.setTemperatureDisplayUnitsHandler.bind(this))
      .onGet(this.getTemperatureDisplayUnitsHandler.bind(this));

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
    this.log.debug(`[${this.accessoryName}] Getting Active: ${HeaterCooler.getActiveName(Active)}`);

    return Active;
  }

  async setActiveHandler(value: CharacteristicValue) {
    let Active: number = value as number;
    Active = this.updateActive(Active);
    this.log.info(`[${this.accessoryName}] Setting Active: ${HeaterCooler.getActiveName(Active)}`);

    this.updateAccessoryOperationalCondition();
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

    this.updateAccessoryOperationalCondition();
  }

  // CurrentTemperature

  async getCurrentTemperatureHandler(): Promise<CharacteristicValue> {
    const CurrentTemperature: number = this.getCurrentTemperature();
    this.log.debug(`[${this.accessoryName}] Getting Current Temperature: ${this.displayTemperature(CurrentTemperature)}${this.getDegreeUnits()}`);

    return CurrentTemperature;
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

    this.updateAccessoryOperationalCondition();
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
      [StorageKeys.CurrentTemperature]: this.getCurrentTemperature(),
      [StorageKeys.TargetHeaterCoolerState]: this.getTargetHeaterCoolerState(),
      [StorageKeys.TemperatureDisplayUnits]: this.getTemperatureDisplayUnits(),
    };

    if (this.cools()) {
      Object.assign(jsonState, { [StorageKeys.CoolingThresholdTemperature]: this.getCoolingThresholdTemperature() });
    }
    if (this.heats()) {
      Object.assign(jsonState, { [StorageKeys.HeatingThresholdTemperature]: this.getHeatingThresholdTemperature() });
    }

    if (this.hasFan) {
      Object.assign(jsonState, { [StorageKeys.RotationSpeed]: this.getRotationSpeed() });
    }

    const json = JSON.stringify(jsonState);
    return json;
  }

  //

  private heats(): boolean {
    return [HeaterType.Auto, HeaterType.Heater, HeaterType.Sauna].includes(this.deviceType);
  }

  private cools(): boolean {
    return [HeaterType.Auto, HeaterType.Cooler].includes(this.deviceType);
  }

  private updateAccessoryOperationalCondition() {
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
        if (CurrentTemperature < HeatingThresholdTemperature) {
          CurrentHeaterCoolerState = HeaterCooler.CURRENTLY_HEATING;
        }
        else {  // (CurrentTemperature >= HeatingThresholdTemperature)
          CurrentHeaterCoolerState = HeaterCooler.CURRENTLY_IDLE;
        }
      }
      else if (TargetHeaterCoolerState === HeaterCooler.COOL) {
        if (CurrentTemperature > CoolingThresholdTemperature) {
          CurrentHeaterCoolerState = HeaterCooler.CURRENTLY_COOLING;
        }
        else {  // (CurrentTemperature <= CoolingThresholdTemperature)
          CurrentHeaterCoolerState = HeaterCooler.CURRENTLY_IDLE;
        }
      }
      else {  // (TargetHeaterCoolerState === HeaterCooler.AUTO)
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
  private updateServiceProperties(
    service: Service,
  ) {
    const CurrentHeaterCoolerState = CharacteristicType.CurrentHeaterCoolerState;
    const TargetHeaterCoolerState = CharacteristicType.TargetHeaterCoolerState;

    const currentStateValues: Set<number> = new Set([
      CurrentHeaterCoolerState.INACTIVE,
      CurrentHeaterCoolerState.IDLE,
    ]);
    const targetStateValues: Set<number> = new Set([
    ]);

    if (this.heats()) {
      currentStateValues.add(CurrentHeaterCoolerState.HEATING);
      targetStateValues.add(TargetHeaterCoolerState.HEAT);

      this.log.debug(`[${this.accessoryName}] Adding heating properties`);
    }

    if (this.cools()) {
      currentStateValues.add(CurrentHeaterCoolerState.COOLING);
      targetStateValues.add(TargetHeaterCoolerState.COOL);

      this.log.debug(`[${this.accessoryName}] Adding cooling properties`);
    }

    if (this.heats() && this.cools()) {
      targetStateValues.add(TargetHeaterCoolerState.AUTO);

      this.log.debug(`[${this.accessoryName}] Adding auto property`);
    }

    // Set Current State values
    this.log.debug(`[${this.accessoryName}] Setting Current State values: ${this.getCurrentStateLabels(currentStateValues)}`);

    service.getCharacteristic(CurrentHeaterCoolerState)
      .setProps({
        validValues: Array.from(currentStateValues),
      });

    this.log.debug(`[${this.accessoryName}] Current State Props: ${JSON.stringify(service.getCharacteristic(CurrentHeaterCoolerState).props)}`);

    // Set Target State values
    this.log.debug(`[${this.accessoryName}] Setting Target State values: ${this.getTargetStateLabels(targetStateValues)}`);

    service.getCharacteristic(TargetHeaterCoolerState)
      .setProps({
        validValues: Array.from(targetStateValues),
      });

    this.log.debug(`[${this.accessoryName}] Target State Props: ${JSON.stringify(service.getCharacteristic(TargetHeaterCoolerState).props)}`);

    // Set Min & Max Thresholds for sauna
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

      this.updateAccessoryOperationalCondition();
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

  // Lazy static getters

  static get CURRENTLY_INACTIVE(): number { return CharacteristicType.CurrentHeaterCoolerState.INACTIVE; }
  static get CURRENTLY_IDLE(): number     { return CharacteristicType.CurrentHeaterCoolerState.IDLE; }
  static get CURRENTLY_HEATING(): number  { return CharacteristicType.CurrentHeaterCoolerState.HEATING; }
  static get CURRENTLY_COOLING(): number  { return CharacteristicType.CurrentHeaterCoolerState.COOLING; }

  static get AUTO(): number               { return CharacteristicType.TargetHeaterCoolerState.AUTO; }
  static get HEAT(): number               { return CharacteristicType.TargetHeaterCoolerState.HEAT; }
  static get COOL(): number               { return CharacteristicType.TargetHeaterCoolerState.COOL; }

  static get INACTIVE(): number           { return CharacteristicType.Active.INACTIVE; }
  static get ACTIVE(): number             { return CharacteristicType.Active.ACTIVE; }

  static get CELSIUS(): number            { return CharacteristicType.TemperatureDisplayUnits.CELSIUS; }
  static get FAHRENHEIT(): number         { return CharacteristicType.TemperatureDisplayUnits.FAHRENHEIT; }

  static getActiveName(status: number): string {
    let name: string;

    switch (status) {
    case undefined: { name = 'undefined'; break; }
    case HeaterCooler.INACTIVE: { name = 'INACTIVE'; break; }
    case HeaterCooler.ACTIVE: { name = 'ACTIVE'; break; }
    default: { name = status.toString(); }
    }

    return name;
  }

  static getCurrentStateName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case HeaterCooler.CURRENTLY_INACTIVE: { name = 'INACTIVE'; break; }
    case HeaterCooler.CURRENTLY_IDLE: { name = 'IDLE'; break; }
    case HeaterCooler.CURRENTLY_HEATING: { name = 'HEATING'; break; }
    case HeaterCooler.CURRENTLY_COOLING: { name = 'COOLING'; break; }
    default: { name = state.toString(); }
    }

    return name;
  }

  static getTargetStateName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case HeaterCooler.AUTO: { name = 'AUTO'; break; }
    case HeaterCooler.HEAT: { name = 'HEAT'; break; }
    case HeaterCooler.COOL: { name = 'COOL'; break; }
    default: { name = state.toString(); }
    }

    return name;
  }

  static getTemperatureDisplayUnitsName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case HeaterCooler.CELSIUS: { name = 'CELSIUS'; break; }
    case HeaterCooler.FAHRENHEIT: { name = 'FAHRENHEIT'; break; }
    default: { name = state.toString(); }
    }

    return name;
  }
}
