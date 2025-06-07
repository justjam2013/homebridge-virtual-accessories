/* eslint-disable curly */

import { SunEvent } from '../configurationSchema.js';
import { Utils } from '../../utils.js';

import { ZoneId } from '@js-joda/core';
import '@js-joda/timezone';

/**
 * 
 */
export class SunEventsTriggerConfiguration {
  event!: string;
  offset: number = 0;
  latitude!: string;
  longitude!: string;
  zoneId!: string;
  isDisabled: boolean = false;

  private static latitudePattern = '^[-+]?([1-8]?\\d(\\.\\d+)?|90(\\.0+)?)$';
  private static longitudePattern = '^[-+]?(180(\\.0+)?|((1[0-7]\\d)|([1-9]?\\d))(\\.\\d+)?)$';

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidEvent = (
      Utils.required(this.event) &&
      SunEvent.Events.includes(this.event)
    );

    const latitudeRegex = new RegExp(SunEventsTriggerConfiguration.latitudePattern);
    const isValidLatitude: boolean = (
      Utils.required(this.latitude) &&
      latitudeRegex.test(this.latitude)
    );

    const longitudeRegex = new RegExp(SunEventsTriggerConfiguration.longitudePattern);
    const isValidLongitude: boolean = (
      Utils.required(this.longitude) &&
      longitudeRegex.test(this.longitude)
    );

    const isValidZoneId = (this.zoneId === undefined) || this.isValidZoneId(this.zoneId);

    if (!isValidEvent) this.errorFields.push(prefix + '.' + this.fieldNames.event!);
    if (!isValidLatitude) this.errorFields.push(prefix + '.' + this.fieldNames.latitude!);
    if (!isValidLongitude) this.errorFields.push(prefix + '.' + this.fieldNames.longitude!);
    if (!isValidZoneId) this.errorFields.push(prefix + '.' + this.fieldNames.zoneId!);

    return [
      (isValidEvent &&
        isValidLatitude &&
        isValidLongitude &&
        isValidZoneId),
      this.errorFields,
    ];
  }

  private isValidZoneId(zoneId: string): boolean {
    const availableZoneIds: string[] = ZoneId.getAvailableZoneIds();

    const isValidZoneId: boolean = availableZoneIds.includes(zoneId);

    return isValidZoneId;
  }
}
