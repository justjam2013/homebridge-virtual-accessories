/* eslint-disable curly */

import { ZoneId } from '@js-joda/core';
import '@js-joda/timezone';

/**
 * 
 */
export class SunEventsTriggerConfiguration {
  event!: string;
  latitude!: string;
  longitude!: string;
  zoneId!: string;
  isDisabled: boolean = false;

  private static latitudePattern = '^[-+]?([1-8]?\\d(\\.\\d+)?|90(\\.0+)?)$';
  private static longitudePattern = '^[-+]?(180(\\.0+)?|((1[0-7]\\d)|([1-9]?\\d))(\\.\\d+)?)$';


  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidEvent = ['sunrise', 'sunset', 'goldenhour'].includes(this.event);

    const latitudeRegex = new RegExp(SunEventsTriggerConfiguration.latitudePattern);
    const isValidLatitude: boolean = (
      (this.latitude !== undefined) &&
      latitudeRegex.test(this.latitude)
    );

    const longitudeRegex = new RegExp(SunEventsTriggerConfiguration.longitudePattern);
    const isValidLongitude: boolean = (
      (this.longitude !== undefined) &&
      longitudeRegex.test(this.longitude)
    );

    const isValidZoneId = this.isValidZoneId(this.zoneId);

    if (!isValidEvent) this.errorFields.push('event');
    if (!isValidLatitude) this.errorFields.push('latitude');
    if (!isValidLongitude) this.errorFields.push('longitude');
    if (!isValidZoneId) this.errorFields.push('zoneId');

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
