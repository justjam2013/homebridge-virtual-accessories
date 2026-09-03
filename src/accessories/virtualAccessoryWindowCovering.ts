import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { OpeningAccessory } from './openingAccessory.js';
import { Tilt } from './tilt.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';
import { TiltType } from '../configuration/schema.js';

/**
 * WindowCovering - Accessory implementation
 */
export class WindowCovering extends OpeningAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Window Covering';

  private readonly tiltStateStorageKey: string = 'TiltAngle';

  private hasTilt: boolean = false;
  private tilt?: Tilt;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // Tilt is an optional, configurable feature of the window covering
    this.hasTilt = this.accessoryConfiguration.windowCovering.hasTilt;

    if (this.hasTilt) {
      this.configureTilt();
    }
  }

  private configureTilt(): void {
    // Select horizontal or vertical tilt characteristics based on config
    let currentTiltCharacteristic: WithUUID<new () => Characteristic>;
    let targetTiltCharacteristic: WithUUID<new () => Characteristic>;
    if (this.accessoryConfiguration.windowCovering.tiltType === TiltType.Vertical) {
      currentTiltCharacteristic = this.platform.Characteristic.CurrentVerticalTiltAngle;
      targetTiltCharacteristic = this.platform.Characteristic.TargetVerticalTiltAngle;
    } else {
      currentTiltCharacteristic = this.platform.Characteristic.CurrentHorizontalTiltAngle;
      targetTiltCharacteristic = this.platform.Characteristic.TargetHorizontalTiltAngle;
    }

    const minTiltAngle: number = this.accessoryConfiguration.windowCovering.minTiltAngle ?? Tilt.ANGLE_MIN;
    const maxTiltAngle: number = this.accessoryConfiguration.windowCovering.maxTiltAngle ?? Tilt.ANGLE_MAX;

    let initialTiltAngle: number = this.accessoryConfiguration.windowCovering.defaultTiltAngle ?? 0;

    // If the accessory is stateful retrieve stored tilt state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedTiltAngle: number = accessoryState[this.tiltStateStorageKey] as number;

      if (cachedTiltAngle !== undefined) {
        initialTiltAngle = cachedTiltAngle;
      }
    }

    this.tilt = new Tilt(
      this.service!,
      currentTiltCharacteristic,
      targetTiltCharacteristic,
      this.log,
      this.accessoryConfiguration.accessoryName,
      minTiltAngle,
      maxTiltAngle,
      initialTiltAngle,
      this.accessoryConfiguration.windowCovering.transitionDuration,
      this.storeState.bind(this),
    );
  }

  protected getOpeningAccessoryConfiguration(): OpenableAccessoryConfiguration {
    return this.accessoryConfiguration.windowCovering;
  }

  protected getOpeningAccessoryService(): WithUUID<typeof Service> {
    return this.platform.Service.WindowCovering;
  }

  protected getAccessoryTypeName(): string {
    return WindowCovering.ACCESSORY_TYPE_NAME;
  }

  protected getJsonState(): string {
    const state = JSON.parse(super.getJsonState());
    if (this.hasTilt) {
      state[this.tiltStateStorageKey] = this.tilt!.getTiltAngle();
    }
    return JSON.stringify(state);
  }
}
