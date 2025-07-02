/**
 * 
 */
export interface TriggerableSensor {

  triggerSensor(value: boolean, accessoryId: string): void;
}
