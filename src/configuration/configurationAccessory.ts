/* eslint-disable curly */

import { Categories } from 'homebridge';

import { Validatable } from './validatable.js';

import { AirPurifierConfiguration } from './accessories/configurationAirPurifier.js';
import { BatteryConfiguration } from './accessories/configurationBattery.js';
import { DoorConfiguration } from './accessories/configurationDoor.js';
import { DoorbellConfiguration } from './accessories/configurationDoorbell.js';
import { FanConfiguration } from './accessories/configurationFan.js';
import { FilterMaintenanceConfiguration } from './accessories/configurationFilterMaintenance.js';
import { GarageDoorConfiguration } from './accessories/configurationGarageDoor.js';
import { HeaterCoolerConfiguration } from './accessories/configurationHeaterCooler.js';
import { HumidifierDehumidifierConfiguration } from './accessories/configurationHumidifierDehumidifier.js';
import { LightbulbConfiguration } from './accessories/configurationLightbulb.js';
import { LockConfiguration } from './accessories/configurationLock.js';
import { MicrophoneConfiguration } from './accessories/configurationMicrophone.js';
import { SecuritySystemConfiguration } from './accessories/configurationSecuritySystem.js';
import { SpeakerConfiguration } from './accessories/configurationSpeaker.js';
import { SwitchConfiguration } from './accessories/configurationSwitch.js';
import { TelevisionConfiguration } from './accessories/configurationTelevision.js';
import { ValveConfiguration } from './accessories/configurationValve.js';
import { WindowConfiguration } from './accessories/configurationWindow.js';
import { WindowCoveringConfiguration } from './accessories/configurationWindowCovering.js';

import { BinarySensorConfiguration } from './configurationBinarySensor.js';
import { MeasurementSensorConfiguration } from './configurationMeasurementSensor.js';

import { CronTriggerConfiguration } from './triggers/configurationCronTrigger.js';
import { IkeaMatterStockTriggerConfiguration } from './triggers/configurationIkeaMatterStockTrigger.js';
import { PingTriggerConfiguration } from './triggers/configurationPingTrigger.js';
import { StartupTriggerConfiguration } from './triggers/configurationStartupTrigger.js';
import { SunEventsTriggerConfiguration } from './triggers/configurationSunEventsTrigger.js';
import { WebhookTriggerConfiguration } from './triggers/configurationWebhookTrigger.js';

import { CompanionSensorConfiguration } from './configurationCompanionSensor.js';
import { InputSourceConfiguration } from './accessories/configurationInputSource.js';
import { TimerConfiguration } from './configurationTimer.js';

import { AccessoryType, TriggerType } from './schema.js';
import { Utils } from '../utils/utils.js';

import { Type } from 'typeserializer';

/**
 * 
 */
export class AccessoryConfiguration {

  // ****************************** Schema fields ******************************

  // Required
  accessoryID!: string;
  accessoryName!: string;
  accessoryType!: string;

  // Optional
  accessoryIsStateful: boolean = false;

  // Accessories

  // Battery
  @Type(AirPurifierConfiguration)
    airPurifier!: AirPurifierConfiguration;

  // Battery
  @Type(BatteryConfiguration)
    battery!: BatteryConfiguration;

  // Door
  @Type(DoorConfiguration)
    door!: DoorConfiguration;

  // Doorbell
  @Type(DoorbellConfiguration)
    doorbell!: DoorbellConfiguration;

  // Fan
  @Type(FanConfiguration)
    fan!: FanConfiguration;

  // Filter Maintenance
  @Type(FilterMaintenanceConfiguration)
    filterMaintenance!: FilterMaintenanceConfiguration;

  // Garage Door
  @Type(GarageDoorConfiguration)
    garageDoor!: GarageDoorConfiguration;

  // HeaterCooler
  @Type(HeaterCoolerConfiguration)
    heaterCooler!: HeaterCoolerConfiguration;

  // HumidifierDehumidifier
  @Type(HumidifierDehumidifierConfiguration)
    humidifierDehumidifier!: HumidifierDehumidifierConfiguration;

  // Lightbulb
  @Type(LightbulbConfiguration)
    lightbulb!: LightbulbConfiguration;

