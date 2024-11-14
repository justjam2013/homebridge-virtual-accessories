/**
 * 
 */
export class PingTriggerConfiguration {
  host!: string;
  failureRetryCount!: number;
  isDisabled: boolean = false;

  isValid(): boolean {
    const validHost: boolean = (this.host !== undefined);
    const validFailureRetryCount: boolean = (this.failureRetryCount !== undefined);

    return (validHost && validFailureRetryCount);
  }
}
