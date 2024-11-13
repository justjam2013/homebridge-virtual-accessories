import { CharacteristicValue } from 'homebridge';
import { VirtualAccessory } from './accessories/virtualAccessory';

export class Timer {

  private timerId: ReturnType<typeof setTimeout> | undefined;

  private config;
  private virtualAccessory: VirtualAccessory;
  private resetValue: CharacteristicValue;
  private characteristic;

  private duration: number;

  constructor(
    virtualAccessory: VirtualAccessory,
    resetValue: CharacteristicValue,
    characteristic,
  ) {
    this.virtualAccessory = virtualAccessory;
    this.config = this.virtualAccessory.device.resetTimer;
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
    case 'days':
      this.duration *= 24;
      // falls through
    case 'hours':
      this.duration *= 60;
      // falls through
    case 'minutes':
      this.duration *= 60;
      // falls through
    case 'seconds':
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
