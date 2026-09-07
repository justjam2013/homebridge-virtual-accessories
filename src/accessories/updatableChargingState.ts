/**
 * 
 */
export interface UpdatableChargingStatus {

  updateChargingStatus(charging: boolean, charge: number, accessoryId: string): void;
}
