/* eslint-disable curly */

import { CompanionSensorConfiguration } from './configurationCompanionSensor.js';
import { CronTriggerConfiguration } from './configurationCronTrigger.js';
import { FanConfiguration } from './configurationFan.js';
import { LightbulbConfiguration } from './configurationLightbulb.js';
import { PingTriggerConfiguration } from './configurationPingTrigger.js';
import { SunEventsTriggerConfiguration } from './configurationSunEventsTrigger.js';
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

  // Fan
  @Type(FanConfiguration)
    fan!: FanConfiguration;

  // Garage Door
  garageDoorDefaultState!: string;

  // Doorbell
  doorbellVolume!: number;

  // Lightbulb
  @Type(LightbulbConfiguration)
    lightbulb!: LightbulbConfiguration;

  // Valve
  valveType!: string;
  valveDuration!: number;

  // Window Covering
  windowCoveringDefaultState!: string;

  //
  transitionDuration!: number;

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

  @Type(SunEventsTriggerConfiguration)
    sunEventsTrigger!: SunEventsTriggerConfiguration;

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
      case 'fan':
        return this.isValidFan();
      case 'garagedoor':
        return this.isValidGarageDoor();
      case 'lightbulb':
        return this.isValidLighbulb();
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

  private isValidFan(): boolean {
    let isValidFan: boolean;
    let fanErrorFields: string[];
    // eslint-disable-next-line prefer-const
    [isValidFan, fanErrorFields] = this.fan.isValid();
    if (!isValidFan && fanErrorFields.length === 0) {
      this.errorFields.push('Fan');
    } else {
      this.errorFields.push(...fanErrorFields);
    }

    return (
      isValidFan
    );
  }

  private isValidGarageDoor(): boolean {
    const isValidGarageDoorDefaultState: boolean = (this.garageDoorDefaultState !== undefined);

    // Store fields failing validation
    if (!isValidGarageDoorDefaultState) this.errorFields.push('garageDoorDefaultState');

    return (
      isValidGarageDoorDefaultState
    );
  };

  private isValidLighbulb(): boolean {
    let isValidLightbulb: boolean;
    let lightbulbErrorFields: string[];
    // eslint-disable-next-line prefer-const
    [isValidLightbulb, lightbulbErrorFields] = this.lightbulb.isValid();
    if (!isValidLightbulb && lightbulbErrorFields.length === 0) {
      this.errorFields.push('Lightbulb');
    } else {
      this.errorFields.push(...lightbulbErrorFields);
    }

    return (
      isValidLightbulb
    );
  }

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

    // Store fields failing validation
    if (!isValidSensorType) this.errorFields.push('sensorType');

    // Validate SensorTrigger
    let isValidSensorTrigger: boolean;
    let sensorTriggerErrorFields: string[];
    // eslint-disable-next-line prefer-const
    [isValidSensorTrigger, sensorTriggerErrorFields] = this.isValidSensorTrigger();
    if (!isValidSensorTrigger && sensorTriggerErrorFields.length === 0) {
      this.errorFields.push(this.sensorTrigger + 'Trigger');
    } else {
      this.errorFields.push(...sensorTriggerErrorFields);
    }

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
    const isValidTransitionDuration: boolean = (this.transitionDuration !== undefined);

    // Store fields failing validation
    if (!isValidWindowCoveringDefaultState) this.errorFields.push('windowCoveringDefaultState');
    if (!isValidTransitionDuration) this.errorFields.push('transitionDuration');

    return (
      isValidWindowCoveringDefaultState &&
      isValidTransitionDuration
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
      case 'sunevents':
        if (this.sunEventsTrigger === undefined) {
          return [false, []];
        }

        [isValidTrigger, errorFields] = this.sunEventsTrigger.isValid();
        break;
      default:
        return [false, []];
      }

      return [isValidTrigger, errorFields];
    }

    return [false, ['sensorTrigger']];
  }
}
