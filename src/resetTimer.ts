import { CharacteristicValue } from 'homebridge';
import { Accessory } from './accessories/virtualAccessory';

export class ResetTimer {

  static Units = {
    Seconds: 'seconds',
    Minutes: 'minutes',
    Hours: 'hours',
    Days: 'days',
  };

  private timerId: ReturnType<typeof setTimeout> | undefined;

  private config;
  private virtualAccessory: Accessory;
  private resetValue: CharacteristicValue;
  private characteristic;

  private duration: number;

  constructor(
    virtualAccessory: Accessory,
    resetValue: CharacteristicValue,
    characteristic,
  ) {
    this.virtualAccessory = virtualAccessory;
    this.config = this.virtualAccessory.accessoryConfiguration.resetTimer;
    this.resetValue = resetValue;
    this.characteristic = characteristic;

    if (this.config.durationIsRandom) {
      const minDuration = this.config.durationRandomMin;
      const maxDuration = this.config.durationRandomMax;
      this.duration = Math.floor(Math.random() * (maxDuration + 1 - minDuration) + minDuration);
    } else {
      this.duration = this.config.duration;
    }

    const units = this.config.units;
    switch (units) {
    case ResetTimer.Units.Days:
      this.duration *= 24;
      // falls through
    case ResetTimer.Units.Hours:
      this.duration *= 60;
      // falls through
    case ResetTimer.Units.Minutes:
      this.duration *= 60;
      // falls through
    case ResetTimer.Units.Seconds:
      this.duration *= 1000;
    }
  }

  startTimer() {
    if (this.config.isResettable) {
      this.endTimer();
    }

    // Start the state reset timer
    //const resetValue = (this.states.SwitchState === this.ON) ? this.OFF : this.ON;
    this.timerId = setTimeout(() => {
      this.virtualAccessory.service!.setCharacteristic(this.characteristic, this.resetValue);
    }, this.duration);
  }

  endTimer() {
    clearTimeout(this.timerId);
  }
}
