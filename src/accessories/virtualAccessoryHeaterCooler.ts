/* eslint-disable brace-style */
/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { UpdatableMeasurementSensor } from '../sensors/updatableSensor.js';
import { HeaterType, TemperatureUnit } from '../configuration/schema.js';

/**
 * HeaterCooler - Accessory implementation
 */
export class HeaterCooler extends Accessory implements UpdatableMeasurementSensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'HeaterCooler';

  static readonly CURRENTLY_INACTIVE: number = 0;       // Characteristic.CurrentHeaterCoolerState.INACTIVE
  static readonly CURRENTLY_IDLE: number = 1;           // Characteristic.CurrentHeaterCoolerState.IDLE
  static readonly CURRENTLY_HEATING: number = 2;        // Characteristic.CurrentHeaterCoolerState.HEATING
  static readonly CURRENTLY_COOLING: number = 3;        // Characteristic.CurrentHeaterCoolerState.COOLING

  static readonly AUTO: number = 0;                     // Characteristic.TargetHeaterCoolerState.AUTO 
  static readonly HEAT: number = 1;                     // Characteristic.TargetHeaterCoolerState.HEAT
  static readonly COOL: number = 2;                     // Characteristic.TargetHeaterCoolerState.COOL

  static readonly INACTIVE: number = 0;                 // Characteristic.Active.INACTIVE
  static readonly ACTIVE: number = 1;                   // Characteristic.Active.ACTIVE

  static readonly CELSIUS: number = 0;                  // Characteristic.TemperatureDisplayUnits.CELSIUS
  static readonly FAHRENHEIT: number = 1;               // Characteristic.TemperatureDisplayUnits.FAHRENHEIT

  private readonly stateStorageKey: string = 'HeaterCoolerActive';
  private readonly targetStateStorageKey: string = 'HeaterCoolerTargetState';
  private readonly heatingThresholdStorageKey: string = 'HeatingThreshold';
  private readonly coolingThresholdStorageKey: string = 'CoolingThreshold';
  private readonly temperatureDisplayUnitsStorageKey: string = 'TemperatureDisplayUnits';

  private deviceType: string;

  private states = {
    HeaterCoolerActive: HeaterCooler.INACTIVE,
    HeaterCoolerCurrentState: HeaterCooler.CURRENTLY_INACTIVE,
    HeaterCoolerTargetState: HeaterCooler.AUTO,
    // HomeKit units are in celsius
    HeatingThreshold: 18,           // 18ºC considered a minimum for health and safety
    CoolingThreshold: 27,           // 27ºC
    CurrentTemperature: 22,         // This value comes from sensor, set to 22ºC for now - room temperature
    TemperatureDisplayUnits: HeaterCooler.CELSIUS,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.states.HeaterCoolerActive = HeaterCooler.INACTIVE;
    this.states.HeaterCoolerCurrentState = HeaterCooler.CURRENTLY_INACTIVE;
    this.states.TemperatureDisplayUnits = this.accessoryConfiguration.heaterCooler.temperatureDisplayUnits === TemperatureUnit.Celsius ? HeaterCooler.CELSIUS : HeaterCooler.FAHRENHEIT;
    this.states.HeatingThreshold = this.toCelsius(this.accessoryConfiguration.heaterCooler.getHeatingThreshold() as number);
    this.states.CoolingThreshold = this.toCelsius(this.accessoryConfiguration.heaterCooler.getCoolingThreshold() as number);

    // set to 22ºC or 71ºF
    this.states.CurrentTemperature = (this.states.TemperatureDisplayUnits === HeaterCooler.CELSIUS) ? 22 : this.toCelsius(71);

    this.deviceType = this.accessoryConfiguration.heaterCooler.type;

    if (this.deviceType === HeaterType.Heater) {
      this.states.HeaterCoolerTargetState = HeaterCooler.HEAT;
    }
    else if (this.deviceType === HeaterType.Cooler) {
      this.states.HeaterCoolerTargetState = HeaterCooler.COOL;
    }
    else {
      this.states.HeaterCoolerTargetState = HeaterCooler.AUTO;
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedTargetState: number = accessoryState[this.targetStateStorageKey] as number;
      const cachedTemperatureDisplayUnits: number = accessoryState[this.temperatureDisplayUnitsStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.HeaterCoolerActive = cachedState;
      }
      if (cachedTargetState !== undefined) {
        this.states.HeaterCoolerTargetState = cachedTargetState;
      }
      if (cachedTemperatureDisplayUnits !== undefined) {
        this.states.TemperatureDisplayUnits = cachedTemperatureDisplayUnits;
      }
      if (this.cools()) {
        const cachedCoolingThreshold: number = accessoryState[this.coolingThresholdStorageKey] as number;
        if (cachedCoolingThreshold !== undefined) {
          this.states.CoolingThreshold = cachedCoolingThreshold;
        }
      }
      if (this.heats()) {
        const cachedHeatingThreshold: number = accessoryState[this.heatingThresholdStorageKey] as number;
        if (cachedHeatingThreshold !== undefined) {
          this.states.HeatingThreshold = cachedHeatingThreshold;
        }
      }
    }

    this.setDeviceOperationalCondition();

    // get the HeaterCooler service if it exists, otherwise create a new LightBulb service
    this.service = this.accessory.getService(this.platform.Service.HeaterCooler) || this.accessory.addService(this.platform.Service.HeaterCooler);
    // These characteristics will be added back as needed
    this.service.removeCharacteristic(this.service.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature));
    this.service.removeCharacteristic(this.service.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature));

    this.setHeaterCoolerServiceProperties(this.service!);

    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Heater/Cooler Current State: ${HeaterCooler.getCurrentStateName(this.states.HeaterCoolerCurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState, (this.states.HeaterCoolerCurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, (this.states.HeaterCoolerTargetState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setActive.bind(this))
      .onGet(this.getActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.getCurrentHeaterCoolerState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .onSet(this.setTargetHeaterCoolerState.bind(this))
      .onGet(this.getTargetHeaterCoolerState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    if (this.cools()) {
      // Characteristic was removed when adding the Service
      this.service.addCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
        .onSet(this.setCoolingThresholdTemperature.bind(this))
        .onGet(this.getCoolingThresholdTemperature.bind(this));
    }

    if (this.heats()) {
      // Characteristic was removed when adding the Service
      this.service.addCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
        .onSet(this.setHeatingThresholdTemperature.bind(this))
        .onGet(this.getHeatingThresholdTemperature.bind(this));
    }

    this.service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onSet(this.setTemperatureDisplayUnits.bind(this))
      .onGet(this.getTemperatureDisplayUnits.bind(this));

    const characteristics: string[] = this.service.characteristics.map(characteristic => characteristic.displayName);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Characteristics: ${characteristics.join(', ')}`);
  }

  // Handlers

  async setActive(value: CharacteristicValue) {
    this.states.HeaterCoolerActive = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Active: ${HeaterCooler.getActiveName(this.states.HeaterCoolerActive)}`);
  }

  async getActive(): Promise<CharacteristicValue> {
    const heaterCoolerActive = this.states.HeaterCoolerActive;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Active: ${HeaterCooler.getActiveName(heaterCoolerActive)}`);

    return heaterCoolerActive;
  }

  async getCurrentHeaterCoolerState(): Promise<CharacteristicValue> {
    const heaterCoolerCurrentState = this.states.HeaterCoolerCurrentState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Heater Cooler State: ${HeaterCooler.getCurrentStateName(heaterCoolerCurrentState)}`);

    return heaterCoolerCurrentState;
  }

  async setTargetHeaterCoolerState(value: CharacteristicValue) {
    this.states.HeaterCoolerTargetState = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Heater Cooler State: ${HeaterCooler.getTargetStateName(this.states.HeaterCoolerTargetState)}`);

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Heater Cooler State: ${HeaterCooler.getCurrentStateName(this.states.HeaterCoolerCurrentState)}`);
  }

  async getTargetHeaterCoolerState(): Promise<CharacteristicValue> {
    const heaterCoolerTargetState = this.states.HeaterCoolerTargetState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target Heater Cooler State: ${HeaterCooler.getTargetStateName(heaterCoolerTargetState)}`);

    return heaterCoolerTargetState;
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    const currentTemperature = this.states.CurrentTemperature;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Temperature: ${this.displayTemperature(currentTemperature)}${this.getDegreeUnits()}`);

    return currentTemperature;
  }

  async setCoolingThresholdTemperature(value: CharacteristicValue) {
    this.states.CoolingThreshold = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Cooling Threshold Temperature: ${this.displayTemperature(this.states.CoolingThreshold)}${this.getDegreeUnits()}`);
  }

  async getCoolingThresholdTemperature(): Promise<CharacteristicValue>  {
    const coolingThreshold = this.states.CoolingThreshold;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Cooling Threshold Temperature: ${this.displayTemperature(coolingThreshold)}${this.getDegreeUnits()}`);

    return coolingThreshold;
  }

  async setHeatingThresholdTemperature(value: CharacteristicValue) {
    this.states.HeatingThreshold = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Heating Threshold Temperature: ${this.displayTemperature(this.states.HeatingThreshold)}${this.getDegreeUnits()}`);
  }

  async getHeatingThresholdTemperature(): Promise<CharacteristicValue> {
    const heatingThreshold = this.states.HeatingThreshold;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Heating Threshold Temperature: ${this.displayTemperature(heatingThreshold)}${this.getDegreeUnits()}`);

    return heatingThreshold;
  }

  async setTemperatureDisplayUnits(value: CharacteristicValue) {
    this.states.TemperatureDisplayUnits = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Temperature Display Units: ${HeaterCooler.getTemperatureDisplayUnitsName(this.states.TemperatureDisplayUnits)}`);
  }

  async getTemperatureDisplayUnits(): Promise<CharacteristicValue> {
    const temperatureDisplayUnits = this.states.TemperatureDisplayUnits;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Temperature Display Units: ${HeaterCooler.getTemperatureDisplayUnitsName(temperatureDisplayUnits)}`);

    return temperatureDisplayUnits;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.HeaterCoolerActive,
      [this.targetStateStorageKey]: this.states.HeaterCoolerTargetState,
      [this.coolingThresholdStorageKey]: this.states.CoolingThreshold,
      [this.heatingThresholdStorageKey]: this.states.HeatingThreshold,
      [this.temperatureDisplayUnitsStorageKey]: this.states.TemperatureDisplayUnits,
    });
    return json;
  }

  protected getAccessoryTypeName(): string {
    return HeaterCooler.ACCESSORY_TYPE_NAME;
  }

  private heats(): boolean {
    return [HeaterType.Auto, HeaterType.Heater].includes(this.deviceType);
  }

  private cools(): boolean {
    return [HeaterType.Auto, HeaterType.Cooler].includes(this.deviceType);
  }

  private setDeviceOperationalCondition() {
    if (this.states.HeaterCoolerActive === HeaterCooler.INACTIVE) {
      this.states.HeaterCoolerCurrentState = HeaterCooler.CURRENTLY_INACTIVE;
    }
    else {  // (this.states.HeaterCoolerActive === HeaterCooler.ACTIVE)
      if (this.states.HeaterCoolerTargetState === HeaterCooler.HEAT) {
        this.states.HeaterCoolerCurrentState = HeaterCooler.CURRENTLY_HEATING;
      }
      else if (this.states.HeaterCoolerTargetState === HeaterCooler.COOL) {
        this.states.HeaterCoolerCurrentState = HeaterCooler.CURRENTLY_COOLING;
      }
      else {  // (this.states.HeaterCoolerTargetState === HeaterCooler.AUTO)
        if (this.states.CurrentTemperature < this.states.HeatingThreshold) {
          if (this.heats()) {
            this.states.HeaterCoolerCurrentState = HeaterCooler.CURRENTLY_HEATING;
          }
        }
        else if (this.states.CurrentTemperature > this.states.CoolingThreshold) {
          if (this.cools()) {
            this.states.HeaterCoolerCurrentState = HeaterCooler.CURRENTLY_COOLING;
          }
        }
        else {
          this.states.HeaterCoolerCurrentState = HeaterCooler.CURRENTLY_IDLE;
        }
      }
    }

    this.service?.setCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState, (this.states.HeaterCoolerCurrentState));

    this.storeState();

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Heater/Cooler current state: ${HeaterCooler.getCurrentStateName(this.states.HeaterCoolerCurrentState)}`);
  }

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

  /**
   * Ensure all the property values are set, then remove as required
   */
  private setHeaterCoolerServiceProperties(
    service: Service,
  ) {
    const CurrentHeaterCoolerState = this.platform.Characteristic.CurrentHeaterCoolerState;
    const TargetHeaterCoolerState = this.platform.Characteristic.TargetHeaterCoolerState;

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

    if (this.deviceType === HeaterType.Heater) {
      currentStateValues.delete(CurrentHeaterCoolerState.COOLING);
      targetStateValues.delete(TargetHeaterCoolerState.COOL);

      targetStateValues.delete(TargetHeaterCoolerState.AUTO);

      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Is a Heater`);
    }
    else if (this.deviceType === HeaterType.Cooler) {
      currentStateValues.delete(CurrentHeaterCoolerState.HEATING);
      targetStateValues.delete(TargetHeaterCoolerState.HEAT);

      targetStateValues.delete(TargetHeaterCoolerState.AUTO);

      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Is a Cooler`);
    }
    else {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Is a Heater/Cooler`);
    }

    if (currentStateValues.size > 0) {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Current State values: ${this.getCurrentStateLabels(currentStateValues)}`);

      service.getCharacteristic(CurrentHeaterCoolerState)
        .setProps({
          validValues: Array.from(currentStateValues),
        });

      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Current State Props: ${JSON.stringify(service.getCharacteristic(CurrentHeaterCoolerState).props)}`);
    }
    if (targetStateValues.size > 0) {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Target State values: ${this.getTargetStateLabels(targetStateValues)}`);

      service.getCharacteristic(TargetHeaterCoolerState)
        .setProps({
          validValues: Array.from(targetStateValues),
        });

      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Target State Props: ${JSON.stringify(service.getCharacteristic(TargetHeaterCoolerState).props)}`);
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

  private toCelsius(temperature: number): number {
    const temperatureCelsius = (this.states.TemperatureDisplayUnits === HeaterCooler.CELSIUS) ? temperature : (temperature - 32) * 5/9;

    return Math.round(temperatureCelsius * 10) / 10;
  }

  private displayTemperature(temperature: number): number {
    const displayTemperature = (this.states.TemperatureDisplayUnits === HeaterCooler.CELSIUS) ? temperature : (temperature * 9/5) + 32;

    return Math.round(displayTemperature * 10) / 10;
  }

  private getDegreeUnits(): string {
    let units: string;

    switch (this.states.TemperatureDisplayUnits) {
    case undefined: { units = 'º'; break; }
    case HeaterCooler.CELSIUS: { units = 'ºC'; break; }
    case HeaterCooler.FAHRENHEIT: { units = 'ºF'; break; }
    default: { units = 'º'; }
    }

    return units;
  }

  // Updatable Sensor interface

  updateMeasurementSensor(value: number, accessoryId: string): void {
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Request update temperature sensor to ${value}${this.getDegreeUnits()}`);

    if (accessoryId !== this.accessoryConfiguration.accessoryID) {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number') {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Value ${value} is not valid for Heater/Cooler sensor`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }
    else {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Updating temperature sensor to ${value}${this.getDegreeUnits()}`);

      this.states.CurrentTemperature = this.toCelsius(value);
      this.setDeviceOperationalCondition();
    }
  }
}
