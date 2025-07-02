/**
 * 
 */
export interface UpdatableSensor {

  updateSensor(value: number, accessoryId: string): void;
}
