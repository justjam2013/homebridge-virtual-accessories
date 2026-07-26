import { BinaryCharacteristicStatic, CharacteristicStatic, staticImplements } from '../utils/characteristicsInterfaces.js';

//
// ********** True/False Characteristics **********
//

@staticImplements<BinaryCharacteristicStatic>()
export class Power {

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  static getName(state: boolean): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Power.ON: { stateName = 'ON'; break; }
    case Power.OFF: { stateName = 'OFF'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}

@staticImplements<BinaryCharacteristicStatic>()
export class Mute {

  static readonly MUTED: boolean = true;      //	Characteristic.Mute
  static readonly UNMUTED: boolean = false;   //	Characteristic.Mute

  static getName(state: boolean): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Mute.MUTED: { stateName = 'MUTED'; break; }
    case Mute.UNMUTED: { stateName = 'UNMUTED'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}

//
// ********** General Characteristics **********
//

@staticImplements<CharacteristicStatic>()
export class Active {

  static readonly INACTIVE: number = 0;                 // Characteristic.Active.INACTIVE
  static readonly ACTIVE: number = 1;                   // Characteristic.Active.ACTIVE

  static getName(status: number): string {
    let activeName: string;

    switch (status) {
    case undefined: { activeName = 'undefined'; break; }
    case Active.INACTIVE: { activeName = 'INACTIVE'; break; }
    case Active.ACTIVE: { activeName = 'ACTIVE'; break; }
    default: { activeName = status.toString(); }
    }

    return activeName;
  }
}

@staticImplements<CharacteristicStatic>()
export class TemperatureDisplayUnits {

  static readonly CELSIUS: number = 0;                  // Characteristic.TemperatureDisplayUnits.CELSIUS
  static readonly FAHRENHEIT: number = 1;               // Characteristic.TemperatureDisplayUnits.FAHRENHEIT

  static getName(state: number): string {
    let unitsName: string;

    switch (state) {
    case undefined: { unitsName = 'undefined'; break; }
    case TemperatureDisplayUnits.CELSIUS: { unitsName = 'CELSIUS'; break; }
    case TemperatureDisplayUnits.FAHRENHEIT: { unitsName = 'FAHRENHEIT'; break; }
    default: { unitsName = state.toString(); }
    }

    return unitsName;
  }

  static getUnits(state: number): string {
    let units: string;

    switch (state) {
    case undefined: { units = 'º'; break; }
    case TemperatureDisplayUnits.CELSIUS: { units = 'ºC'; break; }
    case TemperatureDisplayUnits.FAHRENHEIT: { units = 'ºF'; break; }
    default: { units = 'º'; }
    }

    return units;
  }
}

// ********** Opening Accessory Characteristics **********

@staticImplements<CharacteristicStatic>()
export class CurrentPosition {

  static readonly CLOSED: number = 0;   // 0%
  static readonly OPEN: number = 100;   // 100%

  static getName(position: number): string {
    let positionName: string;

    switch (position) {
    case undefined: { positionName = 'undefined'; break; }
    case CurrentPosition.CLOSED: { positionName = 'CLOSED'; break; }
    case CurrentPosition.OPEN: { positionName = 'OPEN'; break; }
    default: { positionName = `POSITION: ${position.toString()}%`; }
    }

    if (position > CurrentPosition.OPEN) {
      positionName = `INVALID ${positionName}%`;
    }

    return positionName;
  }
}

@staticImplements<CharacteristicStatic>()
export class TargetPosition {

  static readonly CLOSED: number = 0;   // 0%
  static readonly OPEN: number = 100;   // 100%

  static getName(position: number): string {
    let positionName: string;

    switch (position) {
    case undefined: { positionName = 'undefined'; break; }
    case TargetPosition.CLOSED: { positionName = 'CLOSED'; break; }
    case TargetPosition.OPEN: { positionName = 'OPEN'; break; }
    default: { positionName = `POSITION: ${position.toString()}%`; }
    }

    if (position > TargetPosition.OPEN) {
      positionName = `INVALID ${positionName}%`;
    }

    return positionName;
  }
}

@staticImplements<CharacteristicStatic>()
export class PositionState {

