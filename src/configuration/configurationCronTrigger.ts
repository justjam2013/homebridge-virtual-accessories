/**
 * 
 */
export class CronTriggerConfiguration {
  pattern!: string;
  zoneId!: string;
  startDateTime!: string;
  endDateTime!: string;
  isDisabled: boolean = false;

  private static isoTimeNoMillis = '^\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d([+-][0-2]\\d:[0-5]\\d|Z)$';

  isValid(): boolean {
    const validPattern: boolean = (this.pattern !== undefined);

    const isoTimeRegex = new RegExp(CronTriggerConfiguration.isoTimeNoMillis);
    const validStartDateTime = (this.startDateTime !== undefined) ? isoTimeRegex.test(this.startDateTime) : true;
    const validEndDateTime = (this.endDateTime !== undefined) ? isoTimeRegex.test(this.endDateTime) : true;

    let validExecutionRangeDateTime = true;
    if (this.startDateTime !== undefined && this.endDateTime !== undefined) {
      const startDate = new Date(this.startDateTime);
      const endDate = new Date(this.endDateTime);
      validExecutionRangeDateTime = endDate.getTime() > startDate.getTime();
    }

    return (validPattern && validStartDateTime && validEndDateTime && validExecutionRangeDateTime);
  }
}
