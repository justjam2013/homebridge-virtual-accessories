/**
 * 
 */
export class CronTriggerConfiguration {
  pattern!: string;
  zoneId!: string;
  startDateTime!: string;
  endDateTime!: string;
  isDisabled: boolean = false;

  isValid(): boolean {
    const validPattern: boolean = (this.pattern !== undefined);
    const validExecutionRangeDateTime: boolean = (
      (this.startDateTime === undefined && this.endDateTime === undefined) ||
      (this.startDateTime !== undefined && this.endDateTime !== undefined)
    );
    // Add start date before end date validation

    return (validPattern && validExecutionRangeDateTime);
  }
}