  static readonly DECREASING: number = 0;   //	Characteristic.PositionState.DECREASING   -> CLOSING
  static readonly INCREASING: number = 1;   //	Characteristic.PositionState.INCREASING   -> OPENING
  static readonly STOPPED: number = 2;      //	Characteristic.PositionState.STOPPED      -> OPEN or CLOSED

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case PositionState.DECREASING: { stateName = 'DECREASING'; break; }
    case PositionState.INCREASING: { stateName = 'INCREASING'; break; }
    case PositionState.STOPPED: { stateName = 'STOPPED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

// ********** Air Purifier Characteristics **********

@staticImplements<CharacteristicStatic>()
export class CurrentAirPurifierState {

  static readonly INACTIVE: number = 0;       // Characteristic.CurrentAirPurifierState.INACTIVE
  static readonly IDLE: number = 1;           // Characteristic.CurrentAirPurifierState.IDLE
  static readonly PURIFYING_AIR: number = 2;  // Characteristic.CurrentAirPurifierState.PURIFYING_AIR

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case CurrentAirPurifierState.INACTIVE: { stateName = 'INACTIVE'; break; }
    case CurrentAirPurifierState.IDLE: { stateName = 'IDLE'; break; }
    case CurrentAirPurifierState.PURIFYING_AIR: { stateName = 'HEATING'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class TargetAirPurifierState {

  static readonly MANUAL: number = 0;                   // Characteristic.TargetAirPurifierState.MANUAL
  static readonly AUTO: number = 1;                     // Characteristic.TargetAirPurifierState.AUTO

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case TargetAirPurifierState.MANUAL: { stateName = 'MANUAL'; break; }
    case TargetAirPurifierState.AUTO: { stateName = 'AUTO'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

// ********** Battery Characteristics **********

@staticImplements<CharacteristicStatic>()
export class ChargingState {

  static readonly NOT_CHARGING: number = 0;     // Characteristic.ChargingState.NOT_CHARGING
  static readonly CHARGING: number = 1;         // Characteristic.ChargingState.CHARGING
  static readonly NOT_CHARGEABLE: number = 2;   // Characteristic.ChargingState.NOT_CHARGEABLE

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case ChargingState.NOT_CHARGING: { stateName = 'NOT CHARGING'; break; }
    case ChargingState.CHARGING: { stateName = 'CHARGING'; break; }
    case ChargingState.NOT_CHARGEABLE: { stateName = 'NOT CHARGEABLE'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class StatusLowBattery {

  static readonly BATTERY_LEVEL_NORMAL: number = 0;   // Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
  static readonly BATTERY_LEVEL_LOW: number = 1;      // Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW

  static getName(level: number): string {
    let levelName: string;

    switch (level) {
    case undefined: { levelName = 'undefined'; break; }
    case StatusLowBattery.BATTERY_LEVEL_NORMAL: { levelName = 'BATTERY LEVEL NORMAL'; break; }
    case StatusLowBattery.BATTERY_LEVEL_LOW: { levelName = 'BATTERY LEVEL LOW'; break; }
    default: { levelName = level.toString(); }
    }

    return levelName;
  }
}

// ********** Doorbell Characteristics **********

@staticImplements<CharacteristicStatic>()
export class ProgrammableSwitchEvent {

  static readonly SINGLE_PRESS: number = 0;  // Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
  static readonly DOUBLE_PRESS: number = 1;  // Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS
  static readonly LONG_PRESS: number = 2;    // Characteristic.ProgrammableSwitchEvent.LONG_PRESS

  static getName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case ProgrammableSwitchEvent.SINGLE_PRESS: { eventName = 'SINGLE PRESS'; break; }
    case ProgrammableSwitchEvent.DOUBLE_PRESS: { eventName = 'DOUBLE PRESS'; break; }
    case ProgrammableSwitchEvent.LONG_PRESS: { eventName = 'LONG PRESS'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }
}

// ********** Filter Maintenance Characteristics **********

@staticImplements<CharacteristicStatic>()
export class FilterChangeIndication {

  static readonly FILTER_OK: number = 0;      // Characteristic.FilterChangeIndication.FILTER_OK
  static readonly CHANGE_FILTER: number = 1;  // Characteristic.FilterChangeIndication.CHANGE_FILTER

  static getName(event: number): string {
    let stateName: string;

    switch (event) {
    case undefined: { stateName = 'undefined'; break; }
    case FilterChangeIndication.FILTER_OK: { stateName = 'FILTER OK'; break; }
    case FilterChangeIndication.CHANGE_FILTER: { stateName = 'CHANGE FILTER'; break; }
    default: { stateName = event.toString(); }
    }

    return stateName;
  }
}

// ********** Door Characteristics **********

@staticImplements<CharacteristicStatic>()
export class CurrentDoorState {

  static readonly OPEN: number = 0;     // Characteristic.CurrentDoorState.OPEN
  static readonly CLOSED: number = 1;   // Characteristic.CurrentDoorState.CLOSED
  static readonly OPENING: number = 2;  // Characteristic.CurrentDoorState.OPENING
  static readonly CLOSING: number = 3;  // Characteristic.CurrentDoorState.CLOSING
  static readonly STOPPED: number = 4;  // Characteristic.CurrentDoorState.STOPPED

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case CurrentDoorState.OPEN: { stateName = 'OPEN'; break; }
    case CurrentDoorState.CLOSED: { stateName = 'CLOSED'; break; }
    case CurrentDoorState.OPENING: { stateName = 'OPENING'; break; }
    case CurrentDoorState.CLOSING: { stateName = 'CLOSING'; break; }
    case CurrentDoorState.STOPPED: { stateName = 'STOPPED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class TargetDoorState {

  static readonly OPEN: number = 0;     // Characteristic.TargetDoorState.OPEN
  static readonly CLOSED: number = 1;   // Characteristic.TargetDoorState.CLOSED

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case TargetDoorState.OPEN: { stateName = 'OPEN'; break; }
    case TargetDoorState.CLOSED: { stateName = 'CLOSED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

// ********** Heater-Cooler Characteristics **********

@staticImplements<CharacteristicStatic>()
export class CurrentHeaterCoolerState {

  static readonly INACTIVE: number = 0;       // Characteristic.CurrentHeaterCoolerState.INACTIVE
  static readonly IDLE: number = 1;           // Characteristic.CurrentHeaterCoolerState.IDLE
  static readonly HEATING: number = 2;        // Characteristic.CurrentHeaterCoolerState.HEATING
  static readonly COOLING: number = 3;        // Characteristic.CurrentHeaterCoolerState.COOLING

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case CurrentHeaterCoolerState.INACTIVE: { stateName = 'INACTIVE'; break; }
    case CurrentHeaterCoolerState.IDLE: { stateName = 'IDLE'; break; }
    case CurrentHeaterCoolerState.HEATING: { stateName = 'HEATING'; break; }
    case CurrentHeaterCoolerState.COOLING: { stateName = 'COOLING'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class TargetHeaterCoolerState {

  static readonly AUTO: number = 0;                     // Characteristic.TargetHeaterCoolerState.AUTO 
  static readonly HEAT: number = 1;                     // Characteristic.TargetHeaterCoolerState.HEAT
  static readonly COOL: number = 2;                     // Characteristic.TargetHeaterCoolerState.COOL

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case TargetHeaterCoolerState.AUTO: { stateName = 'AUTO'; break; }
    case TargetHeaterCoolerState.HEAT: { stateName = 'HEAT'; break; }
    case TargetHeaterCoolerState.COOL: { stateName = 'COOL'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

// ********** Humidifier-Dehumidifier Characteristics **********

@staticImplements<CharacteristicStatic>()
export class CurrentHumidifierDehumidifierState {

  static readonly INACTIVE: number = 0;             // Characteristic.CurrentHumidifierDehumidifierState.INACTIVE
  static readonly IDLE: number = 1;                 // Characteristic.CurrentHumidifierDehumidifierState.IDLE
  static readonly HUMIDIFYING: number = 2;          // Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING
  static readonly DEHUMIDIFYING: number = 3;        // Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case CurrentHumidifierDehumidifierState.INACTIVE: { stateName = 'INACTIVE'; break; }
    case CurrentHumidifierDehumidifierState.IDLE: { stateName = 'IDLE'; break; }
    case CurrentHumidifierDehumidifierState.HUMIDIFYING: { stateName = 'HUMIDIFYING'; break; }
    case CurrentHumidifierDehumidifierState.DEHUMIDIFYING: { stateName = 'DEHUMIDIFYING'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class TargetHumidifierDehumidifierState {

  static readonly AUTOMATIC: number = 0;                      // Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER 
  static readonly HUMIDIFY: number = 1;                       // Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER
  static readonly DEHUMIDIFY: number = 2;                     // Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case TargetHumidifierDehumidifierState.AUTOMATIC: { stateName = 'AUTO'; break; }
    case TargetHumidifierDehumidifierState.HUMIDIFY: { stateName = 'HUMIDIFY'; break; }
    case TargetHumidifierDehumidifierState.DEHUMIDIFY: { stateName = 'DEHUMIDIFY'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

// ********** Input Source Characteristics **********

@staticImplements<CharacteristicStatic>()
export class InputSourceType {

  static readonly OTHER = 0;              // Characteristic.InputSourceType.OTHER
  static readonly HOME_SCREEN = 1;        // Characteristic.InputSourceType.HOME_SCREEN
  static readonly TUNER = 2;              // Characteristic.InputSourceType.TUNER
  static readonly HDMI = 3;               // Characteristic.InputSourceType.HDMI
  static readonly COMPOSITE_VIDEO = 4;    // Characteristic.InputSourceType.COMPOSITE_VIDEO
  static readonly S_VIDEO = 5;            // Characteristic.InputSourceType.S_VIDEO
  static readonly COMPONENT_VIDEO = 6;    // Characteristic.InputSourceType.COMPONENT_VIDEO
  static readonly DVI = 7;                // Characteristic.InputSourceType.DVI
  static readonly AIRPLAY = 8;            // Characteristic.InputSourceType.AIRPLAY
  static readonly USB = 9;                // Characteristic.InputSourceType.USB
  static readonly APPLICATION = 10;       // Characteristic.InputSourceType.APPLICATION

  static getName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case InputSourceType.OTHER: { eventName = 'OTHER'; break; }
    case InputSourceType.HOME_SCREEN: { eventName = 'HOME SCREEN'; break; }
    case InputSourceType.TUNER: { eventName = 'TUNER'; break; }
    case InputSourceType.HDMI: { eventName = 'HDMI'; break; }
    case InputSourceType.COMPOSITE_VIDEO: { eventName = 'COMPOSITE VIDEO'; break; }
    case InputSourceType.S_VIDEO: { eventName = 'S VIDEO'; break; }
    case InputSourceType.COMPONENT_VIDEO: { eventName = 'COMPONENT VIDEO'; break; }
    case InputSourceType.DVI: { eventName = 'DVI'; break; }
    case InputSourceType.AIRPLAY: { eventName = 'AIRPLAY'; break; }
    case InputSourceType.USB: { eventName = 'USB'; break; }
    case InputSourceType.APPLICATION: { eventName = 'APPLICATION'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }
}

@staticImplements<CharacteristicStatic>()
export class IsConfigured {

  static readonly NOT_CONFIGURED = 0;     // Characteristic.IsConfigured.NOT_CONFIGURED
  static readonly CONFIGURED = 1;         // Characteristic.IsConfigured.CONFIGURED

  static getName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case IsConfigured.NOT_CONFIGURED: { eventName = 'NOT CONFIGURED'; break; }
    case IsConfigured.CONFIGURED: { eventName = 'CONFIGURED'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }
}

@staticImplements<CharacteristicStatic>()
export class CurrentVisibilityState {

  static readonly SHOWN = 0;              // Characteristic.CurrentVisibilityState.SHOWN
  static readonly HIDDEN = 1;             // Characteristic.CurrentVisibilityState.HIDDEN

  static getName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case CurrentVisibilityState.SHOWN: { eventName = 'SHOWN'; break; }
    case CurrentVisibilityState.HIDDEN: { eventName = 'HIDDEN'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }
}

// ********** Lock Characteristics **********

@staticImplements<CharacteristicStatic>()
export class LockCurrentState {

  static readonly UNSECURED: number = 0;  // Characteristic.LockCurrentState.UNSECURED
  static readonly SECURED: number = 1;    // Characteristic.LockCurrentState.SECURED
  static readonly JAMMED: number = 2;     // Characteristic.LockCurrentState.JAMMED
  static readonly UNKNOWN: number = 3;    // Characteristic.LockCurrentState.UNKNOWN

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case LockCurrentState.UNSECURED: { stateName = 'UNSECURED'; break; }
    case LockCurrentState.SECURED: { stateName = 'SECURED'; break; }
    case LockCurrentState.JAMMED: { stateName = 'JAMMED'; break; }
    case LockCurrentState.UNKNOWN: { stateName = 'UNKNOWN'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class LockTargetState {

  static readonly UNSECURED: number = 0;  // Characteristic.LockTargetState.UNSECURED
  static readonly SECURED: number = 1;    // Characteristic.LockTargetState.SECURED

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case LockTargetState.UNSECURED: { stateName = 'UNSECURED'; break; }
    case LockTargetState.SECURED: { stateName = 'SECURED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class LockLastKnownAction {

  static readonly SECURED_REMOTELY: number = 6;                 // Characteristic.LockLastKnownAction.SECURED_REMOTELY
  static readonly UNSECURED_REMOTELY: number = 7;               // Characteristic.LockLastKnownAction.UNSECURED_REMOTELY
  static readonly SECURED_BY_AUTO_SECURE_TIMEOUT: number = 8;   // Characteristic.LockLastKnownAction.SECURED_BY_AUTO_SECURE_TIMEOUT

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case LockLastKnownAction.SECURED_REMOTELY: { stateName = 'SECURED REMOTELY'; break; }
    case LockLastKnownAction.UNSECURED_REMOTELY: { stateName = 'UNSECURED REMOTELY'; break; }
    case LockLastKnownAction.SECURED_BY_AUTO_SECURE_TIMEOUT: { stateName = 'SECURED BY AUTO SECURE TIMEOUT'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

// ********** Security System Characteristics **********

@staticImplements<CharacteristicStatic>()
export class SecuritySystemCurrentState {

  static readonly STAY_ARM: number = 0;         // Characteristic.SecuritySystemCurrentState.STAY_ARM
  static readonly AWAY_ARM: number = 1;         // Characteristic.SecuritySystemCurrentState.AWAY_ARM
  static readonly NIGHT_ARM: number = 2;        // Characteristic.SecuritySystemCurrentState.NIGHT_ARM
  static readonly DISARMED: number = 3;         // Characteristic.SecuritySystemCurrentState.DISARMED
  static readonly ALARM_TRIGGERED: number = 4;  // Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case SecuritySystemCurrentState.STAY_ARM: { stateName = 'STAY_ARM'; break; }
    case SecuritySystemCurrentState.AWAY_ARM: { stateName = 'AWAY_ARM'; break; }
    case SecuritySystemCurrentState.NIGHT_ARM: { stateName = 'NIGHT_ARM'; break; }
    case SecuritySystemCurrentState.DISARMED: { stateName = 'DISARMED'; break; }
    case SecuritySystemCurrentState.ALARM_TRIGGERED: { stateName = 'ALARM_TRIGGERED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class SecuritySystemTargetState {

  static readonly STAY_ARM: number = 0;         // Characteristic.SecuritySystemTargetState.STAY_ARM
  static readonly AWAY_ARM: number = 1;         // Characteristic.SecuritySystemTargetState.AWAY_ARM
  static readonly NIGHT_ARM: number = 2;        // Characteristic.SecuritySystemTargetState.NIGHT_ARM
  static readonly DISARMED: number = 3;         // Characteristic.SecuritySystemTargetState.DISARMED

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case SecuritySystemTargetState.STAY_ARM: { stateName = 'STAY_ARM'; break; }
    case SecuritySystemTargetState.AWAY_ARM: { stateName = 'AWAY_ARM'; break; }
    case SecuritySystemTargetState.NIGHT_ARM: { stateName = 'NIGHT_ARM'; break; }
    case SecuritySystemTargetState.DISARMED: { stateName = 'DISARMED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

// ********** Smart Speaker Characteristics **********

@staticImplements<CharacteristicStatic>()
export class CurrentMediaState {

  static readonly PLAY: number = 0;           //	Characteristic.CurrentMediaState.PLAY
  static readonly PAUSE: number = 1;          //	Characteristic.CurrentMediaState.PAUSE
  static readonly STOP: number = 2;           //	Characteristic.CurrentMediaState.STOP
  static readonly LOADING: number = 3;        //	Characteristic.CurrentMediaState.LOADING
  static readonly INTERRUPTED: number = 4;    //	Characteristic.CurrentMediaState.INTERRUPTED

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case CurrentMediaState.PLAY: { stateName = 'PLAY'; break; }
    case CurrentMediaState.PAUSE: { stateName = 'PAUSE'; break; }
    case CurrentMediaState.STOP: { stateName = 'STOP'; break; }
    case CurrentMediaState.LOADING: { stateName = 'LOADING'; break; }
    case CurrentMediaState.INTERRUPTED: { stateName = 'INTERRUPTED'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class TargetMediaState {

  static readonly PLAY: number = 0;           //	Characteristic.TargetMediaState.PLAY
  static readonly PAUSE: number = 1;          //	Characteristic.TargetMediaState.PAUSE
  static readonly STOP: number = 2;           //	Characteristic.TargetMediaState.STOP

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case TargetMediaState.PLAY: { stateName = 'PLAY'; break; }
    case TargetMediaState.PAUSE: { stateName = 'PAUSE'; break; }
    case TargetMediaState.STOP: { stateName = 'STOP'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}

// ********** Television Characteristics **********

@staticImplements<CharacteristicStatic>()
export class SleepDiscoveryMode {

  static readonly NOT_DISCOVERABLE: number = 0;       // Characteristic.SleepDiscoveryMode.NOT_DISCOVERABLE
  static readonly ALWAYS_DISCOVERABLE: number = 1;    // Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case SleepDiscoveryMode.NOT_DISCOVERABLE: { stateName = 'NOT DISCOVERABLE'; break; }
    case SleepDiscoveryMode.ALWAYS_DISCOVERABLE: { stateName = 'ALWAYS DISCOVERABLE'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class RemoteKey {

  static readonly REWIND: number = 0;                 // Characteristic.RemoteKey.REWIND
  static readonly FAST_FORWARD: number = 1;           // Characteristic.RemoteKey.FAST_FORWARD
  static readonly NEXT_TRACK: number = 2;             // Characteristic.RemoteKey.NEXT_TRACK
  static readonly PREVIOUS_TRACK: number = 3;         // Characteristic.RemoteKey.PREVIOUS_TRACK
  static readonly ARROW_UP: number = 4;               // Characteristic.RemoteKey.ARROW_UP
  static readonly ARROW_DOWN: number = 5;             // Characteristic.RemoteKey.ARROW_DOWN
  static readonly ARROW_LEFT: number = 6;             // Characteristic.RemoteKey.ARROW_LEFT
  static readonly ARROW_RIGHT: number = 7;	          // Characteristic.RemoteKey.ARROW_RIGHT
  static readonly SELECT: number = 8;	                // Characteristic.RemoteKey.SELECT
  static readonly BACK: number = 9;	                  // Characteristic.RemoteKey.BACK
  static readonly EXIT: number = 10;	                // Characteristic.RemoteKey.EXIT
  static readonly PLAY_PAUSE: number = 11;	          // Characteristic.RemoteKey.PLAY_PAUSE
  static readonly INFORMATION: number = 15;	          // Characteristic.RemoteKey.INFORMATION

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case RemoteKey.REWIND: { stateName = 'REWIND'; break; }
    case RemoteKey.FAST_FORWARD: { stateName = 'FAST FORWARD'; break; }
    case RemoteKey.NEXT_TRACK: { stateName = 'NEXT TRACK'; break; }
    case RemoteKey.PREVIOUS_TRACK: { stateName = 'PREVIOUS TRACK'; break; }
    case RemoteKey.ARROW_UP: { stateName = 'ARROW UP'; break; }
    case RemoteKey.ARROW_DOWN: { stateName = 'ARROW DOWN'; break; }
    case RemoteKey.ARROW_LEFT: { stateName = 'ARROW LEFT'; break; }
    case RemoteKey.ARROW_RIGHT: { stateName = 'ARROW RIGHT'; break; }
    case RemoteKey.SELECT: { stateName = 'SELECT'; break; }
    case RemoteKey.BACK: { stateName = 'BACK'; break; }
    case RemoteKey.EXIT: { stateName = 'EXIT'; break; }
    case RemoteKey.PLAY_PAUSE: { stateName = 'PLAY PAUSE'; break; }
    case RemoteKey.INFORMATION: { stateName = 'INFORMATION'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}

// ********** Valve Characteristics **********

@staticImplements<CharacteristicStatic>()
export class ValveType {

  static readonly GENERIC_VALVE: number = 0;  // Characteristic.ValveType.GENERIC_VALVE
  static readonly IRRIGATION: number = 1;     // Characteristic.ValveType.IRRIGATION
  static readonly SHOWER_HEAD: number = 2;    // Characteristic.ValveType.SHOWER_HEAD
  static readonly WATER_FAUCET: number = 3;   // Characteristic.ValveType.WATER_FAUCET

  static getName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case ValveType.GENERIC_VALVE: { eventName = 'GENERIC VALVE'; break; }
    case ValveType.IRRIGATION: { eventName = 'IRRIGATION'; break; }
    case ValveType.SHOWER_HEAD: { eventName = 'SHOWER HEAD'; break; }
    case ValveType.WATER_FAUCET: { eventName = 'WATER FAUCET'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }
}

@staticImplements<CharacteristicStatic>()
export class InUse {

  static readonly NOT_IN_USE: number = 0;   // Characteristic.InUse.NOT_IN_USE
  static readonly IN_USE: number = 1;       // Characteristic.InUse.IN_USE

  static getName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case InUse.NOT_IN_USE: { eventName = 'NOT IN USE'; break; }
    case InUse.IN_USE: { eventName = 'IN USE'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }
}
