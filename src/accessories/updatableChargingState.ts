/**
 * 
 */
export interface UpdatableCharging {

  updateCharging(charging: boolean, charge: number, accessoryId: string): void;
}
