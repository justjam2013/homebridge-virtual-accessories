/**
 * 
 */
export interface UpdatableChargingStatus {

  updateChargingStatus(charging: boolean | undefined, charge: number | undefined, accessoryId: string): void;
}
