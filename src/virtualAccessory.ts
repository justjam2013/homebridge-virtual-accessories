import type { PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoryPlatform } from './platform.js';

import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';

/**
 * Virtual Accessory
 * Abstract superclass for all virtual accessories and place to store common functionality
 */
export abstract class VirtualAccessory {
  protected service!: Service;

  protected readonly platform: VirtualAccessoryPlatform;
  protected readonly accessory: PlatformAccessory;

  protected device;
  protected isStateful;
  protected defaultState;
  protected hasResetTimer;
  protected hasCompanionSensor;

  protected storagePath: string;

  protected timerId;
  protected sensorService;
  protected sensorCharacteristic;

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    this.accessory = accessory;
    this.platform = platform;

    // The device configuration is stored in the context in VirtualAccessoryPlatform.discoverDevices()
    this.device = accessory.context.deviceConfiguration;

    this.platform.log.debug(`[${this.device.accessoryName}] Accessory context: ${JSON.stringify(accessory.context)}`);

    this.isStateful = this.device.accessoryIsStateful;
    this.hasResetTimer = this.device.accessoryHasResetTimer;
    this.hasCompanionSensor = this.device.accessoryHasCompanionSensor;

    this.storagePath = accessory.context.storagePath;

    if (!this.isStateful) {
      this.deleteState(this.storagePath);
    }
  }

  protected loadState(
    storagePath: string,
    key: string,
  ): boolean | number {
    let contents = '{}';
    if (existsSync(storagePath)) {
      contents = readFileSync(storagePath, 'utf8');
    }

    const json = JSON.parse(contents);

    this.platform.log.info(`[${this.device.accessoryName}] Stored state: ${JSON.stringify(json)}`);
    return json[key];
  }

  protected saveState(
    storagePath: string,
    key: string,
    value: boolean | number,
  ): void {
    // Overwrite the existing persistence file
    this.platform.log.info(`[${this.device.accessoryName}] Saving state: ${key} ${value}`);
    writeFileSync(
      storagePath,
      JSON.stringify({
        [key]: value,
      }),
      { encoding: 'utf8', flag: 'w' },
    );
  }

  protected deleteState(
    storagePath: string,
  ): void {
    if (existsSync(storagePath)) {
      try {
        unlinkSync(storagePath); 
      } catch (err) {
        // For now ignore
      }
    }
  }

  protected createCompanionSensor(
    uuid: string,
    sensorConfig,
  ): Service {
    let sensorService;
    switch (sensorConfig.type) {
    // case "airQuality":
    //   // int: 0-5
    //   sensorService = this.platform.Service.AirQualitySensor;
    //   this.sensorCharacteristic = this.platform.Characteristic.AirQuality;
    //   break;
    case 'carbonDioxide':
      // 0,1
      sensorService = this.platform.Service.CarbonDioxideSensor;
      this.sensorCharacteristic = this.platform.Characteristic.CarbonDioxideDetected;
      break;
    case 'carbonMonoxide':
      // 0,1
      sensorService = this.platform.Service.CarbonMonoxideSensor;
      this.sensorCharacteristic = this.platform.Characteristic.CarbonMonoxideDetected;
      break;
    case 'contact':
      // 0,1
      sensorService = this.platform.Service.ContactSensor;
      this.sensorCharacteristic = this.platform.Characteristic.ContactSensorState;
      break;
    // case "humidity":
      //   // float
      //   sensorService = this.platform.Service.HumiditySensor;
      //   this.sensorCharacteristic = this.platform.Characteristic.CurrentRelativeHumidity;
      //   break;
    case 'leak':
      // 0,1
      sensorService = this.platform.Service.LeakSensor;
      this.sensorCharacteristic = this.platform.Characteristic.LeakDetected;
      break;
    // case "light":
      //   // float
      //   sensorService = this.platform.Service.LightSensor;
      //   this.sensorCharacteristic = this.platform.Characteristic.CurrentAmbientLightLevel;
      //   break;
    case 'motion':
      // T,F
      sensorService = this.platform.Service.MotionSensor;
      this.sensorCharacteristic = this.platform.Characteristic.MotionDetected;
      break;
    case 'occupancy':
      // 0,1
      sensorService = this.platform.Service.OccupancySensor;
      this.sensorCharacteristic = this.platform.Characteristic.OccupancyDetected;
      break;
    case 'smoke':
      // 0,1
      sensorService = this.platform.Service.SmokeSensor;
      this.sensorCharacteristic = this.platform.Characteristic.SmokeDetected;
      break;
    // case "temperature":
      //   // float
      //   sensorService = this.platform.Service.TemperatureSensor;
      //   this.sensorCharacteristic = this.platform.Characteristic.CurrentTemperature;
      //   break;
    default:
      // 0,1
      sensorService = this.platform.Service.ContactSensor;
      this.sensorCharacteristic = this.platform.Characteristic.ContactSensorState;
    }

    const sensor: Service = this.accessory.getService(sensorConfig.name) || this.accessory.addService(sensorService, sensorConfig.name, uuid + '-sensor');
    return sensor;
  }
}
