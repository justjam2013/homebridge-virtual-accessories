import { Characteristic, CharacteristicValue, Service, WithUUID } from 'homebridge';

import { CharacteristicType } from './platform.js';

export class CharacteristicUtils {
  service!: Service;

  //
  // ****************************** Characteristic convenience methods ******************************
  //
 
  getCharacteristicValue(
    characteristic: WithUUID<new () => Characteristic>,
  ): CharacteristicValue {
    return this.service.getCharacteristic(characteristic).value as CharacteristicValue;
  }

  // will trigger the "set" handler if it exists
  setCharacteristicValue(
    characteristic: WithUUID<new () => Characteristic>,
    value: CharacteristicValue,
  ): CharacteristicValue {
    this.service.setCharacteristic(characteristic, value);
    return this.getCharacteristicValue(characteristic);
  }

  updateCharacteristicValue(
    characteristic: WithUUID<new () => Characteristic>,
    value: CharacteristicValue,
  ): CharacteristicValue {
    this.service.updateCharacteristic(characteristic, value);
    return this.getCharacteristicValue(characteristic);
  }

  removeCharacteristic(
    characteristic: Characteristic,
  ): void {
    this.service.removeCharacteristic(characteristic);
  }

  // ************************************************************************************************************************

  //
  // ****************************** Characteristic Type methods ******************************
  //

  // Active

  getActive(): number {
    return this.getCharacteristicValue(CharacteristicType.Active) as number;
  }

