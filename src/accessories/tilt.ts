import type { Characteristic, CharacteristicValue, Service, WithUUID } from 'homebridge';

import { VirtualLogger } from '../utils/virtualLogger.js';
import { Timer } from '../utils/timer.js';

/**
 * Tilt - Reusable tilt angle behaviour
 *
 * Drives a Current/Target tilt angle characteristic pair with a proportional transition.
 * Composed by any accessory that exposes a tilt (Window Covering, Slats).
 */
export class Tilt {

  // HomeKit tilt angle hard limits in degrees: -90 (fully one way) to 90 (fully the other way)
  static readonly ANGLE_MIN: number = -90;
  static readonly ANGLE_MAX: number = 90;

  private static readonly MIN_TIMEOUT_SECS: number = 1;
  private static readonly DEFAULT_TIMEOUT_SECS: number = 3;

  private readonly service: Service;
  private readonly currentTiltCharacteristic: WithUUID<new () => Characteristic>;
  private readonly targetTiltCharacteristic: WithUUID<new () => Characteristic>;
  private readonly log: VirtualLogger;
  private readonly accessoryName: string;
  private readonly minTiltAngle: number;
  private readonly maxTiltAngle: number;
  private readonly tiltAngleRange: number;
  private readonly transitionDuration?: number;

  // Invoked when a transition completes so the owning accessory can persist its state
  private readonly onTransitionComplete: () => void;

  private transitionTimer: Timer;
  private transitionSteps: number = 0;

  private states = {
    CurrentTiltAngle: 0,   // degrees
    TargetTiltAngle: 0,    // degrees
  };

  constructor(
    service: Service,
    currentTiltCharacteristic: WithUUID<new () => Characteristic>,
    targetTiltCharacteristic: WithUUID<new () => Characteristic>,
    log: VirtualLogger,
    accessoryName: string,
    minTiltAngle: number,
    maxTiltAngle: number,
    initialTiltAngle: number,
    transitionDuration: number | undefined,
    onTransitionComplete: () => void,
  ) {
    this.service = service;
    this.currentTiltCharacteristic = currentTiltCharacteristic;
    this.targetTiltCharacteristic = targetTiltCharacteristic;
    this.log = log;
    this.accessoryName = accessoryName;
    this.minTiltAngle = minTiltAngle;
    this.maxTiltAngle = maxTiltAngle;
    this.tiltAngleRange = this.maxTiltAngle - this.minTiltAngle;
    this.transitionDuration = transitionDuration;
    this.onTransitionComplete = onTransitionComplete;

    this.states.CurrentTiltAngle = initialTiltAngle;
    this.states.TargetTiltAngle = initialTiltAngle;

    const timerIsResettable: boolean = true;
    this.transitionTimer = new Timer(
      this.accessoryName,
      this.log,
      timerIsResettable,
      // No default timer duration
    );

    // Constrain the characteristics to the configured range so the Home app slider matches
    this.service.getCharacteristic(this.currentTiltCharacteristic)
      .setProps({ minValue: this.minTiltAngle, maxValue: this.maxTiltAngle });
    this.service.getCharacteristic(this.targetTiltCharacteristic)
      .setProps({ minValue: this.minTiltAngle, maxValue: this.maxTiltAngle });

    // Update the initial tilt state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Current Tilt Angle: ${this.states.CurrentTiltAngle}º`);
    this.service.updateCharacteristic(this.currentTiltCharacteristic, (this.states.CurrentTiltAngle));
    this.service.updateCharacteristic(this.targetTiltCharacteristic, (this.states.TargetTiltAngle));

    // register handlers

    this.service.getCharacteristic(this.currentTiltCharacteristic)
      .onGet(this.getCurrentTiltAngle.bind(this));

    this.service.getCharacteristic(this.targetTiltCharacteristic)
      .onSet(this.setTargetTiltAngle.bind(this))
      .onGet(this.getTargetTiltAngle.bind(this));
  }

  // Handlers

  async getCurrentTiltAngle(): Promise<CharacteristicValue> {
    // If timer is running, then the tilt is moving, so calculate the interim angle
    if (this.transitionTimer.isTimerRunning()) {
      const runtimeMillis: number = this.transitionTimer.getRuntime() * 1000;
      const remainingSteps: number = Math.ceil(this.transitionTimer.getRemainingDurationMillis() / runtimeMillis * this.transitionSteps);
      this.states.CurrentTiltAngle = this.states.TargetTiltAngle - remainingSteps;
    }
    const currentTiltAngle = this.states.CurrentTiltAngle;

    this.log.debug(`[${this.accessoryName}] Getting Current Tilt Angle: ${currentTiltAngle}º`);

    return currentTiltAngle;
  }

  async setTargetTiltAngle(value: CharacteristicValue) {
    this.states.TargetTiltAngle = value as number;

    this.log.info(`[${this.accessoryName}] Setting Target Tilt Angle: ${this.states.TargetTiltAngle}º`);

    const transitionDelay: number = (this.transitionDuration ? this.transitionDuration : Tilt.DEFAULT_TIMEOUT_SECS);

    this.transitionSteps = this.states.TargetTiltAngle - this.states.CurrentTiltAngle;
    this.log.debug(`[${this.accessoryName}] Tilt Transition Steps: ${this.transitionSteps}`);
    const proportionalTransitionDelay: number = Math.max(
      // Round up to the nearest second
      Math.ceil(transitionDelay / this.tiltAngleRange * Math.abs(this.transitionSteps)),
      Tilt.MIN_TIMEOUT_SECS);
    this.log.debug(`[${this.accessoryName}] Tilt Proportional Delay: ${proportionalTransitionDelay}/(${transitionDelay})`);

    const updateIntervalMillis = 100;

    // Stop tilt transition timer, if running
    this.transitionTimer.stop();

    this.transitionTimer.start(
      () => {
        this.states.CurrentTiltAngle = this.states.TargetTiltAngle;
        this.service.setCharacteristic(this.currentTiltCharacteristic, (this.states.CurrentTiltAngle));

        this.transitionSteps = 0;

        this.onTransitionComplete();

        this.log.info(`[${this.accessoryName}] Setting Current Tilt Angle: ${this.states.CurrentTiltAngle}º`);
      },
      proportionalTransitionDelay,
      updateIntervalMillis,
    );
  }

  async getTargetTiltAngle(): Promise<CharacteristicValue> {
    const targetTiltAngle = this.states.TargetTiltAngle;

    this.log.debug(`[${this.accessoryName}] Getting Target Tilt Angle: ${targetTiltAngle}º`);

    return targetTiltAngle;
  }

  // The current tilt angle, exposed for state persistence by the owning accessory
  getTiltAngle(): number {
    return this.states.CurrentTiltAngle;
  }
}
