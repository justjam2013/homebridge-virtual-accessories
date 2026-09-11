/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { UpdatableMeasurementSensor } from '../sensors/updatableSensor.js';
import { TemperatureUnit } from '../configuration/schema.js';

abstract class StorageKeys {

  static TargetHeatingCoolingState: string = 'TargetHeatingCoolingState';
  static CurrentTemperature: string = 'CurrentTemperature';
  static TargetTemperature: string = 'TargetTemperature';
  static TemperatureDisplayUnits: string = 'TemperatureDisplayUnits';
  static CoolingThresholdTemperature: string = 'CoolingThresholdTemperature';
  static HeatingThresholdTemperature: string = 'HeatingThresholdTemperature';
}

/**
 * HeaterCooler - Accessory implementation
 */
export class Thermostat extends Accessory implements UpdatableMeasurementSensor {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.Thermostat);

    // HomeKit units are in celsius
    const CurrentHeatingCoolingState: number = Thermostat.OFF;
    let TargetHeatingCoolingState: number = Thermostat.OFF;
    let CurrentTemperature: number = 22;                    // 22ºC - room temperature
    let TargetTemperature: number = 22;
    let TemperatureDisplayUnits: number = Thermostat.CELSIUS;
    let HeatingThresholdTemperature: number = 18;           // 18ºC considered a minimum for health and safety
    let CoolingThresholdTemperature: number = 27;           // 27ºC

    // First configure the device based on the accessory details
    TemperatureDisplayUnits = this.accessoryConfiguration.thermostat.temperatureDisplayUnits === TemperatureUnit.Celsius ? Thermostat.CELSIUS : Thermostat.FAHRENHEIT;
    HeatingThresholdTemperature = this.accessoryConfiguration.thermostat.heatingThreshold as number;
    CoolingThresholdTemperature = this.accessoryConfiguration.thermostat.coolingThreshold as number;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedTargetHeatingCoolingState: number = accessoryState[StorageKeys.TargetHeatingCoolingState] as number;
      const cachedCurrentTemperature: number = accessoryState[StorageKeys.CurrentTemperature] as number;
      const cachedTargetTemperature: number = accessoryState[StorageKeys.TargetTemperature] as number;
      const cachedTemperatureDisplayUnits: number = accessoryState[StorageKeys.TemperatureDisplayUnits] as number;
      const cachedCoolingThresholdTemperature: number = accessoryState[StorageKeys.CoolingThresholdTemperature] as number;
      const cachedHeatingThresholdTemperature: number = accessoryState[StorageKeys.HeatingThresholdTemperature] as number;

      if (cachedTargetHeatingCoolingState !== undefined) {
        TargetHeatingCoolingState = cachedTargetHeatingCoolingState;
      }
      if (cachedCurrentTemperature !== undefined) {
        CurrentTemperature = cachedCurrentTemperature;
      }
      if (cachedTargetTemperature !== undefined) {
        TargetTemperature = cachedTargetTemperature;
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
    }

    // Update the initial state of the accessory
    this.setCurrentHeatingCoolingState(CurrentHeatingCoolingState);
    this.setTargetHeatingCoolingState(TargetHeatingCoolingState);
    this.setCurrentTemperature(CurrentTemperature);
    this.setTargetTemperature(TargetTemperature);
    this.setTemperatureDisplayUnits(TemperatureDisplayUnits);
    this.setCoolingThresholdTemperature(CoolingThresholdTemperature);
    this.setHeatingThresholdTemperature(HeatingThresholdTemperature);

    // 
    this.refreshAccessoryOperationalCondition();

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.CurrentHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.TargetHeatingCoolingState)
      .onSet(this.setTargetHeatingCoolingStateHandler.bind(this))
      .onGet(this.getTargetHeatingCoolingStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.CurrentTemperature)
      .onGet(this.getCurrentTemperatureHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.TargetTemperature)
      .onSet(this.setTargetTemperatureHandler.bind(this))
      .onGet(this.getTargetTemperatureHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.TemperatureDisplayUnits)
      .onSet(this.setTemperatureDisplayUnitsHandler.bind(this))
      .onGet(this.getTemperatureDisplayUnitsHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.CoolingThresholdTemperature)
      .onSet(this.setCoolingThresholdTemperatureHandler.bind(this))
      .onGet(this.getCoolingThresholdTemperatureHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.HeatingThresholdTemperature)
      .onSet(this.setHeatingThresholdTemperatureHandler.bind(this))
      .onGet(this.getHeatingThresholdTemperatureHandler.bind(this));
  }

  //
  // ****************************** Handlers ******************************
  //

  // CurrentHeatingCoolingState

  async getCurrentHeatingCoolingStateHandler(): Promise<CharacteristicValue> {
    const CurrentHeatingCoolingState: number = this.getCurrentHeatingCoolingState();
    this.log.debug(`[${this.accessoryName}] Getting Current Heating Cooling State: ${Thermostat.getHeatingCoolingStateName(CurrentHeatingCoolingState)}`);

    return CurrentHeatingCoolingState;
  }

  // TargetHeatingCoolingState

  async getTargetHeatingCoolingStateHandler(): Promise<CharacteristicValue> {
    const TargetHeatingCoolingState: number = this.getTargetHeatingCoolingState();
    this.log.debug(`[${this.accessoryName}] Getting Target Heating Cooling State: ${Thermostat.getHeatingCoolingStateName(TargetHeatingCoolingState)}`);

    return TargetHeatingCoolingState;
  }

  async setTargetHeatingCoolingStateHandler(value: CharacteristicValue) {
    let TargetHeatingCoolingState: number = value as number;
    TargetHeatingCoolingState = this.updateTargetHeatingCoolingState(TargetHeatingCoolingState);
    this.log.info(`[${this.accessoryName}] Setting Target Heating Cooling State: ${Thermostat.getHeatingCoolingStateName(TargetHeatingCoolingState)}`);

    this.refreshAccessoryOperationalCondition();
  }

  // CurrentTemperature

  async getCurrentTemperatureHandler(): Promise<CharacteristicValue> {
    const CurrentTemperature: number = this.getCurrentTemperature();
    this.log.debug(`[${this.accessoryName}] Getting Current Temperature: ${this.displayTemperature(CurrentTemperature)}${this.getDegreeUnits()}`);

    return CurrentTemperature;
  }

  // TargetTemperature

  async getTargetTemperatureHandler(): Promise<CharacteristicValue> {
    const TargetTemperature: number = this.getTargetTemperature();
    this.log.debug(`[${this.accessoryName}] Getting Target Temperature: ${this.displayTemperature(TargetTemperature)}${this.getDegreeUnits()}`);

    return TargetTemperature;
  }

  async setTargetTemperatureHandler(value: CharacteristicValue) {
    let TargetTemperature: number = value as number;
    TargetTemperature = this.updateTargetTemperature(TargetTemperature);
    this.log.info(`[${this.accessoryName}] Setting Target Temperature: ${this.displayTemperature(TargetTemperature)}${this.getDegreeUnits()}`);

    this.refreshAccessoryOperationalCondition();
  }

  // TemperatureDisplayUnits

  async getTemperatureDisplayUnitsHandler(): Promise<CharacteristicValue> {
    const TemperatureDisplayUnits: number = this.getTemperatureDisplayUnits();
    this.log.debug(`[${this.accessoryName}] Getting Temperature Display Units: ${Thermostat.getTemperatureDisplayUnitsName(TemperatureDisplayUnits)}`);

    return TemperatureDisplayUnits;
  }

  async setTemperatureDisplayUnitsHandler(value: CharacteristicValue) {
    let TemperatureDisplayUnits: number = value as number;
    TemperatureDisplayUnits = this.updateTemperatureDisplayUnits(TemperatureDisplayUnits);
    this.log.info(`[${this.accessoryName}] Setting Temperature Display Units: ${Thermostat.getTemperatureDisplayUnitsName(TemperatureDisplayUnits)}`);

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

    this.refreshAccessoryOperationalCondition();
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

    this.refreshAccessoryOperationalCondition();
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [StorageKeys.TargetHeatingCoolingState]: this.getTargetHeatingCoolingState(),
      [StorageKeys.CurrentTemperature]: this.getCurrentTemperature(),
      [StorageKeys.TargetTemperature]: this.getTargetTemperature(),
      [StorageKeys.TemperatureDisplayUnits]: this.getTemperatureDisplayUnits(),
      [StorageKeys.CoolingThresholdTemperature]: this.getCoolingThresholdTemperature(),
      [StorageKeys.HeatingThresholdTemperature]: this.getHeatingThresholdTemperature(),
    };

    const json = JSON.stringify(jsonState);
    return json;
  }

  //

  private refreshAccessoryOperationalCondition() {
    const TargetHeatingCoolingState: number = this.getTargetHeatingCoolingState();
    const CurrentTemperature: number = this.getCurrentTemperature();
    const TargetTemperature: number = this.getTargetTemperature();
    const CoolingThresholdTemperature: number = this.getCoolingThresholdTemperature();
    const HeatingThresholdTemperature: number = this.getHeatingThresholdTemperature();

    let CurrentHeatingCoolingState: number;
  
    if (TargetHeatingCoolingState === Thermostat.OFF) {
      CurrentHeatingCoolingState = TargetHeatingCoolingState;
    }
    else if (TargetHeatingCoolingState === Thermostat.HEAT) {
      if (CurrentTemperature < TargetTemperature) {
        CurrentHeatingCoolingState = Thermostat.HEAT;
      }
      else {
        CurrentHeatingCoolingState = Thermostat.OFF;
      }
    }
    else if (TargetHeatingCoolingState === Thermostat.COOL) {
      if (CurrentTemperature > TargetTemperature) {
        CurrentHeatingCoolingState = Thermostat.COOL;
      }
      else {
        CurrentHeatingCoolingState = Thermostat.OFF;
      }
    }
    else {  // (TargetHeatingCoolingState === Thermostats.AUTO)
      if (CurrentTemperature < HeatingThresholdTemperature) {
        CurrentHeatingCoolingState = Thermostat.HEAT;
      }
      else if (CurrentTemperature > CoolingThresholdTemperature) {
        CurrentHeatingCoolingState = Thermostat.COOL;
      }
      else {
        CurrentHeatingCoolingState = Thermostat.OFF;
      }
    }

    CurrentHeatingCoolingState = this.updateCurrentHeatingCoolingState(CurrentHeatingCoolingState);
    this.log.info(`[${this.accessoryName}] Setting Current Heating Cooling State: ${Thermostat.getHeatingCoolingStateName(CurrentHeatingCoolingState)}`);

    this.saveState();
  }

  private displayTemperature(temperature: number): number {
    const TemperatureDisplayUnits: number = this.getTemperatureDisplayUnits();
    const displayTemperature = (TemperatureDisplayUnits === Thermostat.CELSIUS) ? temperature : (temperature * 9/5) + 32;

    return Math.round(displayTemperature * 10) / 10;
  }

  private getDegreeUnits(): string {
    let units: string;

    const TemperatureDisplayUnits: number = this.getTemperatureDisplayUnits();
    switch (TemperatureDisplayUnits) {
    case undefined: { units = 'º'; break; }
    case Thermostat.CELSIUS: { units = 'ºC'; break; }
    case Thermostat.FAHRENHEIT: { units = 'ºF'; break; }
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

      this.refreshAccessoryOperationalCondition();
    }
  }

  private toCelsius(temperature: number): number {
    const TemperatureDisplayUnits: number = this.getTemperatureDisplayUnits();
    const temperatureCelsius = (TemperatureDisplayUnits === Thermostat.CELSIUS) ? temperature : (temperature - 32) * 5/9;

    return Math.round(temperatureCelsius * 10) / 10;
  }

  //
  // ****************************** Characteristics ******************************
  //

  // Lazy static getters

  static get OFF(): number                { return CharacteristicType.TargetHeatingCoolingState.OFF; }    // CharacteristicType.CurrentHeatingCoolingState.OFF
  static get HEAT(): number               { return CharacteristicType.TargetHeatingCoolingState.HEAT; }   // CharacteristicType.CurrentHeatingCoolingState.HEAT
  static get COOL(): number               { return CharacteristicType.TargetHeatingCoolingState.COOL; }   // CharacteristicType.CurrentHeatingCoolingState.COOL
  static get AUTO(): number               { return CharacteristicType.TargetHeatingCoolingState.AUTO; }

  static get CELSIUS(): number            { return CharacteristicType.TemperatureDisplayUnits.CELSIUS; }
  static get FAHRENHEIT(): number         { return CharacteristicType.TemperatureDisplayUnits.FAHRENHEIT; }

  static getHeatingCoolingStateName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case Thermostat.OFF: { name = 'OFF'; break; }
    case Thermostat.HEAT: { name = 'HEAT'; break; }
    case Thermostat.COOL: { name = 'COOL'; break; }
    case Thermostat.AUTO: { name = 'AUTO'; break; }
    default: { name = state.toString(); }
    }

    return name;
  }

  static getTemperatureDisplayUnitsName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case Thermostat.CELSIUS: { name = 'CELSIUS'; break; }
    case Thermostat.FAHRENHEIT: { name = 'FAHRENHEIT'; break; }
    default: { name = state.toString(); }
    }

    return name;
  }
}
