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
  static SensorBinary: string = 'sensor';
  static SensorMeasurement: string = 'measurement';
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
export class DeviceType {

  static HomeKit: string = 'homekit';
  static Matter: string = 'matter';

  static Types: string[] = [
    DeviceType.HomeKit,
    DeviceType.Matter,
  ];
}

/**
 * 
 */
export class BinarySensorType {

  static CarbonDioxide: string = 'carbonDioxide';
  static CarbonMonoxide: string = 'carbonMonoxide';
  static Contact: string = 'contact';
  static Leak: string = 'leak';
  static Motion: string = 'motion';
  static Occupancy: string = 'occupancy';
  static Smoke: string = 'smoke';

  static Types: string[] = [
    BinarySensorType.CarbonDioxide,
    BinarySensorType.CarbonMonoxide,
    BinarySensorType.Contact,
    BinarySensorType.Leak,
    BinarySensorType.Motion,
    BinarySensorType.Occupancy,
    BinarySensorType.Smoke,
  ];
}

/**
 * 
 */
export class MeasurementSensorType {

  static Humidity: string = 'humidity';
  static Temperature: string = 'temperature';

  static Types: string[] = [
    MeasurementSensorType.Humidity,
    MeasurementSensorType.Temperature,
  ];
}

/**
 * 
 */
export class TriggerType {

  static Cron: string = 'cron';
  static IkeaMatterStock: string = 'ikeamatterstock';
  static Ping: string = 'ping';
  static SunEvents: string = 'sunevents';
  static Webhook: string = 'webhook';
  static Startup: string = 'startup';

  static Types: string[] = [
    TriggerType.Cron,
    TriggerType.IkeaMatterStock,
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
  static Sauna: string = 'sauna';

  static Types: string[] = [ HeaterType.Auto, HeaterType.Cooler, HeaterType.Heater, HeaterType.Sauna ];
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

  // HomeKit units: ºC

  static CoolingThresholdMin: number = 10;
  static CoolingThresholdMax: number = 35;

  static HeatingThresholdMin: number = 0;
  static HeatingThresholdMax: number = 25;

  // Sauna thresholds
  static SaunaHeatingThresholdMin: number = 15;
  static SaunaHeatingThresholdMax: number = 90;
}

/**
 * 
 */
export class ValveDuration {

  static DurationMin: number = 0;
  static DurationMax: number = 3600;
}

/**
 * 
 */
export class WalletKeyColor {

  static Tan: string = 'tan';
  static Gold: string = 'gold';
  static Silver: string = 'silver';
  static Black: string = 'black';

  static Colors: string[] = [ WalletKeyColor.Black, WalletKeyColor.Gold, WalletKeyColor.Silver, WalletKeyColor.Tan ];
}
