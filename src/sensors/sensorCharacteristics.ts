import { CharacteristicStatic, staticImplements } from '../utils/characteristicsInterfaces.js';

//
// ********** Binary Sensor Characteristics **********
//

@staticImplements<CharacteristicStatic>()
export class TriggeredState {

  static readonly NORMAL: number = 0;
  static readonly TRIGGERED: number = 1;

  static getName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case TriggeredState.NORMAL: { sensorStateName = 'NORMAL_INACTIVE'; break; }
    case TriggeredState.TRIGGERED: { sensorStateName = 'TRIGGERED_ACTIVE'; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}

//
// ********** Sensor Characteristics **********
//

@staticImplements<CharacteristicStatic>()
export class CarbonDioxideDetected {

  static readonly CO2_LEVELS_NORMAL: number = 0;    // Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
  static readonly CO2_LEVELS_ABNORMAL: number = 1;  // Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case CarbonDioxideDetected.CO2_LEVELS_NORMAL: { stateName = 'CO2 LEVELS NORMAL'; break; }
    case CarbonDioxideDetected.CO2_LEVELS_ABNORMAL: { stateName = 'CO2 LEVELS ABNORMAL'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class CarbonMonoxideDetected {

  static readonly CO_LEVELS_NORMAL: number = 0;     // Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
  static readonly CO_LEVELS_ABNORMAL: number = 1;   // Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;

  static getName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case CarbonMonoxideDetected.CO_LEVELS_NORMAL: { stateName = 'CO_LEVELS_NORMAL'; break; }
    case CarbonMonoxideDetected.CO_LEVELS_ABNORMAL: { stateName = 'CO_LEVELS_ABNORMAL'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class ContactSensorState {

  static readonly CONTACT_DETECTED: number = 0;       // Characteristic.ContactSensorState.CONTACT_DETECTED;
  static readonly CONTACT_NOT_DETECTED: number = 1;   // Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;

  static getName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case ContactSensorState.CONTACT_DETECTED: { sensorStateName = 'CONTACT DETECTED'; break; }
    case ContactSensorState.CONTACT_NOT_DETECTED: { sensorStateName = 'CONTACT NOT DETECTED'; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class LeakDetected {

  static readonly LEAK_NOT_DETECTED: number = 0;  // Characteristic.LeakDetected.LEAK_NOT_DETECTED;
  static readonly LEAK_DETECTED: number = 1;      // Characteristic.LeakDetected.LEAK_DETECTED;

  static getName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case LeakDetected.LEAK_NOT_DETECTED: { sensorStateName = 'LEAK NOT DETECTED'; break; }
    case LeakDetected.LEAK_DETECTED: { sensorStateName = 'LEAK DETECTED'; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class MotionDetected {

  static readonly MOTION_NOT_DETECTED: number = 0;  // No Charteristic exists for Motion sensor. Modeled on other sensors
  static readonly MOTION_DETECTED: number = 1;      // No Charteristic exists for Motion sensor. Modeled on other sensors

  static getName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case MotionDetected.MOTION_NOT_DETECTED: { sensorStateName = 'MOTION NOT DETECTED'; break; }
    case MotionDetected.MOTION_DETECTED: { sensorStateName = 'MOTION DETECTED'; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class OccupancyDetected {

  static readonly OCCUPANCY_NOT_DETECTED: number = 0;   // Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
  static readonly OCCUPANCY_DETECTED: number = 1;       // Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;

  static getName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case OccupancyDetected.OCCUPANCY_NOT_DETECTED: { sensorStateName = 'OCCUPANCY NOT DETECTED'; break; }
    case OccupancyDetected.OCCUPANCY_DETECTED: { sensorStateName = 'OCCUPANCY DETECTED'; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}

@staticImplements<CharacteristicStatic>()
export class SmokeDetected {

  static readonly SMOKE_NOT_DETECTED: number = 0;   // Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
  static readonly SMOKE_DETECTED: number = 1;       // Characteristic.SmokeDetected.SMOKE_DETECTED;

  static getName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case SmokeDetected.SMOKE_NOT_DETECTED: { sensorStateName = 'SMOKE_NOT_DETECTED'; break; }
    case SmokeDetected.SMOKE_DETECTED: { sensorStateName = 'SMOKE_DETECTED'; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}
