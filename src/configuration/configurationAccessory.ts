/* eslint-disable curly */

import { Categories } from 'homebridge';

import { CompanionSensorConfiguration } from './configurationCompanionSensor.js';
import { DoorbellConfiguration } from './accessories/configurationDoorbell.js';
import { FanConfiguration } from './accessories/configurationFan.js';
import { GarageDoorConfiguration } from './accessories/configurationGarageDoor.js';
import { HeaterCoolerConfiguration } from './accessories/configurationHeaterCooler.js';
import { HumidifierDehumidifierConfiguration } from './accessories/configurationHumidifierDehumidifier.js';
import { LightbulbConfiguration } from './accessories/configurationLightbulb.js';
import { LockConfiguration } from './accessories/configurationLock.js';
import { SecuritySystemConfiguration } from './accessories/configurationSecuritySystem.js';
import { SensorConfiguration } from './configurationSensor.js';
import { SpeakerConfiguration } from './accessories/configurationSpeaker.js';
import { SwitchConfiguration } from './accessories/configurationSwitch.js';
import { TimerConfiguration } from './configurationTimer.js';
import { ValveConfiguration } from './accessories/configurationValve.js';
import { WindowCoveringConfiguration } from './accessories/configurationWindowCovering.js';

import { CronTriggerConfiguration } from './triggers/configurationCronTrigger.js';
import { PingTriggerConfiguration } from './triggers/configurationPingTrigger.js';
import { SunEventsTriggerConfiguration } from './triggers/configurationSunEventsTrigger.js';

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

  category?: Categories;

  // Doorbell
  @Type(DoorbellConfiguration)
    doorbell!: DoorbellConfiguration;

  // Fan
  @Type(FanConfiguration)
    fan!: FanConfiguration;

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

  // SecuritySystem
  @Type(SecuritySystemConfiguration)
    securitySystem!: SecuritySystemConfiguration;

  // Sensor
  @Type(SensorConfiguration)
    sensor!: SensorConfiguration;

  // Speaker
  @Type(SpeakerConfiguration)
    speaker!: SpeakerConfiguration;

  // Switch
  @Type(SwitchConfiguration)
    switch!: SwitchConfiguration;

  // Valve
  @Type(ValveConfiguration)
    valve!: ValveConfiguration;

  // Window Covering
  @Type(WindowCoveringConfiguration)
    windowCovering!: WindowCoveringConfiguration;

  // Switch decorations

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
    const isValidAccessoryID: boolean = (
      (this.accessoryID !== undefined) &&
      this.isValidId()
    );
    const isValidAccessoryName: boolean = (this.accessoryName !== undefined);
    const isValidAccessoryType: boolean = (
      (this.accessoryType !== undefined) &&
      this.isValidAccessory()
    );

    // Store fields failing validation
    if (!isValidAccessoryID) this.errorFields.push('accessoryID');
    if (!isValidAccessoryName) this.errorFields.push('accessoryName');
    if (!isValidAccessoryType) this.errorFields.push('accessoryType');

    return [
      (isValidAccessoryID &&
        isValidAccessoryName &&
        isValidAccessoryType),
      this.errorFields,
    ];
  }

  private isValidId(): boolean {
    const accessoryIdPattern = '^[A-Za-z0-9\\-]{5,}$';

    const patternRegex = new RegExp(accessoryIdPattern);
    const isValidId: boolean = (
      (this.accessoryID !== undefined) &&
        patternRegex.test(this.accessoryID)
    );

    return isValidId;
  }

  private isValidAccessory(): boolean {
    switch (this.accessoryType) {
    case 'doorbell':
      return this.isValidDoorbell();
    case 'fan':
      return this.isValidFan();
    case 'garagedoor':
      return this.isValidGarageDoor();
    case 'heatercooler':
      return this.isValidHeaterCooler();
    case 'humidifierdehumidifier':
      return this.isValidHumidifierDehumidifier();
    case 'lightbulb':
      return this.isValidLighbulb();
    case 'lock':
      return this.isValidLock();
    case 'securitysystem':
      return this.isValidSecuritySystem();
    case 'sensor':
      return this.isValidSensor();
    case 'speaker':
      this.category = Categories.SPEAKER;
      return this.isValidSpeaker();
    case 'switch':
      return this.isValidSwitch();
    case 'valve':
      return this.isValidValve();
    case 'windowcovering':
      return this.isValidWindowCovering();
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

  private isValidHeaterCooler(): boolean {
    let isValidHeaterCooler: boolean = false;
    let heaterCoolerErrorFields: string[] = [ HeaterCoolerConfiguration.prefix ];

    if (this.heaterCooler !== undefined) {
      [isValidHeaterCooler, heaterCoolerErrorFields] = this.heaterCooler.isValid();
    }

    this.errorFields.push(...heaterCoolerErrorFields);

    return (
      isValidHeaterCooler
    );
  };

  private isValidHumidifierDehumidifier(): boolean {
    let isValidHumidifierDehumidifier: boolean = false;
    let humidifierDehumidifierErrorFields: string[] = [ HumidifierDehumidifierConfiguration.prefix ];

    if (this.humidifierDehumidifier !== undefined) {
      [isValidHumidifierDehumidifier, humidifierDehumidifierErrorFields] = this.humidifierDehumidifier.isValid();
    }

    this.errorFields.push(...humidifierDehumidifierErrorFields);

    return (
      isValidHumidifierDehumidifier
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

  private isValidSpeaker(): boolean {
    let isValidSpeaker: boolean = false;
    let speakerErrorFields: string[] = [ SpeakerConfiguration.prefix ];

    if (this.speaker !== undefined) {
      [isValidSpeaker, speakerErrorFields] = this.speaker.isValid();
    }

    this.errorFields.push(...speakerErrorFields);

    return (
      isValidSpeaker
    );
  };

  private isValidSwitch(): boolean {
    let isValidSwitch: boolean = false;
    let switchErrorFields: string[] = [ SwitchConfiguration.prefix ];

    if (this.switch !== undefined) {
      [isValidSwitch, switchErrorFields] = this.switch.isValid();
    }

    this.errorFields.push(...switchErrorFields);

    // Validate ResetTimer
    let isValidResetTimer: boolean = false;
    let resetTimerErrorFields: string[] = ['resetTimer'];

    [isValidResetTimer, resetTimerErrorFields] = this.isValidResetTimer();

    this.errorFields.push(...resetTimerErrorFields);

    // Validate CompanionSensor
    let isValidCompanionSensor: boolean = false;
    let companionSensorErrorFields: string[] = ['companionSensor'];

    [isValidCompanionSensor, companionSensorErrorFields] = this.isValidCompanionSensor();

    this.errorFields.push(...companionSensorErrorFields);

    return (
      isValidSwitch &&
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
   * Decoration validations
   */

  // Validate if accessory has reset timer - default true
  private isValidResetTimer(): [boolean, string[]] {
    if (this.switch !== undefined && this.switch.hasResetTimer) {
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
    if (this.switch !== undefined && this.switch.hasCompanionSensor) {
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