  setActive(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.Active, value) as number;
  }

  updateActive(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.Active, value) as number;
  }

  // ActiveIdentifier

  getActiveIdentifier(): number {
    return this.getCharacteristicValue(CharacteristicType.ActiveIdentifier) as number;
  }

  setActiveIdentifier(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.ActiveIdentifier, value) as number;
  }

  updateActiveIdentifier(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.ActiveIdentifier, value) as number;
  }

  // Brightness

  getBrightness(): number {
    return this.getCharacteristicValue(CharacteristicType.Brightness) as number;
  }

  setBrightness(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.Brightness, value) as number;
  }

  updateBrightness(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.Brightness, value) as number;
  }

  // ColorTemperature

  getColorTemperature(): number {
    return this.getCharacteristicValue(CharacteristicType.ColorTemperature) as number;
  }

  setColorTemperature(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.ColorTemperature, value) as number;
  }

  updateColorTemperature(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.ColorTemperature, value) as number;
  }

  // ConfiguredName

  getConfiguredName(): string {
    return this.getCharacteristicValue(CharacteristicType.ConfiguredName) as string;
  }

  setConfiguredName(
    value: string,
  ): string {
    return this.setCharacteristicValue(CharacteristicType.ConfiguredName, value) as string;
  }

  updateConfiguredName(
    value: string,
  ): string {
    return this.updateCharacteristicValue(CharacteristicType.ConfiguredName, value) as string;
  }

  // CurrentVisibilityState

  getCurrentVisibilityState(): number {
    return this.getCharacteristicValue(CharacteristicType.CurrentVisibilityState) as number;
  }

  setCurrentVisibilityState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.CurrentVisibilityState, value) as number;
  }

  updateCurrentVisibilityState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.CurrentVisibilityState, value) as number;
  }

  // Hue

  getHue(): number {
    return this.getCharacteristicValue(CharacteristicType.Hue) as number;
  }

  setHue(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.Hue, value) as number;
  }

  updateHue(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.Hue, value) as number;
  }

  // Identifier

  getIdentifier(): number {
    return this.getCharacteristicValue(CharacteristicType.Identifier) as number;
  }

  setIdentifier(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.Identifier, value) as number;
  }

  updateIdentifier(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.Identifier, value) as number;
  }

  // InputSourceType

  getInputSourceType(): number {
    return this.getCharacteristicValue(CharacteristicType.InputSourceType) as number;
  }

  setInputSourceType(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.InputSourceType, value) as number;
  }

  updateInputSourceType(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.InputSourceType, value) as number;
  }

  // InUse

  getInUse(): number {
    return this.getCharacteristicValue(CharacteristicType.InUse) as number;
  }

  setInUse(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.InUse, value) as number;
  }

  updateInUse(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.InUse, value) as number;
  }

  // IsConfigured

  getIsConfigured(): number {
    return this.getCharacteristicValue(CharacteristicType.IsConfigured) as number;
  }

  setIsConfigured(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.IsConfigured, value) as number;
  }

  updateIsConfigured(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.IsConfigured, value) as number;
  }

  // Mute

  getMute(): boolean {
    return this.getCharacteristicValue(CharacteristicType.Mute) as boolean;
  }

  setMute(
    value: boolean,
  ): boolean {
    return this.setCharacteristicValue(CharacteristicType.Mute, value) as boolean;
  }

  updateMute(
    value: boolean,
  ): boolean {
    return this.updateCharacteristicValue(CharacteristicType.Mute, value) as boolean;
  }

  // Name

  getName(): string {
    return this.getCharacteristicValue(CharacteristicType.Name) as string;
  }

  setName(
    value: string,
  ): string {
    return this.setCharacteristicValue(CharacteristicType.Name, value) as string;
  }

  updateName(
    value: string,
  ): string {
    return this.updateCharacteristicValue(CharacteristicType.Name, value) as string;
  }

  // On

  getOn(): boolean {
    return this.getCharacteristicValue(CharacteristicType.On) as boolean;
  }

  setOn(
    value: boolean,
  ): boolean {
    return this.setCharacteristicValue(CharacteristicType.On, value) as boolean;
  }

  updateOn(
    value: boolean,
  ): boolean {
    return this.updateCharacteristicValue(CharacteristicType.On, value) as boolean;
  }

  // ProgrammableSwitchEvent

  getProgrammableSwitchEvent(): number {
    return this.getCharacteristicValue(CharacteristicType.ProgrammableSwitchEvent) as number;
  }

  setProgrammableSwitchEvent(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.ProgrammableSwitchEvent, value) as number;
  }

  updateProgrammableSwitchEvent(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.ProgrammableSwitchEvent, value) as number;
  }

  // RemainingDuration

  getRemainingDuration(): number {
    return this.getCharacteristicValue(CharacteristicType.RemainingDuration) as number;
  }

  setRemainingDuration(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.RemainingDuration, value) as number;
  }

  updateRemainingDuration(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.RemainingDuration, value) as number;
  }

  // RemoteKey

  getRemoteKey(): number {
    return this.getCharacteristicValue(CharacteristicType.RemoteKey) as number;
  }

  setRemoteKey(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.RemoteKey, value) as number;
  }

  updateRemoteKey(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.RemoteKey, value) as number;
  }

  // Saturation

  getSaturation(): number {
    return this.getCharacteristicValue(CharacteristicType.Saturation) as number;
  }

  setSaturation(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.Saturation, value) as number;
  }

  updateSaturation(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.Saturation, value) as number;
  }

  // SetDuration

  getSetDuration(): number {
    return this.getCharacteristicValue(CharacteristicType.SetDuration) as number;
  }

  setSetDuration(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.SetDuration, value) as number;
  }

  updateSetDuration(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.SetDuration, value) as number;
  }

  // SleepDiscoveryMode

  getSleepDiscoveryMode(): number {
    return this.getCharacteristicValue(CharacteristicType.SleepDiscoveryMode) as number;
  }

  setSleepDiscoveryMode(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.SleepDiscoveryMode, value) as number;
  }

  updateSleepDiscoveryMode(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.SleepDiscoveryMode, value) as number;
  }

  // TemperatureDisplayUnits

  getTemperatureDisplayUnits(): number {
    return this.getCharacteristicValue(CharacteristicType.TemperatureDisplayUnits) as number;
  }

  setTemperatureDisplayUnits(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.TemperatureDisplayUnits, value) as number;
  }

  updateTemperatureDisplayUnits(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.TemperatureDisplayUnits, value) as number;
  }

  // ValveType

  getValveType(): number {
    return this.getCharacteristicValue(CharacteristicType.ValveType) as number;
  }

  setValveType(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.ValveType, value) as number;
  }

  updateValveType(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.ValveType, value) as number;
  }

  // Volume

  getVolume(): number {
    return this.getCharacteristicValue(CharacteristicType.Volume) as number;
  }

  setVolume(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.Volume, value) as number;
  }

  updateVolume(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.Volume, value) as number;
  }

  // ************************************************************************************************************************

  //
  // ****************************** Air Purifier ******************************
  //

  // CurrentAirPurifierState

  getCurrentAirPurifierState(): number {
    return this.getCharacteristicValue(CharacteristicType.CurrentAirPurifierState) as number;
  }

  setCurrentAirPurifierState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.CurrentAirPurifierState, value) as number;
  }

  updateCurrentAirPurifierState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.CurrentAirPurifierState, value) as number;
  }

  // TargetAirPurifierState

  getTargetAirPurifierState(): number {
    return this.getCharacteristicValue(CharacteristicType.TargetAirPurifierState) as number;
  }

  setTargetAirPurifierState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.TargetAirPurifierState, value) as number;
  }

  updateTargetAirPurifierState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.TargetAirPurifierState, value) as number;
  }

  //
  // ****************************** Battery ******************************
  //

  // StatusLowBattery

  getStatusLowBattery(): number {
    return this.getCharacteristicValue(CharacteristicType.StatusLowBattery) as number;
  }

  setStatusLowBattery(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.StatusLowBattery, value) as number;
  }

  updateStatusLowBattery(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.StatusLowBattery, value) as number;
  }

  // BatteryLevel

  getBatteryLevel(): number {
    return this.getCharacteristicValue(CharacteristicType.BatteryLevel) as number;
  }

  setBatteryLevel(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.BatteryLevel, value) as number;
  }

  updateBatteryLevel(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.BatteryLevel, value) as number;
  }

  // ChargingState

  getChargingState(): number {
    return this.getCharacteristicValue(CharacteristicType.ChargingState) as number;
  }

  setChargingState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.ChargingState, value) as number;
  }

  updateChargingState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.ChargingState, value) as number;
  }

  //
  // ****************************** Filter Maintenance ******************************
  //

  // FilterChangeIndication

  getFilterChangeIndication(): number {
    return this.getCharacteristicValue(CharacteristicType.FilterChangeIndication) as number;
  }

  setFilterChangeIndication(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.FilterChangeIndication, value) as number;
  }

  updateFilterChangeIndication(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.FilterChangeIndication, value) as number;
  }

  // FilterLifeLevel

  getFilterLifeLevel(): number {
    return this.getCharacteristicValue(CharacteristicType.FilterLifeLevel) as number;
  }

  setFilterLifeLevel(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.FilterLifeLevel, value) as number;
  }

  updateFilterLifeLevel(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.FilterLifeLevel, value) as number;
  }

  // ResetFilterIndication

  getResetFilterIndication(): number {
    return this.getCharacteristicValue(CharacteristicType.ResetFilterIndication) as number;
  }

  setResetFilterIndication(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.ResetFilterIndication, value) as number;
  }

  updateResetFilterIndication(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.ResetFilterIndication, value) as number;
  }

  //
  // ****************************** Garage Door Opener ******************************
  //

  // CurrentDoorState

  getCurrentDoorState(): number {
    return this.getCharacteristicValue(CharacteristicType.CurrentDoorState) as number;
  }

  setCurrentDoorState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.CurrentDoorState, value) as number;
  }

  updateCurrentDoorState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.CurrentDoorState, value) as number;
  }

  // TargetDoorState

  getTargetDoorState(): number {
    return this.getCharacteristicValue(CharacteristicType.TargetDoorState) as number;
  }

  setTargetDoorState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.TargetDoorState, value) as number;
  }

  updateTargetDoorState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.TargetDoorState, value) as number;
  }

  // ObstructionDetected

  getObstructionDetected(): boolean {
    return this.getCharacteristicValue(CharacteristicType.ObstructionDetected) as boolean;
  }

  setObstructionDetected(
    value: boolean,
  ): boolean {
    return this.setCharacteristicValue(CharacteristicType.ObstructionDetected, value) as boolean;
  }

  updateObstructionDetected(
    value: boolean,
  ): boolean {
    return this.updateCharacteristicValue(CharacteristicType.ObstructionDetected, value) as boolean;
  }

  //
  // ****************************** Heater-Cooler ******************************
  //

  // CurrentHeaterCoolerState

  getCurrentHeaterCoolerState(): number {
    return this.getCharacteristicValue(CharacteristicType.CurrentHeaterCoolerState) as number;
  }

  setCurrentHeaterCoolerState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.CurrentHeaterCoolerState, value) as number;
  }

  updateCurrentHeaterCoolerState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.CurrentHeaterCoolerState, value) as number;
  }

  // TargetHeaterCoolerState

  getTargetHeaterCoolerState(): number {
    return this.getCharacteristicValue(CharacteristicType.TargetHeaterCoolerState) as number;
  }

  setTargetHeaterCoolerState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.TargetHeaterCoolerState, value) as number;
  }

  updateTargetHeaterCoolerState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.TargetHeaterCoolerState, value) as number;
  }

  //
  // ****************************** Humidifier-Dehumidifier ******************************
  //

  // CurrentHumidifierDehumidifierState

  getCurrentHumidifierDehumidifierState(): number {
    return this.getCharacteristicValue(CharacteristicType.CurrentHumidifierDehumidifierState) as number;
  }

  setCurrentHumidifierDehumidifierState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.CurrentHumidifierDehumidifierState, value) as number;
  }

  updateCurrentHumidifierDehumidifierState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.CurrentHumidifierDehumidifierState, value) as number;
  }

  // TargetHumidifierDehumidifierState

  getTargetHumidifierDehumidifierState(): number {
    return this.getCharacteristicValue(CharacteristicType.TargetHumidifierDehumidifierState) as number;
  }

  setTargetHumidifierDehumidifierState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.TargetHumidifierDehumidifierState, value) as number;
  }

  updateTargetHumidifierDehumidifierState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.TargetHumidifierDehumidifierState, value) as number;
  }

  //
  // ****************************** Lock Mechanism ******************************
  //

  // LockCurrentState

  getLockCurrentState(): number {
    return this.getCharacteristicValue(CharacteristicType.LockCurrentState) as number;
  }

  setLockCurrentState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.LockCurrentState, value) as number;
  }

  updateLockCurrentState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.LockCurrentState, value) as number;
  }

  // LockTargetState

  getLockTargetState(): number {
    return this.getCharacteristicValue(CharacteristicType.LockTargetState) as number;
  }

  setLockTargetState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.LockTargetState, value) as number;
  }

  updateLockTargetState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.LockTargetState, value) as number;
  }

  //
  // ****************************** Security System ******************************
  //

  // SecuritySystemCurrentState

  getSecuritySystemCurrentState(): number {
    return this.getCharacteristicValue(CharacteristicType.SecuritySystemCurrentState) as number;
  }

  setSecuritySystemCurrentState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.SecuritySystemCurrentState, value) as number;
  }

  updateSecuritySystemCurrentState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.SecuritySystemCurrentState, value) as number;
  }

  // SecuritySystemTargetState

  getSecuritySystemTargetState(): number {
    return this.getCharacteristicValue(CharacteristicType.SecuritySystemTargetState) as number;
  }

  setSecuritySystemTargetState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.SecuritySystemTargetState, value) as number;
  }

  updateSecuritySystemTargetState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.SecuritySystemTargetState, value) as number;
  }

  // ************************************************************************************************************************

  //
  // ****************************** Heating-Cooling ******************************
  //

  // CurrentHeatingCoolingState

  getCurrentHeatingCoolingState(): number {
    return this.getCharacteristicValue(CharacteristicType.CurrentHeatingCoolingState) as number;
  }

  setCurrentHeatingCoolingState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.CurrentHeatingCoolingState, value) as number;
  }

  updateCurrentHeatingCoolingState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.CurrentHeatingCoolingState, value) as number;
  }

  // TargetHeatingCoolingState

  getTargetHeatingCoolingState(): number {
    return this.getCharacteristicValue(CharacteristicType.TargetHeatingCoolingState) as number;
  }

  setTargetHeatingCoolingState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.TargetHeatingCoolingState, value) as number;
  }

  updateTargetHeatingCoolingState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.TargetHeatingCoolingState, value) as number;
  }

  //
  // ****************************** Media State ******************************
  //

  // CurrentMediaState

  getCurrentMediaState(): number {
    return this.getCharacteristicValue(CharacteristicType.CurrentMediaState) as number;
  }

  setCurrentMediaState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.CurrentMediaState, value) as number;
  }

  updateCurrentMediaState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.CurrentMediaState, value) as number;
  }

  // TargetMediaState

  getTargetMediaState(): number {
    return this.getCharacteristicValue(CharacteristicType.TargetMediaState) as number as number;
  }

  setTargetMediaState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.TargetMediaState, value) as number;
  }

  updateTargetMediaState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.TargetMediaState, value) as number;
  }

  //
  // ****************************** Position ******************************
  //

  // CurrentPosition

  getCurrentPosition(): number {
    return this.getCharacteristicValue(CharacteristicType.CurrentPosition) as number;
  }

  setCurrentPosition(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.CurrentPosition, value) as number;
  }

  updateCurrentPosition(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.CurrentPosition, value) as number;
  }

  // TargetPosition

  getTargetPosition(): number {
    return this.getCharacteristicValue(CharacteristicType.TargetPosition) as number as number;
  }

  setTargetPosition(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.TargetPosition, value) as number;
  }

  updateTargetPosition(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.TargetPosition, value) as number;
  }

  // PositionState

  getPositionState(): number {
    return this.getCharacteristicValue(CharacteristicType.PositionState) as number;
  }

  setPositionState(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.PositionState, value) as number;
  }

  updatePositionState(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.PositionState, value) as number;
  }

  //
  // ****************************** Relative Humidity ******************************
  //

  // CurrentRelativeHumidity

  getCurrentRelativeHumidity(): number {
    return this.getCharacteristicValue(CharacteristicType.CurrentRelativeHumidity) as number;
  }

  setCurrentRelativeHumidity(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.CurrentRelativeHumidity, value) as number;
  }

  updateCurrentRelativeHumidity(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.CurrentRelativeHumidity, value) as number;
  }

  // TargetRelativeHumidity

  getTargetRelativeHumidity(): number {
    return this.getCharacteristicValue(CharacteristicType.TargetRelativeHumidity) as number;
  }

  setTargetRelativeHumidity(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.TargetRelativeHumidity, value) as number;
  }

  updateTargetRelativeHumidity(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.TargetRelativeHumidity, value) as number;
  }

  //
  // ****************************** Rotation ******************************
  //

  // RotationDirection

  getRotationDirection(): number {
    return this.getCharacteristicValue(CharacteristicType.RotationDirection) as number;
  }

  setRotationDirection(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.RotationDirection, value) as number;
  }

  updateRotationDirection(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.RotationDirection, value) as number;
  }

  // RotationSpeed

  getRotationSpeed(): number {
    return this.getCharacteristicValue(CharacteristicType.RotationSpeed) as number;
  }

  setRotationSpeed(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.RotationSpeed, value) as number;
  }

  updateRotationSpeed(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.RotationSpeed, value) as number;
  }

  //
  // ****************************** Temperature ******************************
  //

  // CurrentTemperature

  getCurrentTemperature(): number {
    return this.getCharacteristicValue(CharacteristicType.CurrentTemperature) as number;
  }

  setCurrentTemperature(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.CurrentTemperature, value) as number;
  }

  updateCurrentTemperature(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.CurrentTemperature, value) as number;
  }

  // TargetTemperature

  getTargetTemperature(): number {
    return this.getCharacteristicValue(CharacteristicType.TargetTemperature) as number;
  }

  setTargetTemperature(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.TargetTemperature, value) as number;
  }

  updateTargetTemperature(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.TargetTemperature, value) as number;
  }

  //
  // ****************************** Threshold Relative Humidity ******************************
  //

  // RelativeHumidityDehumidifierThreshold

  getRelativeHumidityDehumidifierThreshold(): number {
    return this.getCharacteristicValue(CharacteristicType.RelativeHumidityDehumidifierThreshold) as number;
  }

  setRelativeHumidityDehumidifierThreshold(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.RelativeHumidityDehumidifierThreshold, value) as number;
  }

  updateRelativeHumidityDehumidifierThreshold(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.RelativeHumidityDehumidifierThreshold, value) as number;
  }

  // RelativeHumidityHumidifierThreshold

  getRelativeHumidityHumidifierThreshold(): number {
    return this.getCharacteristicValue(CharacteristicType.RelativeHumidityHumidifierThreshold) as number;
  }

  setRelativeHumidityHumidifierThreshold(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.RelativeHumidityHumidifierThreshold, value) as number;
  }

  updateRelativeHumidityHumidifierThreshold(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.RelativeHumidityHumidifierThreshold, value) as number;
  }

  //
  // ****************************** Threshold Temperature ******************************
  //

  // CoolingThresholdTemperature

  getCoolingThresholdTemperature(): number {
    return this.getCharacteristicValue(CharacteristicType.CoolingThresholdTemperature) as number;
  }

  setCoolingThresholdTemperature(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.CoolingThresholdTemperature, value) as number;
  }

  updateCoolingThresholdTemperature(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.CoolingThresholdTemperature, value) as number;
  }

  // HeatingThresholdTemperature

  getHeatingThresholdTemperature(): number {
    return this.getCharacteristicValue(CharacteristicType.HeatingThresholdTemperature) as number;
  }

  setHeatingThresholdTemperature(
    value: number,
  ): number {
    return this.setCharacteristicValue(CharacteristicType.HeatingThresholdTemperature, value) as number;
  }

  updateHeatingThresholdTemperature(
    value: number,
  ): number {
    return this.updateCharacteristicValue(CharacteristicType.HeatingThresholdTemperature, value) as number;
  }
}