  // Lock
  @Type(LockConfiguration)
    lock!: LockConfiguration;

  // Microphone
  @Type(MicrophoneConfiguration)
    microphone!: MicrophoneConfiguration;

  // SecuritySystem
  @Type(SecuritySystemConfiguration)
    securitySystem!: SecuritySystemConfiguration;

  // Speaker
  @Type(SpeakerConfiguration)
    speaker!: SpeakerConfiguration;

  // Switch
  @Type(SwitchConfiguration)
    switch!: SwitchConfiguration;

  // Television
  @Type(TelevisionConfiguration)
    television!: TelevisionConfiguration;

  // Valve
  @Type(ValveConfiguration)
    valve!: ValveConfiguration;

  // Window
  @Type(WindowConfiguration)
    window!: WindowConfiguration;

  // Window Covering
  @Type(WindowCoveringConfiguration)
    windowCovering!: WindowCoveringConfiguration;

  // Sensors

  // Sensor
  @Type(MeasurementSensorConfiguration)
    measurement!: MeasurementSensorConfiguration;

  // Sensor
  @Type(BinarySensorConfiguration)
    sensor!: BinarySensorConfiguration;

  // Switch decorations

  // Reset timer
  @Type(TimerConfiguration)
    resetTimer!: TimerConfiguration;

  // Companion Sensor
  @Type(CompanionSensorConfiguration)
    companionSensor!: CompanionSensorConfiguration;

  // Triggers

  @Type(CronTriggerConfiguration)
    cronTrigger!: CronTriggerConfiguration;

  @Type(IkeaMatterStockTriggerConfiguration)
    ikeaMatterStockTrigger!: IkeaMatterStockTriggerConfiguration;

  @Type(PingTriggerConfiguration)
    pingTrigger!: PingTriggerConfiguration;

  @Type(StartupTriggerConfiguration)
    startupTrigger!: StartupTriggerConfiguration;

  @Type(SunEventsTriggerConfiguration)
    sunEventsTrigger!: SunEventsTriggerConfiguration;

  @Type(WebhookTriggerConfiguration)
    webhookTrigger!: WebhookTriggerConfiguration;

  // ********************* Configuration enrichment fields *********************

  // External accessory category
  category?: Categories;

  // Television input source
  inputSource!: InputSourceConfiguration;

  // ***************************************************************************

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(): [boolean, string[]] {
    const isValidAccessoryID: boolean = (
      Utils.required(this.accessoryID) &&
      this.isValidId()
    );
    const isValidAccessoryName: boolean = (
      Utils.required(this.accessoryName)
    );
    const isValidAccessoryType: boolean = (
      Utils.required(this.accessoryType)
    );

    const isValidAccessory: boolean = (this.isValidAccessory());

    // Store fields failing validation
    if (!isValidAccessoryID) this.errorFields.push(this.fieldNames.accessoryID!);
    if (!isValidAccessoryName) this.errorFields.push(this.fieldNames.accessoryName!);
    if (!isValidAccessoryType) this.errorFields.push(this.fieldNames.accessoryType!);

    return [
      (isValidAccessoryID &&
        isValidAccessoryName &&
        isValidAccessoryType &&
        isValidAccessory),
      this.errorFields,
    ];
  }

  private isValidId(): boolean {
    const accessoryIdPattern: string = '^[A-Za-z0-9\\-]{5,}$';

    const patternRegex: RegExp = new RegExp(accessoryIdPattern);
    const isValidId: boolean = (
      (this.accessoryID !== undefined) &&
        patternRegex.test(this.accessoryID)
    );

    return isValidId;
  }

