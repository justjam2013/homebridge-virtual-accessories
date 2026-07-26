/* eslint-disable brace-style */
/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { UpdatableMeasurementSensor } from '../sensors/updatableSensor.js';
import { HeaterType, TemperatureUnit, ThresholdTemperature } from '../configuration/schema.js';
import { Active, CurrentHeaterCoolerState, TargetHeaterCoolerState, TemperatureDisplayUnits } from './accessoryCharacteristics.js';

/**
 * HeaterCooler - Accessory implementation
 */
export class HeaterCooler extends Accessory<typeof Service.HeaterCooler> implements UpdatableMeasurementSensor {

  private static readonly ACCESSORY_TYPE_NAME: string = 'HeaterCooler';

  private readonly stateStorageKey: string = 'HeaterCoolerActive';
  private readonly targetStateStorageKey: string = 'HeaterCoolerTargetState';
  private readonly heatingThresholdStorageKey: string = 'HeatingThreshold';
  private readonly coolingThresholdStorageKey: string = 'CoolingThreshold';
  private readonly temperatureDisplayUnitsStorageKey: string = 'TemperatureDisplayUnits';
  private readonly fanRotatioSpeedStorageKey: string = 'FanRotationSpeed';

  private deviceType: string;

  // Device state
  private Active: number = Active.INACTIVE;
  private CurrentState: number = CurrentHeaterCoolerState.INACTIVE;
  private TargetState: number = TargetHeaterCoolerState.AUTO;
  // HomeKit units are in celsius
  private HeatingThreshold: number = 18;           // 18ºC considered a minimum for health and safety
  private CoolingThreshold: number = 27;           // 27ºC
  private CurrentTemperature: number = 22;         // This value comes from sensor, set to 22ºC for now - room temperature
  private TemperatureDisplayUnits: number = TemperatureDisplayUnits.CELSIUS;
  private FanRotationSpeed: number = 0;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.HeaterCooler,
      HeaterCooler.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    this.Active = Active.INACTIVE;
    this.CurrentState = CurrentHeaterCoolerState.INACTIVE;
    this.TemperatureDisplayUnits = this.accessoryConfiguration.heaterCooler.temperatureDisplayUnits === TemperatureUnit.Celsius ? TemperatureDisplayUnits.CELSIUS : TemperatureDisplayUnits.FAHRENHEIT;
    this.HeatingThreshold = this.accessoryConfiguration.heaterCooler.heatingThreshold as number;
    this.CoolingThreshold = this.accessoryConfiguration.heaterCooler.coolingThreshold as number;

    // set to 22ºC
    this.CurrentTemperature = 22;

    this.deviceType = this.accessoryConfiguration.heaterCooler.type;

    if (this.deviceType === HeaterType.Heater) {
      this.TargetState = TargetHeaterCoolerState.HEAT;
    }
    else if (this.deviceType === HeaterType.Cooler) {
      this.TargetState = TargetHeaterCoolerState.COOL;
    }
    else {
      this.TargetState = TargetHeaterCoolerState.AUTO;
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedTargetState: number = accessoryState[this.targetStateStorageKey] as number;
      const cachedTemperatureDisplayUnits: number = accessoryState[this.temperatureDisplayUnitsStorageKey] as number;
      const cachedFanRotationSpeed: number = accessoryState[this.fanRotatioSpeedStorageKey] as number;

      if (cachedState !== undefined) {
        this.Active = cachedState;
      }
      if (cachedTargetState !== undefined) {
        this.TargetState = cachedTargetState;
      }
      if (cachedTemperatureDisplayUnits !== undefined) {
        this.TemperatureDisplayUnits = cachedTemperatureDisplayUnits;
      }
      if (cachedFanRotationSpeed !== undefined) {
        this.FanRotationSpeed = cachedFanRotationSpeed;
      }
      if (this.cools()) {
        const cachedCoolingThreshold: number = accessoryState[this.coolingThresholdStorageKey] as number;
        if (cachedCoolingThreshold !== undefined) {
          this.CoolingThreshold = cachedCoolingThreshold;
        }
      }
      if (this.heats()) {
        const cachedHeatingThreshold: number = accessoryState[this.heatingThresholdStorageKey] as number;
        if (cachedHeatingThreshold !== undefined) {
          this.HeatingThreshold = cachedHeatingThreshold;
        }
      }
    }

    this.setDeviceOperationalCondition();

