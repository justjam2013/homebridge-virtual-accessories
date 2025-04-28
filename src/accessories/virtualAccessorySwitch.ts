import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

import { AccessoryFactory } from '../accessoryFactory.js';
import { AccessoryNotAllowedError, NotCompanionError } from '../errors.js';
import { DurationConfiguration } from '../configuration/configurationDuration.js';
import { Lightbulb } from './virtualAccessoryLightbulb.js';
import { Sensor } from '../sensors/virtualSensor.js';
import { Timer } from '../timer.js';
import { TimerConfiguration } from '../configuration/configurationTimer.js';
import { Utils } from '../utils.js';

import { Duration } from '@js-joda/core';

/**
 * Switch - Accessory implementation
 */
export class Switch extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Switch';

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  private readonly stateStorageKey: string = 'SwitchState';
  private readonly timerStartTimeStorageKey: string = 'TimerStartTime';
  private readonly timerDurationStorageKey: string = 'TimerDuration';
  private readonly timerIsRunningStorageKey: string = 'TimerIsRunning';

  private readonly timerSliderSecondsStorageKey: string = 'TimerSliderSeconds';
  private readonly timerSliderMinutesStorageKey: string = 'TimerSliderMinutes';
  private readonly timerSliderHoursStorageKey: string = 'TimerSliderHours';
  private readonly timerSliderDaysStorageKey: string = 'TimerSliderDays';

  private durationTimer?: Timer;
  private timerSecondsSlider?: Lightbulb;
  private timerMinutesSlider?: Lightbulb;
  private timerHoursSlider?: Lightbulb;
  private timerDaysSlider?: Lightbulb;

  private companionSensor?: Sensor;

  private isCompanionSwitch: boolean = false;
  private companionSwitchPostfix: string = '-switch';

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
          this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Switch has reset timer`);

          if (this.accessoryConfiguration.resetTimer.isDynamic) {
            this.restoreTimerSliders(accessoryState);
          }

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
      if (this.accessoryConfiguration.switch.hasResetTimer && this.accessoryConfiguration.resetTimer.isDynamic) {
        this.setupResetTimerSliders();
      }

      // Create sensor service
      if (this.accessoryConfiguration.switch.hasCompanionSensor) {
        this.setupCompanionSensor();
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

    if (this.accessoryConfiguration.switch.hasCompanionSensor) {
      this.states.SensorState = this.determineSensorState();

      this.companionSensor!.triggerCompanionSensorState(this.states.SensorState, this, this.accessoryConfiguration.switch.muteLogging);
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

      if (this.accessoryConfiguration.resetTimer.isDynamic) {
        Object.assign(jsonState, { [this.timerSliderSecondsStorageKey]: this.timerSecondsSlider?.getBrightness() });
        Object.assign(jsonState, { [this.timerSliderMinutesStorageKey]: this.timerMinutesSlider?.getBrightness() });
        Object.assign(jsonState, { [this.timerSliderHoursStorageKey]: this.timerHoursSlider?.getBrightness() });
        Object.assign(jsonState, { [this.timerSliderDaysStorageKey]: this.timerDaysSlider?.getBrightness() });
      }
    }

    const json = JSON.stringify(jsonState);

    return json;
  }

  protected getAccessoryTypeName(): string {
    return Switch.ACCESSORY_TYPE_NAME;
  }

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

  private setupCompanionSensor(): void {
    this.companionSensor = AccessoryFactory.createVirtualCompanionSensor(
      this.platform, this.accessory, this.accessoryConfiguration.companionSensor.type, this.accessoryConfiguration.companionSensor.name);

    this.companionSensor!.triggerCompanionSensorState(this.states.SensorState, this, this.accessoryConfiguration.switch.muteLogging);
  }

  private setupResetTimerSliders(): void {
    // Order days, hours, minutes, seconds
    this.timerDaysSlider = this.createSlider('Days', DurationConfiguration.DAYS_MAX_VALUE, this.accessoryConfiguration.resetTimer.duration.days);
    this.timerHoursSlider = this.createSlider('Hours', DurationConfiguration.HOURS_MAX_VALUE, this.accessoryConfiguration.resetTimer.duration.hours);
    this.timerMinutesSlider = this.createSlider('Minutes', DurationConfiguration.MINUTES_MAX_VALUE, this.accessoryConfiguration.resetTimer.duration.minutes);
    this.timerSecondsSlider = this.createSlider('Seconds', DurationConfiguration.SECONDS_MAX_VALUE, this.accessoryConfiguration.resetTimer.duration.seconds);
  }

  private createSlider(
    companionName: string,
    maximumValue: number,
    value: number,
  ): Lightbulb | undefined {
    const slider: Lightbulb | undefined = AccessoryFactory.createVirtualCompanionLightbulb(
      this.platform, this.accessory, this.accessoryConfiguration.accessoryName + ' ' + companionName, value);

    slider?.service?.getCharacteristic(this.platform.Characteristic.Brightness)
      .setProps({
        minValue: 0,
        maxValue: maximumValue,
        minStep: 1,
        unit: 'seconds',
      })
      .onSet(Utils.debounce(async (value: number) => {
        const maxValue: number | undefined = slider.service?.getCharacteristic(this.platform.Characteristic.Brightness).props.maxValue;
        
        const brightness = (maxValue !== undefined && value > maxValue) ? maxValue : value;

        // call original handler
        slider.setBrightness(brightness);

        this.storeState();

        // recalculate duration
        const duration = new DurationConfiguration();
        duration.seconds = (await this.timerSecondsSlider?.getBrightness())! as number;
        duration.minutes = (await this.timerMinutesSlider?.getBrightness())! as number;
        duration.hours = (await this.timerHoursSlider?.getBrightness())! as number;
        duration.days = (await this.timerDaysSlider?.getBrightness())! as number;

        this.durationTimer?.setDefaultDuration(this.convertDurationToSeconds(duration));
      }));

    return slider;
  }

  private restoreTimerSliders(
    accessoryState: string,
  ): void {
    const cachedTimerSliderSeconds = accessoryState[this.timerSliderSecondsStorageKey] as number;
    const cachedTimerSliderMinutes = accessoryState[this.timerSliderMinutesStorageKey] as number;
    const cachedTimerSliderHours = accessoryState[this.timerSliderHoursStorageKey] as number;
    const cachedTimerSliderDays = accessoryState[this.timerSliderDaysStorageKey] as number;

    // Order days, hours, minutes, seconds
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Slider Days: ${cachedTimerSliderDays}`);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Slider Hours: ${cachedTimerSliderHours}`);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Slider Minutes: ${cachedTimerSliderMinutes}`);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Slider Seconds: ${cachedTimerSliderSeconds}`);

    this.timerSecondsSlider?.setBrightness(cachedTimerSliderSeconds);
    this.timerMinutesSlider?.setBrightness(cachedTimerSliderMinutes);
    this.timerHoursSlider?.setBrightness(cachedTimerSliderHours);
    this.timerDaysSlider?.setBrightness(cachedTimerSliderDays);
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
}
