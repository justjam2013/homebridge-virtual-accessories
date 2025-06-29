/**
 * 
 */
export interface UpdatableChargingState {
  updateChargingState(charging: boolean, charge: number, accessoryId: string): void;
}
