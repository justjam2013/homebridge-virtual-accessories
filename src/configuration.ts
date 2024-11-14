import { Logging } from 'homebridge';

import { deserialize, Type } from 'typeserializer';
import 'reflect-metadata';

export class Configuration {

  private log: Logging;

  constructor(
    log: Logging,
  ) {
    this.log = log;
  }

  deserializeConfig(config: string | object): AccessoryConfiguration | undefined {
    let accessoryConfig: AccessoryConfiguration | undefined;

    const json: string = (typeof config === 'object') ? JSON.stringify(config) : <string>config;
    try {
      accessoryConfig = deserialize(json, AccessoryConfiguration);
    } catch (error) {
      this.log.error(`[Configuration] Error: ${JSON.stringify(error)}`);
    }

    return accessoryConfig;
  }
}

export class TimerConfiguration {
  durationIsRandom: boolean = false;
  duration!: number;
  durationRandomMin!: number;
  durationRandomMax!: number;
  units!: string;
  isResettable: boolean = false;

  isValid(): boolean {
    const validUnits: boolean = (this.units !== undefined);
    const validDuration: boolean = (
      this.durationIsRandom === false ?
        (
          (this.duration !== undefined) &&
          (this.duration >= 0)
        ) :
        (
          (this.durationRandomMin !== undefined && this.durationRandomMax !== undefined) &&
          (this.durationRandomMin >= 0 && this.durationRandomMax >= 0) &&
          (this.durationRandomMin < this.durationRandomMax)
        )
    );

    return (validUnits && validDuration);
  }
}

export class CompanionSensorConfiguration {
  name!: string;
  type!: string;

  isValid(): boolean {
    const validName: boolean = (this.name !== undefined);
    const validType: boolean = (this.type !== undefined);

    return (validName && validType);
  }
}

export class PingTriggerConfiguration {
  host!: string;
  failureRetryCount!: number;
  isDisabled: boolean = false;

  isValid(): boolean {
    const validHost: boolean = (this.host !== undefined);
    const validFailureRetryCount: boolean = (this.failureRetryCount !== undefined);

    return (validHost && validFailureRetryCount);
  }
}

export class CronTriggerConfiguration {
  pattern!: string;
  zoneId!: string;
  startDateTime!: string;
  endDateTime!: string;
  isDisabled: boolean = false;

  isValid(): boolean {
    const validPattern: boolean = (this.pattern !== undefined);
    const validExecutionRangeDateTime: boolean = (
      (this.startDateTime === undefined && this.endDateTime === undefined) ||
      (this.startDateTime !== undefined && this.endDateTime !== undefined)
    );
    // Add start date before end date validation

    return (validPattern && validExecutionRangeDateTime);
  }
}

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

  isValid(): boolean {
    const isValidAccessoryID: boolean = (this.accessoryID !== undefined);
    const isValidAccessoryName: boolean = (this.accessoryName !== undefined);
    const isValidAccessoryType: boolean = (this.accessoryType !== undefined);

    const isValidAccessoryState: boolean = (
      (!this.accessoryIsStateful && !this.accessoryHasResetTimer) ||
      (this.accessoryIsStateful || this.accessoryHasResetTimer)
    );

    const isValidAccessory: boolean = this.isValidAccessory(isValidAccessoryType);

    return (isValidAccessoryID &&
      isValidAccessoryName &&
      isValidAccessoryType &&
      isValidAccessoryState &&
      isValidAccessory);
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

    return (isValidDoorbellVolume);
  };

  private isValidGarageDoor(): boolean {
    const isValidGarageDoorDefaultState: boolean = (this.garageDoorDefaultState !== undefined);

    return (isValidGarageDoorDefaultState);
  };

  private isValidLock(): boolean {
    const isValidLockDefaultState: boolean = (this.lockDefaultState !== undefined);
    const isValidLockHardwareFinish: boolean = (this.lockHardwareFinish !== undefined);

    return (isValidLockDefaultState &&
      isValidLockHardwareFinish);
  };

  private isValidSensor(): boolean {
    const isValidSensorType: boolean = (this.sensorType !== undefined);
    const isValidSensorTrigger: boolean = (this.sensorTrigger !== undefined);
    const isValidTrigger = this.isValidTrigger(isValidSensorTrigger);

    return (isValidSensorType &&
      isValidSensorTrigger &&
      isValidTrigger);
  };

  private isValidSwitch(): boolean {
    const isValidSwitchDefaultState: boolean = (this.switchDefaultState !== undefined);

    const isValidResetTimer: boolean = this.isValidResetTimer();
    const isValidCompanionSensor: boolean = this.isValidCompanionSensor();

    return (isValidSwitchDefaultState &&
      isValidResetTimer &&
      isValidCompanionSensor);
  };

  /**
   * Adornment validation
   */

  // Validate if accessory has reset timer - default true
  private isValidResetTimer(): boolean {
    if (this.accessoryHasResetTimer) {
      const validResetTimer: boolean =
        (this.resetTimer !== undefined) &&
        this.resetTimer.isValid();

      return validResetTimer;
    }

    return true;
  }

  // Validate if accessory has companion sensor - default true
  private isValidCompanionSensor(): boolean {
    if (this.accessoryHasResetTimer) {
      const validCompanionSensor: boolean =
        (this.resetTimer !== undefined) &&
        this.resetTimer.isValid();

      return validCompanionSensor;
    }

    return true;
  }

  private isValidTrigger(isValidSensorTrigger: boolean): boolean {
    if (isValidSensorTrigger) {
      switch (this.sensorTrigger) {
      case 'cron':
        return (
          (this.cronTrigger !== undefined) &&
          this.cronTrigger.isValid()
        );
      case 'ping':
        return (
          (this.pingTrigger !== undefined) &&
          this.pingTrigger.isValid()
        );
      default:
        return false;
      }
    }

    return false;
  }
}
