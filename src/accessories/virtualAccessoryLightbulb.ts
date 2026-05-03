/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable brace-style */
 
import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { ColorHSL, Colors } from '../utils/colorUtils.js';
import { Utils } from '../utils/utils.js';
import { Power } from './accessoryCharacteristics.js';

/**
 * Lightbulb - Accessory implementation
 */
export class Lightbulb extends Accessory<typeof Service.Lightbulb> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'Lightbulb';

  static readonly WHITE: string = 'white';
  static readonly AMBIANCE: string = 'ambiance';
  static readonly COLOR: string = 'color';

  private readonly stateStorageKey: string = 'LightbulbState';
  private readonly brightnessStorageKey: string = 'LightbulbBrightness';
  private readonly colorTemperatureStorageKey: string = 'LightbulbColorTemperature';
  private readonly hueStorageKey: string = 'LightbulbHue';
  private readonly saturationStorageKey: string = 'LightbulbSaturation';

  private type: string = Lightbulb.WHITE;

  // Device states
  private PowerState: boolean = Power.OFF;
  private Brightness: number = 0;
  private ColorTemperature: number = 2700;  // Kelvin
  private Hue: number = 0;
  private Saturation: number = 0;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.Lightbulb,
      Lightbulb.ACCESSORY_TYPE_NAME,
    );

    this.type = this.accessoryConfiguration.lightbulb.type;

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.lightbulb.defaultState === 'on' ? Power.ON : Power.OFF;
    const brightness: number = this.accessoryConfiguration.lightbulb.brightness;
    const colorTemperatureKelvin: number = this.accessoryConfiguration.lightbulb.colorTemperatureKelvin;
    const colorHex: string = this.accessoryConfiguration.lightbulb.colorHex;

    this.PowerState = this.defaultState;
    this.Brightness = brightness;

    if (this.type === Lightbulb.WHITE) {
      this.Brightness = brightness;
    }
    else if (this.type === Lightbulb.AMBIANCE) {
      this.Brightness = brightness;
      this.ColorTemperature = colorTemperatureKelvin;
    }
    else if (this.type === Lightbulb.COLOR) {
      const hsl: ColorHSL = Colors.HexToHSL(colorHex)!;
      this.Hue = hsl.hue;
      this.Saturation = hsl.saturation;
      this.Brightness = hsl.luminance;
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;
      const cachedBrightness: number = accessoryState[this.brightnessStorageKey] as number;
      const cachedColorTemperature: number = accessoryState[this.colorTemperatureStorageKey] as number;
      const cachedHue: number = accessoryState[this.hueStorageKey] as number;
      const cachedSaturation: number = accessoryState[this.saturationStorageKey] as number;

      if (cachedState !== undefined) {
        this.PowerState = cachedState;
      }
      if (cachedBrightness !== undefined) {
        this.Brightness = cachedBrightness;
      }

      if (this.type === Lightbulb.AMBIANCE && cachedColorTemperature !== undefined) {
        this.ColorTemperature = cachedColorTemperature;
      }

      if (this.type === Lightbulb.COLOR) {
        if (cachedHue !== undefined) {
          this.Hue = cachedHue;
        }
        if (cachedSaturation !== undefined) {
          this.Saturation = cachedSaturation;
        }
      }
    }

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Lightbulb Current State: ${Power.getName(this.PowerState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.PowerState));
    this.service.updateCharacteristic(this.platform.Characteristic.Brightness, (this.Brightness));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.debounce(this.setBrightness.bind(this)))
      .onGet(this.getBrightness.bind(this));

    switch(this.type) {
    case Lightbulb.AMBIANCE:
      // register handlers for the ColorTemperature Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
        .onSet(this.debounce(this.setColorTemperature.bind(this)))
        .onGet(this.getColorTemperature.bind(this));
      break;
    case Lightbulb.COLOR:
      this.service.getCharacteristic(this.platform.Characteristic.Hue)
        .onSet(this.debounce(this.setHue.bind(this)))
        .onGet(this.getHue.bind(this));

      this.service.getCharacteristic(this.platform.Characteristic.Saturation)
        .onSet(this.debounce(this.setSaturation.bind(this)))
        .onGet(this.getSaturation.bind(this));
      break;
    case Lightbulb.WHITE:
      // No additional characteristics
      break;
    }
  }

  private debounce<T extends (...args: any[]) => void>(
    func: T,
  ): ((...args: any[]) => void) {
    const debounce = Utils.debounce(
      func,
      undefined,
      this.accessoryName,
      this.log,
    );
    return debounce!;
  }

  // Handlers

  async setOn(value: CharacteristicValue) {
    this.PowerState = value as boolean;

    // If brightness is 0% or 100%, ON = 100%, OFF = 0%
    if ((this.PowerState === Power.ON) && (this.Brightness === 0)) {
      this.Brightness = 100;
      this.service?.updateCharacteristic(this.platform.Characteristic.Brightness, (this.Brightness));
    }
    else if ((this.PowerState === Power.OFF) && (this.Brightness === 100)) {
      this.Brightness = 0;
      this.service?.updateCharacteristic(this.platform.Characteristic.Brightness, (this.Brightness));
    }

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting State: ${Power.getName(this.PowerState)}`);
  }

  async getOn(): Promise<CharacteristicValue> {
    const lightbulbState = this.PowerState;

    this.log.debug(`[${this.accessoryName}] Getting State: ${Power.getName(lightbulbState)}`);

    return lightbulbState;
  }

  async setBrightness(value: CharacteristicValue) {
    this.Brightness = value as number;

    // Setting the brightness to 0 turns lightbulb OFF
    if ((this.Brightness === 0) && (this.PowerState === Power.ON)) {
      this.PowerState = Power.OFF;
      this.service?.updateCharacteristic(this.platform.Characteristic.On, (this.PowerState));
    }

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Brightness: ${this.Brightness}%`);
  }

  async getBrightness(): Promise<CharacteristicValue> {
    const lightbulbBrightness = this.Brightness;

    this.log.debug(`[${this.accessoryName}] Getting Brightness: ${lightbulbBrightness}%`);

    return lightbulbBrightness;
  }

  async setColorTemperature(miredValue: CharacteristicValue) {
    this.ColorTemperature = this.miredToKelvin(miredValue as number);

    this.storeState();

    this.log.debug(`[${this.accessoryName}] Setting Color Temperature: ${this.ColorTemperature}K (${miredValue} Mired)`);
  }

  async getColorTemperature(): Promise<CharacteristicValue> {
    const miredValue = this.kelvinToMired(this.ColorTemperature);

    this.log.debug(`[${this.accessoryName}] Getting Color Temperature: ${this.ColorTemperature}K (${miredValue} Mired)`);

    return miredValue;
  }

  async setHue(value: CharacteristicValue) {
    this.Hue = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Hue: ${this.Hue}º`);
  }

  async getHue(): Promise<CharacteristicValue> {
    const lightbulbHue = this.Hue;

    this.log.debug(`[${this.accessoryName}] Getting Hue: ${lightbulbHue}º`);

    return lightbulbHue;
  }

  async setSaturation(value: CharacteristicValue) {
    this.Saturation = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Saturation: ${this.Saturation}º`);
  }

  async getSaturation(): Promise<CharacteristicValue> {
    const lightbulbSaturation = this.Saturation;

    this.log.debug(`[${this.accessoryName}] Getting Saturation: ${lightbulbSaturation}º`);

    return lightbulbSaturation;
  }

  //

  protected override getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.PowerState,
      [this.brightnessStorageKey]: this.Brightness,
    };

    if (this.type === Lightbulb.AMBIANCE) {
      Object.assign(jsonState, { [this.colorTemperatureStorageKey]: this.ColorTemperature });
    }

    if (this.type === Lightbulb.COLOR) {
      Object.assign(jsonState, { [this.hueStorageKey]: this.Hue });
      Object.assign(jsonState, { [this.saturationStorageKey]: this.Saturation });
    }

    const json = JSON.stringify(jsonState);

    return json;
  }

  // micro-reciprocal degrees (mired): 1,000,000 divided by the color temperature in kelvins

  private kelvinToMired(
    kelvin: number,
  ): number {
    return Math.round(1000000 / kelvin);
  }

  private miredToKelvin(
    mired: number,
  ): number {
    return Math.round(1000000 / mired);
  }
}