  private isValidAccessory(): boolean {
    switch (this.accessoryType) {
    // Accessories
    case AccessoryType.AirPurifier:
      return this.isErrorless(this.airPurifier, this.fieldNames.airPurifier!);
    case AccessoryType.Battery:
      this.accessoryIsStateful = true;
      return this.isErrorless(this.battery, this.fieldNames.battery!);
    case AccessoryType.Door:
      return this.isErrorless(this.door, this.fieldNames.door!);
    case AccessoryType.Doorbell:
      this.accessoryIsStateful = true;
      return this.isErrorless(this.doorbell, this.fieldNames.doorbell!);
    case AccessoryType.Fan:
      return this.isErrorless(this.fan, this.fieldNames.fan!);
    case AccessoryType.FilterMaintenance:
      this.accessoryIsStateful = true;
      return this.isErrorless(this.filterMaintenance, this.fieldNames.filterMaintenance!);
    case AccessoryType.GarageDoor:
      return this.isErrorless(this.garageDoor, this.fieldNames.garageDoor!);
    case AccessoryType.HeaterCooler:
      return this.isErrorless(this.heaterCooler, this.fieldNames.heaterCooler!);
    case AccessoryType.HumidifierDehumidifier:
      return this.isErrorless(this.humidifierDehumidifier, this.fieldNames.humidifierDehumidifier!);
    case AccessoryType.Lightbulb:
      return this.isErrorless(this.lightbulb, this.fieldNames.lightbulb!);
    case AccessoryType.Lock:
      return this.isErrorless(this.lock, this.fieldNames.lock!);
    case AccessoryType.Microphone:
      this.accessoryIsStateful = true;
      return this.isErrorless(this.microphone, this.fieldNames.microphone!);
    case AccessoryType.SecuritySystem:
      return this.isErrorless(this.securitySystem, this.fieldNames.securitySystem!);
    case AccessoryType.Speaker:
      this.category = Categories.SPEAKER;
      return this.isErrorless(this.speaker, this.fieldNames.speaker!);
    case AccessoryType.Switch:
      return this.isErrorlessSwitch(this.switch, this.fieldNames.switch!);
    case AccessoryType.Television:
      this.category = Categories.TELEVISION;
      return this.isErrorless(this.television, this.fieldNames.television!);
    case AccessoryType.Valve:
      return this.isErrorless(this.valve, this.fieldNames.valve!);
    case AccessoryType.Window:
      return this.isErrorless(this.window, this.fieldNames.window!);
    case AccessoryType.WindowCovering:
      return this.isErrorless(this.windowCovering, this.fieldNames.windowCovering!);
    // Sensors
    case AccessoryType.SensorBinary:
      return this.isErrorlessBinarySensor(this.sensor, this.fieldNames.sensor!);
    case AccessoryType.SensorMeasurement:
      return this.isErrorlessMeasurementSensor(this.measurement, this.fieldNames.measurement!);
    }

    return false;
  };

  /**
   * Accessory validation
   */

  private isErrorless(accessory: Validatable, prefix: string): boolean {
    let isValid: boolean = false;
    let errorFields: string[] = [ prefix ];

    if (accessory !== undefined) {
      [isValid, errorFields] = accessory.isValid(prefix);
    }

    this.errorFields.push(...errorFields);

    return (
      isValid
    );
  };

  private isErrorlessBinarySensor(accessory: Validatable, prefix: string): boolean {
    let isValidSensor: boolean = false;
    let sensorErrorFields: string[] = [ prefix ];
     
    if (accessory !== undefined) {
      [isValidSensor, sensorErrorFields] = accessory.isValid(prefix);
    }

    this.errorFields.push(...sensorErrorFields);

    // Validate SensorTrigger
    let isValidTrigger: boolean = false;
    let triggerErrorFields: string[] = ['Trigger'];

    if (this.sensor !== undefined) {
      [isValidTrigger, triggerErrorFields] = this.isValidTrigger();
    }

    this.errorFields.push(...triggerErrorFields);

    return (
      isValidSensor &&
      isValidTrigger
    );
  };

  private isErrorlessMeasurementSensor(accessory: Validatable, prefix: string): boolean {
    let isValidSensor: boolean = false;
    let sensorErrorFields: string[] = [ prefix ];
     
    if (accessory !== undefined) {
      [isValidSensor, sensorErrorFields] = accessory.isValid(prefix);
    }

    this.errorFields.push(...sensorErrorFields);

    return (
      isValidSensor
    );
  };

