/* eslint-disable brace-style */

import { Type } from 'typeserializer';

import { DurationConfiguration } from './configurationDuration';
import { Utils } from '../utils';

/**
 * 
 */
export class TimerConfiguration {
  durationIsRandom: boolean = false;
  @Type(DurationConfiguration)
    duration!: DurationConfiguration;
  @Type(DurationConfiguration)
    durationRandomMin!: DurationConfiguration;
  @Type(DurationConfiguration)
    durationRandomMax!: DurationConfiguration;
  isResettable: boolean = false;

  static prefix: string = 'resetTimer';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const durationFieldName: string = 'duration';
    const durationRandomMinFieldName: string = 'durationRandomMin';
    const durationRandomMaxFieldName: string = 'durationRandomMax';

    let isValidDuration: boolean = true;
    let durationErrorFields: string[] = [];
    if (this.durationIsRandom === false) {
      if (this.duration !== undefined) {
        [isValidDuration, durationErrorFields] = this.duration.isValid(durationFieldName);
      } 
      else {
        [isValidDuration, durationErrorFields] = [false, [ durationFieldName ]];
      }
    }

    let isValidDurationRandomMin: boolean = true;
    let durationRandomMinErrorFields: string[] = [];
    if (this.durationIsRandom === true) {
      if (this.durationRandomMin !== undefined) {
        [isValidDurationRandomMin, durationRandomMinErrorFields] = this.durationRandomMin.isValid(durationRandomMinFieldName);
      }
      else {
        [isValidDurationRandomMin, durationRandomMinErrorFields] = [false, [ durationRandomMinFieldName ]];
      }
    }

    let isValidDurationRandomMax: boolean = true;
    let durationRandomMaxErrorFields: string[] = [];
    if (this.durationIsRandom === true) {
      if (this.durationRandomMax !== undefined) {
        [isValidDurationRandomMax, durationRandomMaxErrorFields] = this.durationRandomMax.isValid(durationRandomMaxFieldName);
      }
      else {
        [isValidDurationRandomMax, durationRandomMaxErrorFields] = [false, [ durationRandomMaxFieldName ]];
      }
    }

    const isValidDurationRandomRange: boolean = (
      (this.durationIsRandom === true &&
        this.durationRandomMin !== undefined &&
        this.durationRandomMax !== undefined) ? (
          this.convertDurationToSeconds(this.durationRandomMin) < this.convertDurationToSeconds(this.durationRandomMax)
        ) :
        true
    );

    if (!isValidDuration) {
      durationErrorFields.forEach( (errorField) => {
        this.errorFields.push(TimerConfiguration.prefix + '.' + errorField);
      });
    }
    if (!isValidDurationRandomMin) {
      durationRandomMinErrorFields.forEach( (errorField) => {
        this.errorFields.push(TimerConfiguration.prefix + '.' + errorField);
      });
    }
    if (!isValidDurationRandomMax) {
      durationRandomMaxErrorFields.forEach( (errorField) => {
        this.errorFields.push(TimerConfiguration.prefix + '.' + errorField);
      });
    }
    if (!isValidDurationRandomRange) {this.errorFields.push(
      TimerConfiguration.prefix + '.' + durationRandomMinFieldName,
      TimerConfiguration.prefix + '.' + durationRandomMaxFieldName);
    }

    return [
      (isValidDuration && 
        isValidDurationRandomMin &&
        isValidDurationRandomMax &&
        isValidDurationRandomRange),
      this.errorFields,
    ];
  }

  private convertDurationToSeconds(duration: DurationConfiguration): number {
    const seconds: number = Utils.daysHoursMinutesSecondsToSeconds(duration.days, duration.hours, duration.minutes, duration.seconds);
    return seconds;
  }
}
