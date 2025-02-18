/* eslint-disable curly */

/**
 * 
 */
export class SensorConfiguration {
  type!: string;
  trigger!: string;

  static prefix: string = 'sensor';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidType: boolean = (
      (this.type !== undefined) &&
      ['carbonDioxide', 'carbonMonoxide', 'contact', 'leak', 'motion', 'occupancy', 'smoke'].includes(this.type)
    );

    const isValidTrigger: boolean = (
      (this.trigger !== undefined) &&
      ['cron', 'ping', 'sunevents' ].includes(this.trigger)
    );

    // Store fields failing validation
    if (!isValidType) this.errorFields.push(SensorConfiguration.prefix + '.type');
    if (!isValidTrigger) this.errorFields.push(SensorConfiguration.prefix + '.trigger');

    return [
      (isValidType &&
        isValidTrigger),
      this.errorFields,
    ];
  }
}
