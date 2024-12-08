/* eslint-disable curly */

import { CompanionSensorConfiguration } from './configurationCompanionSensor.js';
import { CronTriggerConfiguration } from './configurationCronTrigger.js';
import { PingTriggerConfiguration } from './configurationPingTrigger.js';
import { TimerConfiguration } from './configurationTimer.js';

import { Type } from 'typeserializer';

/**
 * 
 */
export class AccessoryConfiguration {
  // Required
  accessoryID!: string;
  accessoryName!: string;
  accessoryType!: string;

  // Optional
  accessoryIsStateful: boolean = false;
  accessoryHasResetTimer: boolean = false;
  accessoryHasCompanionSensor: boolean = false;

  // Switch
  switchDefaultState!: string;

  // Lock required
  lockDefaultState!: string;
  lockHardwareFinish!: string;

  // Garage Door
  garageDoorDefaultState!: string;

  // Doorbell
  doorbellVolume!: number;

  // Valve
  valveType!: string;
  valveDuration!: number;

  // Window Covering
  windowCoveringDefaultState!: string;

  // Sensor
  sensorType!: string;
  sensorTrigger!: string;

  // Reset timer
  @Type(TimerConfiguration)
    resetTimer!: TimerConfiguration;

  // Companion Sensor
  @Type(CompanionSensorConfiguration)
    companionSensor!: CompanionSensorConfiguration;

  // Triggers
  @Type(PingTriggerConfiguration)
    pingTrigger!: PingTriggerConfiguration;
  @Type(CronTriggerConfiguration)
    cronTrigger!: CronTriggerConfiguration;

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidAccessoryID: boolean = (this.accessoryID !== undefined);
    const isValidAccessoryName: boolean = (this.accessoryName !== undefined);
    const isValidAccessoryType: boolean = (this.accessoryType !== undefined);

    // There can be only one!
    const isValidAccessoryState: boolean = (!(this.accessoryIsStateful && this.accessoryHasResetTimer));

    // Store fields failing validation
    if (!isValidAccessoryID) this.errorFields.push('accessoryID');
    if (!isValidAccessoryName) this.errorFields.push('accessoryName');
    if (!isValidAccessoryType) this.errorFields.push('accessoryType');
    if (!isValidAccessoryState) this.errorFields.push('accessoryIsStateful', 'accessoryHasResetTimer');

    const isValidAccessory: boolean = this.isValidAccessory(isValidAccessoryType);

