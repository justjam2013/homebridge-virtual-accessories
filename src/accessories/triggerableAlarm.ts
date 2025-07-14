/**
 * 
 */
export interface TriggerableAlarm {

  triggerAlarm(value: number, accessoryId: string): void;
}
