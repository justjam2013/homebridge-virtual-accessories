import { CharacteristicValue, PlatformAccessory, Units } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

import { AccessoryFactory } from '../accessoryFactory.js';
import { AccessoryNotAllowedError, NotCompanionError } from '../errors.js';
import { DurationConfiguration } from '../configuration/configurationDuration.js';
import { DynamicAlarmConfiguration } from '../configuration/extendedAccessories/configurationDynamicAlarm.js';
import { Lightbulb } from './virtualAccessoryLightbulb.js';
import { Sensor } from '../sensors/virtualSensor.js';
import { Timer } from '../timer.js';
import { TimerConfiguration } from '../configuration/configurationTimer.js';
import { Utils } from '../utils.js';

import { Cron } from 'croner';
import { Duration } from '@js-joda/core';

/**
 * AbstractSwitch - Accessory implementation
 */
export abstract class AbstractSwitch extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Switch';

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  private readonly stateStorageKey: string = 'SwitchState';
  private readonly timerStartTimeStorageKey: string = 'TimerStartTime';
  private readonly timerDurationStorageKey: string = 'TimerDuration';
  private readonly timerIsRunningStorageKey: string = 'TimerIsRunning';

  private readonly alarmSliderMinutesStorageKey: string = 'AlarmSliderMinutes';
  private readonly alarmSliderHourStorageKey: string = 'AlarmSliderHour';

  private durationTimer?: Timer;

  private companionSensor?: Sensor;

  private isCompanionSwitch: boolean = false;
  private companionSwitchPostfix: string = '-switch';

  private isDynamicAlarm: boolean = false;
  private alarmMinutesSlider?: Lightbulb;
  private alarmHourSlider?: Lightbulb;
  private alarmCronJob?: Cron;

  private states = {
    SwitchState: Switch.OFF,
    SensorState: Sensor.NORMAL,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSwitchName?: string,
  ) {
    super(platform, accessory);

    if (companionSwitchName !== undefined) {
      this.isCompanionSwitch = true;
    }

    // If this is a companion switch to a doorbell, it will be a plain Switch
    if (!this.isCompanionSwitch) {

      // First configure the device based on the accessory details
      this.defaultState = this.accessoryConfiguration.switch.defaultState === 'on' ? Switch.ON : Switch.OFF;

      this.states.SwitchState = this.defaultState;
      this.states.SensorState = Sensor.NORMAL;

      if (this.accessoryConfiguration.switch.hasResetTimer) {
        this.setupResetTimer(this.accessoryConfiguration.resetTimer);
      }

      if (this instanceof DynamicAlarm) {
        this.setupDynamicAlarm(this.accessoryConfiguration.dynamicAlarm);
      }

      // If the accessory is stateful retrieve stored state
      if (this.accessoryConfiguration.accessoryIsStateful) {
        this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Switch is stateful`);

        const accessoryState: string = this.loadAccessoryState(this.storagePath);
        const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;

        if (cachedState !== undefined) {
          this.states.SwitchState = cachedState;
          this.states.SensorState = this.determineSensorState();
        }

        if (this.accessoryConfiguration.switch.hasResetTimer) {
          this.restoreResetTimer(accessoryState);
        }

        if (this instanceof DynamicAlarm) {
          this.restoreDynamicAlarm(accessoryState);
        }
      }
    }

    if (!this.isCompanionSwitch) {
      this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

      this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);
    } else {
      this.service = this.accessory.getService(companionSwitchName!) ||
                     this.accessory.addService(this.platform.Service.Switch, companionSwitchName, accessory.UUID + this.companionSwitchPostfix);

      this.service.setCharacteristic(this.platform.Characteristic.Name, companionSwitchName!);
    }

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Switch Current State: ${Switch.getStateName(this.states.SwitchState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.states.SwitchState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same subtype id.)
     */

    if (!this.isCompanionSwitch) {
      // Create sensor service
      if (this.accessoryConfiguration.switch.hasCompanionSensor) {
        this.setupCompanionSensor();
      }

      if (this instanceof DynamicAlarm) {
        this.setupAlarmSliders();
      }
    }
  }

  // Handlers

  async setOn(value: CharacteristicValue) {
    this.states.SwitchState = value as boolean;

    if (this.accessoryConfiguration.switch.hasResetTimer) {
      // switch is reset: turn off timer
      if (this.states.SwitchState === this.defaultState) {
        this.durationTimer!.stop();
      } else {
        this.durationTimer!.start(
          () => {
            this.service!.setCharacteristic(this.platform.Characteristic.On, this.defaultState);
          },
        );
      }
    }

    this.storeState();

    // eslint-disable-next-line max-len
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${Switch.getStateName(this.states.SwitchState)}`, this.accessoryConfiguration.switch.muteLogging);

    if (this instanceof Switch) {
      if (this.accessoryConfiguration.switch.hasCompanionSensor) {
        this.states.SensorState = this.determineSensorState();

      this.companionSensor!.triggerCompanionSensorState(this.states.SensorState, this, this.accessoryConfiguration.switch.muteLogging);
      }
    }

    if (this instanceof DynamicAlarm) {
      if (this.states.SwitchState === Switch.ON) {
        this.alarmCronJob?.resume();
      } else {
        this.alarmCronJob?.pause();
      }
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    const switchState = this.states.SwitchState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${Switch.getStateName(switchState)}`);

    return switchState;
  }

  public setCompanionSwitchState(value: boolean, accessory: Accessory) {
    if (!this.isCompanionSwitch) {
      throw new NotCompanionError(`${this.accessoryConfiguration.accessoryName} is not a companion switch`);
    } else if (accessory.accessory.UUID !== this.accessory.UUID) {
      throw new AccessoryNotAllowedError(`Switch ${accessory.accessoryConfiguration.accessoryName} is not allowed to change the state of this switch`);
    }

    this.states.SwitchState = value;
  }

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.states.SwitchState,
    };

    if (this.accessoryConfiguration.switch.hasResetTimer) {
      const timerStartTime: string = this.durationTimer!.getStartTime().toString();
      const timerDuration: number = (this.durationTimer!.getRuntime() > 0) ? this.durationTimer!.getRuntime() : this.durationTimer!.getDefaultDuration();
      const timerIsRunning: boolean = this.durationTimer!.isTimerRunning();

      Object.assign(jsonState, { [this.timerStartTimeStorageKey]: timerStartTime });
      Object.assign(jsonState, { [this.timerDurationStorageKey]: timerDuration });
      Object.assign(jsonState, { [this.timerIsRunningStorageKey]: timerIsRunning });
    }

    if (this instanceof DynamicAlarm) {
      Object.assign(jsonState, { [this.alarmSliderMinutesStorageKey]: this.alarmMinutesSlider?.getBrightness() });
      Object.assign(jsonState, { [this.alarmSliderHourStorageKey]: this.alarmHourSlider?.getBrightness() });
    }

    const json = JSON.stringify(jsonState);

    return json;
  }

  protected abstract getAccessoryTypeName(): string;

  private determineSensorState(): number {
    let sensorState: number;

    if (this.defaultState === Switch.OFF) {
      sensorState = (this.states.SwitchState === Switch.OFF) ? Sensor.NORMAL : Sensor.TRIGGERED;
    } else {
      sensorState = (this.states.SwitchState === Switch.ON) ? Sensor.NORMAL : Sensor.TRIGGERED;
    }

    return sensorState;
  }

  private convertDurationToSeconds(duration: DurationConfiguration): number {
    const seconds: number = Utils.daysHoursMinutesSecondsToSeconds(duration.days, duration.hours, duration.minutes, duration.seconds);
    return seconds;
  }

  static getStateName(state: boolean): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Switch.ON: { stateName = 'ON'; break; }
    case Switch.OFF: { stateName = 'OFF'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }

  // Setup stuff

  private setupResetTimer(timerConfig: TimerConfiguration): void {
    const duration: number = timerConfig.durationIsRandom ?
      Math.floor(
        Math.random() *
        (this.convertDurationToSeconds(timerConfig.durationRandomMax) + 1 - this.convertDurationToSeconds(timerConfig.durationRandomMin)) +
        this.convertDurationToSeconds(timerConfig.durationRandomMin),
      ):
      this.convertDurationToSeconds(timerConfig.duration);
    this.durationTimer = new Timer(
      this.accessoryConfiguration.accessoryName,
      this.log,
      this.accessoryConfiguration.resetTimer.isResettable,
      duration,
    );
  }

  private setupDynamicAlarm(dynamicAlarmConfig: DynamicAlarmConfiguration): void {
    const minutes: number = dynamicAlarmConfig.minutes;
    const hour: number = dynamicAlarmConfig.getHour();

    const pattern: string = `${minutes} ${hour} * * *`;

    this.alarmCronJob = this.createAlarmCronJob(pattern);
  }

  private setupCompanionSensor(): void {
    this.companionSensor = AccessoryFactory.createVirtualCompanionSensor(
      this.platform, this.accessory, this.accessoryConfiguration.companionSensor.type, this.accessoryConfiguration.companionSensor.name);

    this.companionSensor!.triggerCompanionSensorState(this.states.SensorState, this, this.accessoryConfiguration.switch.muteLogging);
  }

  private setupAlarmSliders(): void {
    const alarmConfig: DynamicAlarmConfiguration = this.accessoryConfiguration.dynamicAlarm;    
    // Order hours, minutes
    this.alarmHourSlider = this.createSlider('Hour', alarmConfig.getHourMinValue(), alarmConfig.getHourMaxValue(), alarmConfig.getHour());
    // eslint-disable-next-line max-len
    this.alarmMinutesSlider = this.createSlider('Minutes', DynamicAlarmConfiguration.MINUTES_MIN_VALUE, DurationConfiguration.MINUTES_MAX_VALUE, alarmConfig.minutes);
  }

  private restoreRunningTimer(
    cachedTimerStartTime: string,
    cachedTimerDuration: number,
  ): void {
    // eslint-disable-next-line max-len
    const elapsedTimeSinceTimerStart: number = Math.trunc(Duration.between(Utils.zonedDateTime(cachedTimerStartTime), Utils.now()).toMillis() / 1000); // seconds
    const timeDifferential: number = (cachedTimerDuration - elapsedTimeSinceTimerStart);

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Elapsed Time Since Timer Start: ${elapsedTimeSinceTimerStart}`);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Time Differential: ${timeDifferential}`);
  
    // If the timer is expired, set timer to 1 second to issue trigger switch off
    const remainingTimerDuration: number = (timeDifferential <= 0) ? 1 : timeDifferential;

    if (remainingTimerDuration === 1) {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Timer expired. Setting timer to 1 second to trigger switch off`);
    } else {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Timer for remaining duration (${remainingTimerDuration} seconds)`);
    }

    this.durationTimer!.debugCountdown();
    this.durationTimer!.start(
      () => {
        this.service!.setCharacteristic(this.platform.Characteristic.On, this.defaultState);
      },
      remainingTimerDuration,
    );
  }

  private createSlider(
    companionName: string,
    minimumValue: number,
    maximumValue: number,
    value: number,
  ): Lightbulb | undefined {
    const slider: Lightbulb | undefined = AccessoryFactory.createVirtualCompanionLightbulb(
      this.platform, this.accessory, this.accessoryConfiguration.accessoryName + ' ' + companionName, Lightbulb.ON, value);

    const n = maximumValue - minimumValue;
    const validValues = new Array(n).fill(null).map((_, i) => i + minimumValue);

    slider?.service?.getCharacteristic(this.platform.Characteristic.Brightness)
      .setProps({
        minValue: minimumValue,
        maxValue: maximumValue,
        minStep: 1,
        validValueRanges: [minimumValue, maximumValue],
        validValues: validValues,
        unit: Units.SECONDS,
      })
      .onSet(Utils.debounce(async (value: number) => {
        const maxValue: number | undefined = slider.service?.getCharacteristic(this.platform.Characteristic.Brightness).props.maxValue;
        
        const brightness = (maxValue !== undefined && value > maxValue) ? maxValue : value;
        // call original handler
        slider.setBrightness(brightness);
        this.storeState();

        if (this instanceof Switch) {
          //
        }

        // update alarm
        if (this instanceof DynamicAlarm) {
          this.alarmCronJob?.stop();

          const minutes: number = (await this.alarmMinutesSlider?.getBrightness())! as number;
          const hour: number = (await this.alarmHourSlider?.getBrightness())! as number;
          const pattern: string = `${minutes} ${hour} * * *`;

          this.alarmCronJob = this.createAlarmCronJob(pattern);
        }
      }));

    return slider;
  }

  private createAlarmCronJob(
    pattern: string,
    resetDelayMillis?: number,
  ): Cron {
    const resetDelay: number = 3 * 1000;     // 3 second reset delay

    const cronJob: Cron = new Cron(
      pattern,
      {
        name: `Alarm Cron Job  (${this.accessoryConfiguration.accessoryName})`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      (async () => {
        this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Matched cron pattern '${pattern}'. Triggering sensor`);

        this.companionSensor!.triggerCompanionSensorState(Sensor.TRIGGERED, this, this.accessoryConfiguration.switch.muteLogging);
        await Utils.delay(resetDelayMillis ? resetDelayMillis : resetDelay);
        this.companionSensor!.triggerCompanionSensorState(Sensor.NORMAL, this, this.accessoryConfiguration.switch.muteLogging);
      }),
    );
    if (this.states.SwitchState === Switch.OFF) {
      cronJob.pause();
    }

    return cronJob;
  }

  // Restore state

  private restoreResetTimer(
    accessoryState: string,
  ): void {
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Switch has reset timer`);

    const cachedTimerStartTime = accessoryState[this.timerStartTimeStorageKey] as string;
    const cachedTimerDuration = accessoryState[this.timerDurationStorageKey] as number;
    const cachedTimerIsRunning = accessoryState[this.timerIsRunningStorageKey] as boolean;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Start Time: ${cachedTimerStartTime}`);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Duration: ${cachedTimerDuration}`);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Is Running: ${cachedTimerIsRunning}`);

    // If the timer was running, calculate elapsed time and set timer for remaining duration
    if (cachedTimerIsRunning) {
      this.restoreRunningTimer(cachedTimerStartTime, cachedTimerDuration);
    }
  }

  private restoreDynamicAlarm(
    accessoryState: string,
  ): void {
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Is a Dynamic Alarm`);

    const cachedAlarmSliderMinutes = accessoryState[this.alarmSliderMinutesStorageKey] as number;
    const cachedAlarmSliderHour = accessoryState[this.alarmSliderHourStorageKey] as number;

    // Order hours, minutes
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Alarm Slider Hour: ${cachedAlarmSliderHour}`);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Alarm Slider Minutes: ${cachedAlarmSliderMinutes}`);

    this.alarmMinutesSlider?.setBrightness(cachedAlarmSliderMinutes);
    this.alarmHourSlider?.setBrightness(cachedAlarmSliderHour);
  }
}

/**
 * Switch - Accessory implementation
 */

export class Switch extends AbstractSwitch {

  static readonly ACCESSORY_TYPE_NAME: string = 'Switch';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSwitchName?: string,
  ) {
    super(platform, accessory, companionSwitchName);
  }

  protected getAccessoryTypeName(): string {
    return Switch.ACCESSORY_TYPE_NAME;
  }
}

/**
 * DynamicAlarm - Accessory implementation
 */

export class DynamicAlarm extends Switch {

  static readonly ACCESSORY_TYPE_NAME: string = 'DynamicAlarm';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);
  }

  protected getAccessoryTypeName(): string {
    return DynamicAlarm.ACCESSORY_TYPE_NAME;
  }
}