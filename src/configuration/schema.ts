/**
 * 
 */
export class AccessoryType {

  static AirPurifier: string = 'airpurifier';
  static Battery: string = 'battery';
  static Door: string = 'door';
  static Doorbell: string = 'doorbell';
  static Fan: string = 'fan';
  static FilterMaintenance: string = 'filtermaintenance';
  static GarageDoor: string = 'garagedoor';
  static HeaterCooler: string = 'heatercooler';
  static HumidifierDehumidifier: string = 'humidifierdehumidifier';
  static Lightbulb: string = 'lightbulb';
  static Lock: string = 'lock';
  static Microphone: string = 'microphone';
  static SecuritySystem: string = 'securitysystem';
  static Sensor: string = 'sensor';
  static Speaker: string = 'speaker';
  static Switch: string = 'switch';
  static Television: string = 'television';
  static Valve: string = 'valve';
  static Window: string = 'window';
  static WindowCovering: string = 'windowcovering';
}

/**
 * 
 */
export class SensorType {

  static CarbonDioxide: string = 'carbonDioxide';
  static CarbonMonoxide: string = 'carbonMonoxide';
  static Contact: string = 'contact';
  static Leak: string = 'leak';
  static Motion: string = 'motion';
  static Occupancy: string = 'occupancy';
  static Smoke: string = 'smoke';

  static Types: string[] = [
    SensorType.CarbonDioxide,
    SensorType.CarbonMonoxide,
    SensorType.Contact,
    SensorType.Leak,
    SensorType.Motion,
    SensorType.Occupancy,
    SensorType.Smoke,
  ];
}

/**
 * 
 */
export class TriggerType {

  static Cron: string = 'cron';
  static Ping: string = 'ping';
  static SunEvents: string = 'sunevents';
  static Webhook: string = 'webhook';
  static Startup: string = 'startup';

  static Types: string[] = [
    TriggerType.Cron,
    TriggerType.Ping,
    TriggerType.SunEvents,
    TriggerType.Webhook,
    TriggerType.Startup,
  ];
}

/**
 * 
 */
export class SunEvent {

  static Sunrise: string = 'sunrise';
  static Sunset: string = 'sunset';
  static GoldenHour: string = 'goldenhour';

  static Events: string[] = [ SunEvent.Sunrise, SunEvent.Sunset, SunEvent.GoldenHour ];
}

/**
 * 
 */
export class OpenableState {

  static Closed: string = 'closed';
  static Open: string = 'open';

  static States: string[] = [ OpenableState.Closed, OpenableState.Open ];
}

/**
 * 
 */
export class TemperatureUnit {

  static Celsius: string = 'celsius';
  static Fahrenheit: string = 'fahrenheit';

  static Units: string[] = [ TemperatureUnit.Celsius, TemperatureUnit.Fahrenheit ];
}

/**
 * 
 */
export class HeaterType {

  static Auto: string = 'auto';
  static Cooler: string = 'cooler';
  static Heater: string = 'heater';

  static Types: string[] = [ HeaterType.Auto, HeaterType.Cooler, HeaterType.Heater ];
}

/**
 * 
 */
export class HumidifierType {

  static Auto: string = 'auto';
  static Dehumidifier: string = 'dehumidifier';
  static Humidifier: string = 'humidifier';

  static Types: string[] = [ HumidifierType.Auto, HumidifierType.Dehumidifier, HumidifierType.Humidifier ];
}

/**
 * 
 */
export class LightbulbType {

  static Ambiance: string = 'ambiance';
  static Color: string = 'color';
  static White: string = 'white';

  static Types: string[] = [ LightbulbType.Ambiance, LightbulbType.Color, LightbulbType.White ];
}

/**
 * 
 */
export class LockState {

  static Locked: string = 'locked';
  static Unlocked: string = 'unlocked';

  static States: string[] = [ LockState.Locked, LockState.Unlocked ];
}

/**
 * 
 */
export class SecuritySystemState {

  static ArmedAway: string = 'armedaway';
  static ArmedNight: string = 'armednight';
  static ArmedStay: string = 'armedstay';
  static Disarmed: string = 'disarmed';
  static AlarmTriggered: string = 'alarmtriggered';

  static States: string[] = [
    SecuritySystemState.ArmedAway,
    SecuritySystemState.ArmedNight,
    SecuritySystemState.ArmedStay,
    SecuritySystemState.Disarmed,
    SecuritySystemState.AlarmTriggered,
  ];
}

/**
 * 
 */
export class SecuritySystemArmedMode {

  static ArmedAway: string = 'Away';
  static ArmedNight: string = 'Night';
  static ArmedStay: string = 'Home';

  static ArmedModes: string[] = [ SecuritySystemArmedMode.ArmedAway, SecuritySystemArmedMode.ArmedNight, SecuritySystemArmedMode.ArmedStay ];
}

/**
 * 
 */
export class ValveType {

  static Generic: string = 'generic';
  static Irrigation: string = 'irrigation';
  static Showerhead: string = 'showerhead';
  static Waterfaucet: string = 'waterfaucet';

  static Types: string[] = [ ValveType.Generic, ValveType.Irrigation, ValveType.Showerhead, ValveType.Waterfaucet ];
}

/**
 * 
 */
export class RotationDirection {

  static Clockwise: string = 'clockwise';
  static CounterClockwise: string = 'counterclockwise';

  static Directions: string[] = [ RotationDirection.Clockwise, RotationDirection.CounterClockwise ];
}

/**
 * 
 */
export class PowerState {

  static Off: string = 'off';
  static On: string = 'on';

  static States: string[] = [ PowerState.Off, PowerState.On ];
}

/**
 * 
 */
export class ColorTemperature {

  static TemperatureKelvinMin: number = 2000;
  static TemperatureKelvinMax: number = 6500;
}

/**
 * 
 */
export class ThresholdTemperature {

  static CoolingThresholdCelsiusMin: number = 10;
  static CoolingThresholdCelsiusMax: number = 35;

  static CoolingThresholdFahrenheitMin: number = 50;
  static CoolingThresholdFahrenheitMax: number = 95;

  static HeatingThresholdCelsiusMin: number = 0;
  static HeatingThresholdCelsiusMax: number = 25;

  static HeatingThresholdFahrenheitMin: number = 32;
  static HeatingThresholdFahrenheitMax: number = 77;
}

/**
 * 
 */
export class ValveDuration {

  static DurationMin: number = 0;
  static DurationMax: number = 3600;
}
