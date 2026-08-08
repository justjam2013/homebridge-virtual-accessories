import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';
import { Tilt } from './tilt.js';

import { SlatType, SwingMode } from '../configuration/schema.js';

/**
 * Slats - Accessory implementation
 */
export class Slats extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Slats';

  private readonly swingModeStorageKey: string = 'SwingMode';
  private readonly tiltStateStorageKey: string = 'TiltAngle';

  private tilt!: Tilt;

  private states = {
    SwingMode: 0,   // Characteristic.SwingMode
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // The slat orientation is a static property of the accessory, set once from config
    const slatType: number = (this.accessoryConfiguration.slats.slatType === SlatType.Vertical) ?
      this.platform.Characteristic.SlatType.VERTICAL :
      this.platform.Characteristic.SlatType.HORIZONTAL;

    this.states.SwingMode = (this.accessoryConfiguration.slats.defaultSwingMode === SwingMode.Enabled) ?
      this.platform.Characteristic.SwingMode.SWING_ENABLED :
      this.platform.Characteristic.SwingMode.SWING_DISABLED;

    let initialTiltAngle: number = this.accessoryConfiguration.slats.defaultTiltAngle ?? 0;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);

      const cachedSwingMode: number = accessoryState[this.swingModeStorageKey] as number;
      if (cachedSwingMode !== undefined) {
        this.states.SwingMode = cachedSwingMode;
      }

      const cachedTiltAngle: number = accessoryState[this.tiltStateStorageKey] as number;
      if (cachedTiltAngle !== undefined) {
        initialTiltAngle = cachedTiltAngle;
      }
    }

    this.service = this.accessory.getService(this.platform.Service.Slats) || this.accessory.addService(this.platform.Service.Slats);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);
    this.service.setCharacteristic(this.platform.Characteristic.SlatType, slatType);

    // Update the initial state of the accessory
    this.service.updateCharacteristic(this.platform.Characteristic.SwingMode, (this.states.SwingMode));
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentSlatState, (this.currentSlatState()));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.SwingMode)
      .onSet(this.setSwingMode.bind(this))
      .onGet(this.getSwingMode.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentSlatState)
      .onGet(this.getCurrentSlatState.bind(this));

    // Tilt is always available on a slat
    this.tilt = new Tilt(
      this.service,
      this.platform.Characteristic.CurrentTiltAngle,
      this.platform.Characteristic.TargetTiltAngle,
      this.log,
      this.accessoryConfiguration.accessoryName,
      initialTiltAngle,
      this.accessoryConfiguration.slats.transitionDuration,
      this.storeState.bind(this),
    );
  }

  // Handlers

  async setSwingMode(value: CharacteristicValue) {
    this.states.SwingMode = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Swing Mode: ${this.getSwingModeName(this.states.SwingMode)}`);

    // Slats swing while swing mode is enabled, otherwise they are fixed
    this.service!.setCharacteristic(this.platform.Characteristic.CurrentSlatState, (this.currentSlatState()));

    this.storeState();
  }

  async getSwingMode(): Promise<CharacteristicValue> {
    const swingMode = this.states.SwingMode;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Swing Mode: ${this.getSwingModeName(swingMode)}`);

    return swingMode;
  }

  async getCurrentSlatState(): Promise<CharacteristicValue> {
    const currentSlatState = this.currentSlatState();

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Slat State: ${currentSlatState}`);

    return currentSlatState;
  }

  // Derive the slat state from the swing mode: swinging when enabled, fixed when disabled
  private currentSlatState(): number {
    return (this.states.SwingMode === this.platform.Characteristic.SwingMode.SWING_ENABLED) ?
      this.platform.Characteristic.CurrentSlatState.SWINGING :
      this.platform.Characteristic.CurrentSlatState.FIXED;
  }

  private getSwingModeName(swingMode: number): string {
    return (swingMode === this.platform.Characteristic.SwingMode.SWING_ENABLED) ? 'ENABLED' : 'DISABLED';
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.swingModeStorageKey]: this.states.SwingMode,
      [this.tiltStateStorageKey]: this.tilt.getTiltAngle(),
    });
    return json;
  }

  protected getAccessoryTypeName(): string {
    return Slats.ACCESSORY_TYPE_NAME;
  }
}