    return [
      (isValidAccessoryID &&
        isValidAccessoryName &&
        isValidAccessoryType &&
        isValidAccessoryState &&
        isValidAccessory),
      this.errorFields,
    ];
  }

  private isValidAccessory(isValidAccessoryType: boolean): boolean {
    if (isValidAccessoryType) {
      switch (this.accessoryType) {
      case 'doorbell':
        return this.isValidDoorbell();
      case 'garagedoor':
        return this.isValidGarageDoor();
      case 'lock':
        return this.isValidLock();
      case 'sensor':
        return this.isValidSensor();
      case 'switch':
        return this.isValidSwitch();
      case 'valve':
        return this.isValidValve();
      case 'windowcovering':
        return this.isValidWindowCovering();
      default:
        return false;
      }
    }

    return false;
  };

  /**
   * Accessory validation
   */

  private isValidDoorbell(): boolean {
    const isValidDoorbellVolume: boolean = (
      (this.doorbellVolume !== undefined) &&
      (this.doorbellVolume >= 0 && this.doorbellVolume <= 100)
    );

    // Store fields failing validation
    if (!isValidDoorbellVolume) this.errorFields.push('doorbellVolume');

    return (
      isValidDoorbellVolume
    );
  };

  private isValidGarageDoor(): boolean {
    const isValidGarageDoorDefaultState: boolean = (this.garageDoorDefaultState !== undefined);

    // Store fields failing validation
    if (!isValidGarageDoorDefaultState) this.errorFields.push('garageDoorDefaultState');

    return (
      isValidGarageDoorDefaultState
    );
  };

  private isValidLock(): boolean {
    const isValidLockDefaultState: boolean = (this.lockDefaultState !== undefined);
    const isValidLockHardwareFinish: boolean = (this.lockHardwareFinish !== undefined);

    // Store fields failing validation
    if (!isValidLockDefaultState) this.errorFields.push('lockDefaultState');
    if (!isValidLockHardwareFinish) this.errorFields.push('lockHardwareFinish');

    return (
      isValidLockDefaultState &&
      isValidLockHardwareFinish
    );
  };

  private isValidSensor(): boolean {
    const isValidSensorType: boolean = (this.sensorType !== undefined);
    const isValidSensorTrigger: boolean = (this.sensorTrigger !== undefined);

    // Store fields failing validation
    if (!isValidSensorType) this.errorFields.push('sensorType');
    if (!isValidSensorTrigger) this.errorFields.push('sensorTrigger');

    // TODO: fix this validation of sensor trigger and reset timer

    // Validate SensorTrigger
    // this.isValidSensorTrigger();

    // Validate ResetTimer
    let isValidResetTimer: boolean;
    let triggerErrorFields: string[];
    // eslint-disable-next-line prefer-const
    [isValidResetTimer, triggerErrorFields] = this.isValidResetTimer();
    if (!isValidResetTimer && triggerErrorFields.length === 0) {
      this.errorFields.push(this.sensorTrigger + 'Trigger');
    } else {
      this.errorFields.push(...triggerErrorFields);
    }

    return (
      isValidSensorType &&
      isValidSensorTrigger &&
      isValidResetTimer
    );
  };

  private isValidSwitch(): boolean {
    const isValidSwitchDefaultState: boolean = (this.switchDefaultState !== undefined);

    // Store fields failing validation
    if (!isValidSwitchDefaultState) this.errorFields.push('switchDefaultState');

    // Validate ResetTimer
    let isValidResetTimer: boolean;
    let resetTimerErrorFields: string[];
    // eslint-disable-next-line prefer-const
    [isValidResetTimer, resetTimerErrorFields] = this.isValidResetTimer();
    if (!isValidResetTimer && resetTimerErrorFields.length === 0) {
      this.errorFields.push('resetTimer');
    } else {
      this.errorFields.push(...resetTimerErrorFields);
    }

    // Validate CompanionSensor
    let isValidCompanionSensor: boolean;
    let companionSensorErrorFields: string[];
    // eslint-disable-next-line prefer-const
    [isValidCompanionSensor, companionSensorErrorFields] = this.isValidCompanionSensor();
    if (!isValidCompanionSensor && companionSensorErrorFields.length === 0) {
      this.errorFields.push('companionSensor');
    } else {
      this.errorFields.push(...companionSensorErrorFields);
    }

    return (
      isValidSwitchDefaultState &&
      isValidResetTimer &&
      isValidCompanionSensor
    );
  };

  private isValidWindowCovering(): boolean {
    const isValidWindowCoveringDefaultState: boolean = (this.windowCoveringDefaultState !== undefined);

    // Store fields failing validation
    if (!isValidWindowCoveringDefaultState) this.errorFields.push('windowCoveringDefaultState');

    return (
      isValidWindowCoveringDefaultState
    );
  }

  private isValidValve(): boolean {
    const isValidValveType: boolean = (
      (this.valveType !== undefined) &&
      ['generic', 'irrigation', 'showerhead', 'waterfaucet'].includes(this.valveType)
    );
    const isValidValveDuration: boolean = (
      (this.valveDuration !== undefined) &&
      (this.valveDuration >= 0 && this.valveDuration <= 3600)
    );

    // Store fields failing validation
    if (!isValidValveType) this.errorFields.push('valveType');
    if (!isValidValveDuration) this.errorFields.push('valveDuration');

    return (
      isValidValveType &&
      isValidValveDuration
    );
  }

  /**
   * Adornment validation
   */

  // Validate if accessory has reset timer - default true
  private isValidResetTimer(): [boolean, string[]] {
    if (this.accessoryHasResetTimer) {
      let isValidResetTimer: boolean;
      let errorFields: string[];

      if (this.resetTimer === undefined) {
        return [false, []];
      }

      // eslint-disable-next-line prefer-const
      [isValidResetTimer, errorFields] = this.resetTimer.isValid();
      return [isValidResetTimer, errorFields];
    }

    return [true, []];
  }

  // Validate if accessory has companion sensor - default true
  private isValidCompanionSensor(): [boolean, string[]] {
    if (this.accessoryHasCompanionSensor) {
      let isValidCompanionSensor: boolean;
      let errorFields: string[];

      if (this.companionSensor === undefined) {
        return [false, []];
      }

      // eslint-disable-next-line prefer-const
      [isValidCompanionSensor, errorFields] = this.companionSensor.isValid();
      return [isValidCompanionSensor, errorFields];
    }

    return [true, []];
  }

  private isValidSensorTrigger(): [boolean, string[]] {
    if (this.sensorTrigger !== undefined) {
      let isValidTrigger: boolean;
      let errorFields: string[];

      switch (this.sensorTrigger) {
      case 'cron':
        if (this.cronTrigger === undefined) {
          return [false, []];
        }

        [isValidTrigger, errorFields] = this.cronTrigger.isValid();
        break;
      case 'ping':
        if (this.pingTrigger === undefined) {
          return [false, []];
        }

        [isValidTrigger, errorFields] = this.pingTrigger.isValid();
        break;
      default:
        return [false, []];
      }

      return [isValidTrigger, errorFields];
    }

    return [true, []];
  }
}
