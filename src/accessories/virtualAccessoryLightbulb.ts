/* eslint-disable brace-style */

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { ColorHSL, Colors } from '../utils/colorUtils.js';
import { Utils } from '../utils/utils.js';

/**
 * Lightbulb - Accessory implementation
 */
export class Lightbulb extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Lightbulb';

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  static readonly WHITE: string = 'white';
  static readonly AMBIANCE: string = 'ambiance';
  static readonly COLOR: string = 'color';

  private readonly stateStorageKey: string = 'LightbulbState';
  private readonly brightnessStorageKey: string = 'LightbulbBrightness';
  private readonly colorTemperatureStorageKey: string = 'LightbulbColorTemperature';
  private readonly hueStorageKey: string = 'LightbulbHue';
  private readonly saturationStorageKey: string = 'LightbulbSaturation';

  private type: string = Lightbulb.WHITE;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.setupStaticFields();

    this.type = this.accessoryConfiguration.lightbulb.type;

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.lightbulb.defaultState === 'on' ? Lightbulb.ON : Lightbulb.OFF;
    const brightness: number = this.accessoryConfiguration.lightbulb.brightness;
    const colorTemperatureKelvin: number = this.accessoryConfiguration.lightbulb.colorTemperatureKelvin;
    const colorHex: string = this.accessoryConfiguration.lightbulb.colorHex;

    let On: boolean = this.defaultState;
    let Brightness: number = 0;
    let ColorTemperatureKelvin: number = 2700;
    let Hue: number = 0;
    let Saturation: number = 0;

    if (this.type === Lightbulb.WHITE) {
      Brightness = brightness;
    }
    else if (this.type === Lightbulb.AMBIANCE) {
      Brightness = brightness;
      ColorTemperatureKelvin = colorTemperatureKelvin;
    }
    else if (this.type === Lightbulb.COLOR) {
      const hsl: ColorHSL = Colors.HexToHSL(colorHex)!;
      Brightness = hsl.luminance;
      Hue = hsl.hue;
      Saturation = hsl.saturation;
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;
      const cachedBrightness: number = accessoryState[this.brightnessStorageKey] as number;
      const cachedColorTemperature: number = accessoryState[this.colorTemperatureStorageKey] as number;
      const cachedHue: number = accessoryState[this.hueStorageKey] as number;
      const cachedSaturation: number = accessoryState[this.saturationStorageKey] as number;

      if (cachedState !== undefined) {
        On = cachedState;
      }
      if (cachedBrightness !== undefined) {
        Brightness = cachedBrightness;
      }

      if (this.type === Lightbulb.AMBIANCE && cachedColorTemperature !== undefined) {
        ColorTemperatureKelvin = cachedColorTemperature;
      }

      if (this.type === Lightbulb.COLOR) {
        if (cachedHue !== undefined) {
          Hue = cachedHue;
        }
        if (cachedSaturation !== undefined) {
          Saturation = cachedSaturation;
        }
      }
    }

    this.service = this.accessory.getService(ServiceType.Lightbulb) || this.accessory.addService(ServiceType.Lightbulb);

    this.setValue(CharacteristicType.Name, this.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Lightbulb Current State: ${Lightbulb.getStateName(On)}`);
    this.updateOn(On);
    this.updateBrightness(Brightness);
    if (this.type === Lightbulb.AMBIANCE) {
      this.updateColorTemperature(this.kelvinToMired(ColorTemperatureKelvin));
    }
    else if (this.type === Lightbulb.COLOR) {
      this.updateHue(Hue);
      this.updateSaturation(Saturation);
    }

    // register handlers

    this.service.getCharacteristic(CharacteristicType.On)
      .onGet(this.getOnHandler.bind(this))
      .onSet(this.setOnHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.Brightness)
      .onGet(this.getBrightnessHandler.bind(this))
      .onSet(Utils.debounce(this.setBrightnessHandler.bind(this)));

    switch(this.type) {
    case Lightbulb.AMBIANCE:
      // register handlers for the ColorTemperature Characteristic
      this.service.getCharacteristic(CharacteristicType.ColorTemperature)
        .onGet(this.getColorTemperatureHandler.bind(this))
        .onSet(Utils.debounce(this.setColorTemperatureHandler.bind(this)));
      break;
    case Lightbulb.COLOR:
      this.service.getCharacteristic(CharacteristicType.Hue)
        .onGet(this.getHueHandler.bind(this))
        .onSet(Utils.debounce(this.setHueHandler.bind(this)));

      this.service.getCharacteristic(CharacteristicType.Saturation)
        .onGet(this.getSaturationHandler.bind(this))
        .onSet(Utils.debounce(this.setSaturationHandler.bind(this)));
      break;
    case Lightbulb.WHITE:
      // No additional characteristics
      break;
    }
  }

  // *** Handlers ***

  // On

  async getOnHandler(): Promise<CharacteristicValue> {
    const On = this.getOn();
    this.log.debug(`[${this.accessoryName}] Getting State: ${Lightbulb.getStateName(On)}`);

    return On;
  }

  async setOnHandler(value: CharacteristicValue) {
    let On: boolean = value as boolean;
    this.updateOn(On);
    this.log.info(`[${this.accessoryName}] Setting State: ${Lightbulb.getStateName(On)}`);

    // If brightness is 0% or 100%, ON = 100%, OFF = 0%
    On = this.getOn();
    const Brightness = this.getBrightness();
    if ((On === Lightbulb.ON) && (Brightness === 0)) {
      this.updateBrightness(100);
    }
    else if ((On === Lightbulb.OFF) && (Brightness === 100)) {
      this.updateBrightness(0);
    }

    this.storeState();
  }

  // Brightness

  async getBrightnessHandler(): Promise<CharacteristicValue> {
    const Brightness = this.getBrightness();
    this.log.debug(`[${this.accessoryName}] Getting Brightness: ${Brightness}%`);

    return Brightness;
  }

  async setBrightnessHandler(value: CharacteristicValue) {
    let Brightness: number = value as number;
    this.updateBrightness(Brightness);
    this.log.info(`[${this.accessoryName}] Setting Brightness: ${Brightness}%`);

    // Setting the brightness to 0 turns lightbulb OFF
    Brightness = this.getBrightness();
    if ((Brightness === 0) && (this.getOn() === Lightbulb.ON)) {
      this.updateOn(Lightbulb.OFF);
    }

    this.storeState();
  }

  // ColorTemperature

  async getColorTemperatureHandler(): Promise<CharacteristicValue> {
    const ColorTemperature: number = this.getColorTemperature();
    this.log.debug(`[${this.accessoryName}] Getting Color Temperature: ${this.miredToKelvin(ColorTemperature)}K (${ColorTemperature} Mired)`);

    return ColorTemperature;
  }

  async setColorTemperatureHandler(value: CharacteristicValue) {
    const ColorTemperature: number = value as number;
    this.updateColorTemperature(ColorTemperature);
    this.log.debug(`[${this.accessoryName}] Setting Color Temperature: ${this.miredToKelvin(ColorTemperature)}K (${ColorTemperature} Mired)`);

    this.storeState();
  }

  // Hue

  async getHueHandler(): Promise<CharacteristicValue> {
    const Hue: number = this.getHue();
    this.log.debug(`[${this.accessoryName}] Getting Hue: ${Hue}º`);

    return Hue;
  }

  async setHueHandler(value: CharacteristicValue) {
    const Hue: number = value as number;
    this.updateHue(Hue);
    this.log.info(`[${this.accessoryName}] Setting Hue: ${Hue}º`);

    this.storeState();
  }

  // Saturation

  async getSaturationHandler(): Promise<CharacteristicValue> {
    const Saturation: number = this.getSaturation();
    this.log.debug(`[${this.accessoryName}] Getting Saturation: ${Saturation}º`);

    return Saturation;
  }

  async setSaturationHandler(value: CharacteristicValue) {
    const Saturation: number = value as number;
    this.updateSaturation(Saturation);
    this.log.info(`[${this.accessoryName}] Setting Saturation: ${Saturation}º`);

    this.storeState();
  }

  // *** Handlers ***

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getOn(),
      [this.brightnessStorageKey]: this.getBrightness(),
    };

    if (this.type === Lightbulb.AMBIANCE) {
      Object.assign(jsonState, { [this.colorTemperatureStorageKey]: this.getColorTemperature() });
    }

    if (this.type === Lightbulb.COLOR) {
      Object.assign(jsonState, { [this.hueStorageKey]: this.getHue() });
      Object.assign(jsonState, { [this.saturationStorageKey]: this.getSaturation() });
    }

    const json = JSON.stringify(jsonState);

    return json;
  }

  protected getAccessoryTypeName(): string {
    return Lightbulb.ACCESSORY_TYPE_NAME;
  }

  static getStateName(state: boolean): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Lightbulb.ON: { stateName = 'ON'; break; }
    case Lightbulb.OFF: { stateName = 'OFF'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
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

  // Convenience methods

  private setupStaticFields() {
    //
  }

  // On

  private getOn(): boolean {
    return this.getValue(CharacteristicType.On) as boolean;
  }

  private updateOn(
    value: boolean,
  ) {
    this.updateValue(CharacteristicType.On, value);
  }

  // Brightness

  private getBrightness(): number {
    return this.getValue(CharacteristicType.Brightness) as number;
  }

  private updateBrightness(
    value: number,
  ) {
    this.updateValue(CharacteristicType.Brightness, value);
  }

  // ColorTemperature

  private getColorTemperature(): number {
    return this.getValue(CharacteristicType.ColorTemperature) as number;
  }

  private updateColorTemperature(
    value: number,
  ) {
    this.updateValue(CharacteristicType.ColorTemperature, value);
  }

  // Hue

  private getHue(): number {
    return this.getValue(CharacteristicType.Hue) as number;
  }

  private updateHue(
    value: number,
  ) {
    this.updateValue(CharacteristicType.Hue, value);
  }

  // Saturation

  private getSaturation(): number {
    return this.getValue(CharacteristicType.Saturation) as number;
  }

  private updateSaturation(
    value: number,
  ) {
    this.updateValue(CharacteristicType.Saturation, value);
  }
}