    // These characteristics will be added back as needed
    this.service.removeCharacteristic(this.service.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature));
    this.service.removeCharacteristic(this.service.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature));

    this.setHeaterCoolerServiceProperties(this.service!);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Heater/Cooler Current State: ${CurrentHeaterCoolerState.getName(this.CurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState, (this.CurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, (this.TargetState));

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
    this.log.debug(`[${this.accessoryName}] Characteristics: ${characteristics.join(', ')}`);

    if (this.accessoryConfiguration.heaterCooler.hasFan) {
      const fanServiceName = `${this.accessoryName} Fan`;
      const fanService = this.accessory.getService(fanServiceName)
        || this.accessory.addService(this.platform.Service.Fan, fanServiceName, this.accessory.UUID + '-Fan');

      fanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, (0));

      fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
        .onSet(this.setRotationSpeed.bind(this))
        .onGet(this.getRotationSpeed.bind(this));
    }
  }

  // Handlers

  async setActive(value: CharacteristicValue) {
    this.Active = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryName}] Setting Active: ${Active.getName(this.Active)}`);
  }

  async getActive(): Promise<CharacteristicValue> {
    const heaterCoolerActive = this.Active;

    this.log.debug(`[${this.accessoryName}] Getting Active: ${Active.getName(heaterCoolerActive)}`);

    return heaterCoolerActive;
  }

  async getCurrentHeaterCoolerState(): Promise<CharacteristicValue> {
    const heaterCoolerCurrentState = this.CurrentState;

    this.log.debug(`[${this.accessoryName}] Getting Current Heater Cooler State: ${CurrentHeaterCoolerState.getName(heaterCoolerCurrentState)}`);

    return heaterCoolerCurrentState;
  }

  async setTargetHeaterCoolerState(value: CharacteristicValue) {
    this.TargetState = value as number;

    this.log.info(`[${this.accessoryName}] Setting Target Heater Cooler State: ${TargetHeaterCoolerState.getName(this.TargetState)}`);

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryName}] Setting Current Heater Cooler State: ${CurrentHeaterCoolerState.getName(this.CurrentState)}`);
  }

  async getTargetHeaterCoolerState(): Promise<CharacteristicValue> {
    const heaterCoolerTargetState = this.TargetState;

    this.log.debug(`[${this.accessoryName}] Getting Target Heater Cooler State: ${TargetHeaterCoolerState.getName(heaterCoolerTargetState)}`);

    return heaterCoolerTargetState;
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    const currentTemperature = this.CurrentTemperature;

    this.log.debug(`[${this.accessoryName}] Getting Current Temperature: ${this.displayTemperature(currentTemperature)}${TemperatureDisplayUnits.getUnits(this.TemperatureDisplayUnits)}`);

    return currentTemperature;
  }

  async setCoolingThresholdTemperature(value: CharacteristicValue) {
    this.CoolingThreshold = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryName}] Setting Cooling Threshold Temperature: ${this.displayTemperature(this.CoolingThreshold)}${TemperatureDisplayUnits.getUnits(this.TemperatureDisplayUnits)}`);
  }

  async getCoolingThresholdTemperature(): Promise<CharacteristicValue>  {
    const coolingThreshold = this.CoolingThreshold;

    this.log.debug(`[${this.accessoryName}] Getting Cooling Threshold Temperature: ${this.displayTemperature(coolingThreshold)}${TemperatureDisplayUnits.getUnits(this.TemperatureDisplayUnits)}`);

    return coolingThreshold;
  }

  async setHeatingThresholdTemperature(value: CharacteristicValue) {
    this.HeatingThreshold = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryName}] Setting Heating Threshold Temperature: ${this.displayTemperature(this.HeatingThreshold)}${TemperatureDisplayUnits.getUnits(this.TemperatureDisplayUnits)}`);
  }

  async getHeatingThresholdTemperature(): Promise<CharacteristicValue> {
    const heatingThreshold = this.HeatingThreshold;

    this.log.debug(`[${this.accessoryName}] Getting Heating Threshold Temperature: ${this.displayTemperature(heatingThreshold)}${TemperatureDisplayUnits.getUnits(this.TemperatureDisplayUnits)}`);

    return heatingThreshold;
  }

  async setTemperatureDisplayUnits(value: CharacteristicValue) {
    this.TemperatureDisplayUnits = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Temperature Display Units: ${TemperatureDisplayUnits.getName(this.TemperatureDisplayUnits)}`);
  }

  async getTemperatureDisplayUnits(): Promise<CharacteristicValue> {
    const temperatureDisplayUnits = this.TemperatureDisplayUnits;

    this.log.debug(`[${this.accessoryName}] Getting Temperature Display Units: ${TemperatureDisplayUnits.getName(temperatureDisplayUnits)}`);

    return temperatureDisplayUnits;
  }

  // Fan Handlers

  async setRotationSpeed(value: CharacteristicValue) {
    this.FanRotationSpeed = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Rotation Speed: ${this.FanRotationSpeed}%`);
  }

  async getRotationSpeed(): Promise<CharacteristicValue> {
    const fanRotationSpeed = this.FanRotationSpeed;

    this.log.debug(`[${this.accessoryName}] Getting Rotation Speed: ${fanRotationSpeed}%`);

    return fanRotationSpeed;
  }

  //

  protected override getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.Active,
      [this.targetStateStorageKey]: this.TargetState,
      [this.coolingThresholdStorageKey]: this.CoolingThreshold,
      [this.heatingThresholdStorageKey]: this.HeatingThreshold,
      [this.temperatureDisplayUnitsStorageKey]: this.TemperatureDisplayUnits,
    };

    if (this.accessoryConfiguration.heaterCooler.hasFan) {
      Object.assign(jsonState, { [this.fanRotatioSpeedStorageKey]: this.FanRotationSpeed });
    }

    const json = JSON.stringify(jsonState);

    return json;
  }

  private heats(): boolean {
    return [HeaterType.Auto, HeaterType.Heater].includes(this.deviceType);
  }

  private cools(): boolean {
    return [HeaterType.Auto, HeaterType.Cooler].includes(this.deviceType);
  }

  private setDeviceOperationalCondition() {
    if (this.Active === Active.INACTIVE) {
      this.CurrentState = CurrentHeaterCoolerState.INACTIVE;
    }
    else {  // (this.HeaterCoolerActive === HeaterCooler.ACTIVE)
      if (this.TargetState === TargetHeaterCoolerState.HEAT) {
        this.CurrentState = CurrentHeaterCoolerState.HEATING;
      }
      else if (this.TargetState === TargetHeaterCoolerState.COOL) {
        this.CurrentState = CurrentHeaterCoolerState.COOLING;
      }
      else {  // (this.HeaterCoolerTargetState === HeaterCooler.AUTO)
        if (this.CurrentTemperature < this.HeatingThreshold) {
          if (this.heats()) {
            this.CurrentState = CurrentHeaterCoolerState.HEATING;
          }
        }
        else if (this.CurrentTemperature > this.CoolingThreshold) {
          if (this.cools()) {
            this.CurrentState = CurrentHeaterCoolerState.COOLING;
          }
        }
        else {
          this.CurrentState = CurrentHeaterCoolerState.IDLE;
        }
      }
    }

    this.service?.setCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState, (this.CurrentState));

    this.storeState();

    this.log.debug(`[${this.accessoryName}] Heater/Cooler current state: ${CurrentHeaterCoolerState.getName(this.CurrentState)}`);
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

    if (this.deviceType === HeaterType.Sauna) {
      service.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
        .setProps({
          minValue: ThresholdTemperature.SaunaHeatingThresholdMin,
          maxValue: ThresholdTemperature.SaunaHeatingThresholdMax,
        });

    }
  }

  private getCurrentStateLabels(values: Set<number>): string[] {
    const labels: string[] = [];

    values.forEach(value => {
      labels.push(CurrentHeaterCoolerState.getName(value));
    });

    return labels;
  }

  private getTargetStateLabels(values: Set<number>): string[] {
    const labels: string[] = [];

    values.forEach(value => {
      labels.push(TargetHeaterCoolerState.getName(value));
    });

    return labels;
  }

  private displayTemperature(temperature: number): number {
    const displayTemperature = (this.TemperatureDisplayUnits === TemperatureDisplayUnits.CELSIUS) ? temperature : (temperature * 9/5) + 32;

    return Math.round(displayTemperature * 10) / 10;
  }

  // Updatable Sensor interface

  updateMeasurementSensor(value: number, accessoryId: string): void {
    this.log.debug(`[${this.accessoryName}] Request update temperature sensor to ${value}${TemperatureDisplayUnits.getUnits(this.TemperatureDisplayUnits)}`);

    if (accessoryId !== this.accessoryId) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number') {
      this.log.error(`[${this.accessoryName}] Value ${value} is not valid for Heater/Cooler sensor`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }
    else {
      this.log.debug(`[${this.accessoryName}] Updating temperature sensor to ${value}${TemperatureDisplayUnits.getUnits(this.TemperatureDisplayUnits)}`);

      this.CurrentTemperature = this.toCelsius(value);
      this.setDeviceOperationalCondition();
    }
  }

  private toCelsius(temperature: number): number {
    const temperatureCelsius = (this.TemperatureDisplayUnits === TemperatureDisplayUnits.CELSIUS) ? temperature : (temperature - 32) * 5/9;

    return Math.round(temperatureCelsius * 10) / 10;
  }
}
