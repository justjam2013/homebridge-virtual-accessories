import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { AccessoryFactory } from './accessoryFactory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

import * as path from 'path';
import fs from 'fs';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class VirtualAccessoryPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform');

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info(`Loading accessory from cache: ${accessory.displayName}`);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    let configuredDevices = this.config.devices;

    if (configuredDevices === undefined) {
      this.log.debug('No configured accessories');
      configuredDevices = JSON.parse('[]');
    }
    this.log.debug(`Found configured accessories: ${configuredDevices}`);

    // loop over the discovered devices and register each one if it has not already been registered
    for (const configuredDevice of configuredDevices) {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      this.log.debug(`Configured accessory: ${configuredDevice}`);
      const uuid = this.api.hap.uuid.generate(configuredDevice.accessoryID);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info(`Restoring existing accessory: ${existingAccessory.displayName}`);

        // update the device configuration in the `accessory.context`
        existingAccessory.context.deviceConfiguration = configuredDevice;

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. e.g.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        const virtualAccessory = AccessoryFactory.createVirtualAccessory(this, existingAccessory, configuredDevice.accessoryType);
        if (virtualAccessory === undefined) {
          this.log.error(`Error restoring existing accessory: ${existingAccessory.displayName}`);
        }

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, e.g.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info(`Adding new accessory: ${configuredDevice.accessoryName}`);

        // create a new accessory
        const accessory = new this.api.platformAccessory(configuredDevice.accessoryName, uuid);

        // store a copy of the device configuration in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.deviceConfiguration = configuredDevice;

        const storagePath = path.join(this.api.user.persistPath(), `VA4HB_${configuredDevice.accessoryID}.json`);
        accessory.context.storagePath = storagePath;
        this.log.debug(`Storage path if stateful accessory: ${storagePath}`);

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        const virtualAccessory = AccessoryFactory.createVirtualAccessory(this, accessory, configuredDevice.accessoryType);
        if (virtualAccessory === undefined) {
          this.log.error(`Error adding new accessory: ${configuredDevice.accessoryName}`);
        } else {
          // link the accessory to your platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    }

    // loop over the cached accessories and unregister each one if it is not in the config
    for (const accessory of this.accessories) {
      const configuredDevice = configuredDevices.find(device => this.api.hap.uuid.generate(device.accessoryID) === accessory.UUID);

      // If there is no configured device for this cached accessory
      if (!configuredDevice) {
        this.log.info(`Removing deleted accessory: ${accessory.displayName}`);

        // Unregister the accessory from the platform
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

        // Delete any stateful info, if it exists
        const storagePath = accessory.context.storagePath;
        if (fs.existsSync(storagePath)) {
          fs.unlink(storagePath, (err) => {
            if (err) {
              this.log.debug(`No stateful storage found for: ${accessory.displayName}`);
            } else {
              this.log.debug(`Deleted stateful storage for: ${accessory.displayName}`);
            }
          }); 
        }
      }
    }
  }
}