  private isErrorlessSwitch(accessory: Validatable, prefix: string): boolean {
    let isValidSwitch: boolean = false;
    let switchErrorFields: string[] = [ prefix ];

    if (accessory !== undefined) {
      [isValidSwitch, switchErrorFields] = accessory.isValid(prefix);
    }

    this.errorFields.push(...switchErrorFields);

    // Validate ResetTimer
    let isValidResetTimer: boolean = false;
    let resetTimerErrorFields: string[] = [this.fieldNames.resetTimer!];

    [isValidResetTimer, resetTimerErrorFields] = this.isErrorlessResetTimer(this.resetTimer, this.fieldNames.resetTimer!);

    this.errorFields.push(...resetTimerErrorFields);

    // Validate CompanionSensor
    let isValidCompanionSensor: boolean = false;
    let companionSensorErrorFields: string[] = [this.fieldNames.companionSensor!];

    [isValidCompanionSensor, companionSensorErrorFields] = this.isValidCompanionSensor(this.companionSensor, this.fieldNames.companionSensor!);

    this.errorFields.push(...companionSensorErrorFields);

    return (
      isValidSwitch &&
      isValidResetTimer &&
      isValidCompanionSensor
    );
  };

  /**
   * Decoration validations
   */

  // Validate if accessory has reset timer - default true
  private isErrorlessResetTimer(accessory: Validatable, prefix: string): [boolean, string[]] {
    if (this.switch !== undefined && this.switch.hasResetTimer) {
      let isValid: boolean;
      let errorFields: string[];

      if (accessory === undefined) {
        return [false, []];
      }

      // eslint-disable-next-line prefer-const
      [isValid, errorFields] = accessory.isValid(prefix);
      return [isValid, errorFields];
    }

    return [true, []];
  }

  // Validate if accessory has companion sensor - default true
  private isValidCompanionSensor(accessory: Validatable, prefix: string): [boolean, string[]] {
    if (this.switch !== undefined && this.switch.hasCompanionSensor) {
      let isValid: boolean;
      let errorFields: string[];

      if (accessory === undefined) {
        return [false, []];
      }

      // eslint-disable-next-line prefer-const
      [isValid, errorFields] = accessory.isValid(prefix);
      return [isValid, errorFields];
    }

    return [true, []];
  }

  private isValidTrigger(): [boolean, string[]] {
    if (this.sensor.trigger !== undefined) {
      let isValid: boolean;
      let errorFields: string[];

      switch (this.sensor.trigger) {
      case TriggerType.Cron:
        if (this.cronTrigger === undefined) {
          return [false, [this.fieldNames.cronTrigger!]];
        }

        [isValid, errorFields] = this.cronTrigger.isValid(this.fieldNames.cronTrigger!);
        break;
      case TriggerType.Ping:
        if (this.pingTrigger === undefined) {
          return [false, [this.fieldNames.pingTrigger!]];
        }

        [isValid, errorFields] = this.pingTrigger.isValid(this.fieldNames.pingTrigger!);
        break;
      case TriggerType.Startup:
        if (this.startupTrigger === undefined) {
          return [false, [this.fieldNames.startupTrigger!]];
        }

        [isValid, errorFields] = this.startupTrigger.isValid(this.fieldNames.startupTrigger!);
        break;
      case TriggerType.SunEvents:
        if (this.sunEventsTrigger === undefined) {
          return [false, [this.fieldNames.sunEventsTrigger!]];
        }

        [isValid, errorFields] = this.sunEventsTrigger.isValid(this.fieldNames.sunEventsTrigger!);
        break;
      case TriggerType.Webhook:
        // This can be undefined, as it is only a checkbox, so just create it here for now
        this.webhookTrigger = (this.webhookTrigger === undefined ? new WebhookTriggerConfiguration() : this.webhookTrigger);

        if (this.webhookTrigger === undefined) {
          return [false, [this.fieldNames.webhookTrigger!]];
        }

        [isValid, errorFields] = this.webhookTrigger.isValid(this.fieldNames.webhookTrigger!);
        break;
      case TriggerType.IkeaMatterStock:
        if (this.ikeaMatterStockTrigger === undefined) {
          return [false, [this.fieldNames.ikeaMatterStockTrigger!]];
        }

        [isValid, errorFields] = this.ikeaMatterStockTrigger.isValid(this.fieldNames.ikeaMatterStockTrigger!);
        break;
      default:
        return [false, ['trigger']];
      }

      return [isValid, errorFields];
    }

    return [false, ['sensorTrigger']];
  }
}
