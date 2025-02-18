/* eslint-disable curly */

import { CompanionSensorConfiguration } from './configurationCompanionSensor.js';
import { CronTriggerConfiguration } from './configurationCronTrigger.js';
import { DoorbellConfiguration } from './configurationDoorbell.js';
import { FanConfiguration } from './configurationFan.js';
import { GarageDoorConfiguration } from './configurationGarageDoor.js';
import { LightbulbConfiguration } from './configurationLightbulb.js';
import { LockConfiguration } from './configurationLock.js';
import { PingTriggerConfiguration } from './configurationPingTrigger.js';
import { SecuritySystemConfiguration } from './configurationSecuritySystem.js';
import { SunEventsTriggerConfiguration } from './configurationSunEventsTrigger.js';
import { TimerConfiguration } from './configurationTimer.js';

import { Type } from 'typeserializer';
import { ValveConfiguration } from './configurationValve.js';
import { WindowCoveringConfiguration } from './configurationWindowCovering.js';
import { SensorConfiguration } from './configurationSensor.js';

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

  // Doorbell
  @Type(DoorbellConfiguration)
    doorbell!: DoorbellConfiguration;

  // Fan
  @Type(FanConfiguration)
    fan!: FanConfiguration;

  // Garage Door
  @Type(GarageDoorConfiguration)
    garageDoor!: GarageDoorConfiguration;

  // Lightbulb
  @Type(LightbulbConfiguration)
    lightbulb!: LightbulbConfiguration;

  // Lock
  @Type(LockConfiguration)
    lock!: LockConfiguration;

  // SecuritySystem
  @Type(SecuritySystemConfiguration)
    securitySystem!: SecuritySystemConfiguration;

  // Switch
  switchDefaultState!: string;

  // Valve
  @Type(ValveConfiguration)
    valve!: ValveConfiguration;

  // Window Covering
  @Type(WindowCoveringConfiguration)
    windowCovering!: WindowCoveringConfiguration;

  // Reset timer
  @Type(TimerConfiguration)
    resetTimer!: TimerConfiguration;

  // Companion Sensor
  @Type(CompanionSensorConfiguration)
    companionSensor!: CompanionSensorConfiguration;

  @Type(SensorConfiguration)
    sensor!: SensorConfiguration;

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
      case 'securitysystem':
        return this.isValidSecuritySystem();
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
    let isValidDoorbell: boolean = false;
    let doorbellErrorFields: string[] = [ DoorbellConfiguration.prefix ];

    if (this.doorbell !== undefined) {
      [isValidDoorbell, doorbellErrorFields] = this.doorbell.isValid();
    }

    this.errorFields.push(...doorbellErrorFields);

    return (
      isValidDoorbell
    );
  };

  private isValidFan(): boolean {
    let isValidFan: boolean = false;
    let fanErrorFields: string[] = [ FanConfiguration.prefix ];
     
    if (this.fan !== undefined) {
      [isValidFan, fanErrorFields] = this.fan.isValid();
    }

    this.errorFields.push(...fanErrorFields);

    return (
      isValidFan
    );
  }

  private isValidGarageDoor(): boolean {
    let isValidGarageDoor: boolean = false;
    let garageDoorErrorFields: string[] = [ GarageDoorConfiguration.prefix ];

    if (this.garageDoor !== undefined) {
      [isValidGarageDoor, garageDoorErrorFields] = this.garageDoor.isValid();
    }

    this.errorFields.push(...garageDoorErrorFields);

    return (
      isValidGarageDoor
    );
  };

  private isValidLighbulb(): boolean {
    let isValidLightbulb: boolean = false;
    let lightbulbErrorFields: string[] = [ LightbulbConfiguration.prefix ];

    if (this.lightbulb !== undefined) {
      [isValidLightbulb, lightbulbErrorFields] = this.lightbulb.isValid();
    }

    this.errorFields.push(...lightbulbErrorFields);

    return (
      isValidLightbulb
    );
  }

  private isValidLock(): boolean {
    let isValidLock: boolean = false;
    let lockErrorFields: string[] = [ LockConfiguration.prefix ];
     
    if (this.lock !== undefined) {
      [isValidLock, lockErrorFields] = this.lock.isValid();
    }

    this.errorFields.push(...lockErrorFields);

    return (
      isValidLock
    );
  };

  private isValidSecuritySystem(): boolean {
    let isValidSecuritySystem: boolean = false;
    let securitySystemErrorFields: string[] = [ SecuritySystemConfiguration.prefix ];
     
    if (this.securitySystem !== undefined) {
      [isValidSecuritySystem, securitySystemErrorFields] = this.securitySystem.isValid();
    }

    this.errorFields.push(...securitySystemErrorFields);

    return (
      isValidSecuritySystem
    );
  }

  private isValidSensor(): boolean {
    let isValidSensor: boolean = false;
    let sensorErrorFields: string[] = [ SensorConfiguration.prefix ];
     
    if (this.sensor !== undefined) {
      [isValidSensor, sensorErrorFields] = this.sensor.isValid();
    }

    this.errorFields.push(...sensorErrorFields);

    // Validate SensorTrigger
    let isValidTrigger: boolean = false;
    let triggerErrorFields: string[] = ['xTrigger'];

    if (this.sensor !== undefined) {
      [isValidTrigger, triggerErrorFields] = this.isValidTrigger();
    }

    this.errorFields.push(...triggerErrorFields);

    return (
      isValidSensor &&
      isValidTrigger
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

  private isValidValve(): boolean {
    let isValidValve: boolean = false;
    let valveErrorFields: string[] = [ ValveConfiguration.prefix ];
     
    if (this.valve !== undefined) {
      [isValidValve, valveErrorFields] = this.valve.isValid();
    }

    this.errorFields.push(...valveErrorFields);

    return (
      isValidValve
    );
  }

  private isValidWindowCovering(): boolean {
    let isValidWindowCovering: boolean = false;
    let windowCoveringErrorFields: string[] = [ WindowCoveringConfiguration.prefix ];
     
    if (this.windowCovering !== undefined) {
      [isValidWindowCovering, windowCoveringErrorFields] = this.windowCovering.isValid();
    }

    this.errorFields.push(...windowCoveringErrorFields);

    return (
      isValidWindowCovering
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

  private isValidTrigger(): [boolean, string[]] {
    if (this.sensor.trigger !== undefined) {
      let isValidTrigger: boolean;
      let errorFields: string[];

      switch (this.sensor.trigger) {
      case 'cron':
        if (this.cronTrigger === undefined) {
          return [false, ['cronTrigger']];
        }

        [isValidTrigger, errorFields] = this.cronTrigger.isValid();
        break;
      case 'ping':
        if (this.pingTrigger === undefined) {
          return [false, ['pingTrigger']];
        }

        [isValidTrigger, errorFields] = this.pingTrigger.isValid();
        break;
      case 'sunevents':
        if (this.sunEventsTrigger === undefined) {
          return [false, ['sunEventsTrigger']];
        }

        [isValidTrigger, errorFields] = this.sunEventsTrigger.isValid();
        break;
      default:
        return [false, ['unknownTrigger']];
      }

      return [isValidTrigger, errorFields];
    }

    return [false, ['sensorTrigger']];
  }
}
