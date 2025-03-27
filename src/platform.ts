import { API, Categories, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { Configuration } from './configuration/configuration.js';
import { AccessoryConfiguration } from './configuration/configurationAccessory.js';
import { AccessoryFactory } from './accessoryFactory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

import * as path from 'path';
import fs from 'fs';
import { Accessory } from './accessories/virtualAccessory.js';
import { SensorUpdateServer } from './sensorServer.js';
import { VirtualAccessoriesLogger } from './virtualLogger.js';
import { SensorServerConfiguration } from './configuration/configurationSensorServer.js';

/**
 * HomebridgePlatform
 */
export class VirtualAccessoriesPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly log: VirtualAccessoriesLogger;

  private readonly sensorUpdateServer?: SensorUpdateServer;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log = new VirtualAccessoriesLogger(log);

    // Create sensor server
    const sensorServerConfig: SensorServerConfiguration | undefined = new Configuration(this.log).deserializeSensorServerConfig(this.config.sensorServer);
    if (sensorServerConfig?.enabled) {
      this.sensorUpdateServer = new SensorUpdateServer(this.log, parseInt(sensorServerConfig!.port));
    }
    
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
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    let configuredDevices = this.config.devices;

    if (configuredDevices === undefined) {
      this.log.info('No configured accessories');
      configuredDevices = JSON.parse('[]');
    }
    this.log.debug(`Found ${configuredDevices.length} configured accessories: ${JSON.stringify(configuredDevices)}`);

    const configuredAccessories: AccessoryConfiguration[] = this.deserializeConfiguredAccessories(configuredDevices);
    this.log.debug(`Deserialized accessories: ${JSON.stringify(configuredAccessories)}`);

    const virtualAccessories: Accessory[] = [];

    // loop over the discovered devices and register each one if it has not already been registered
    for (const configuredAccessory of configuredAccessories) {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(configuredAccessory.accessoryID);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info(`Restoring existing accessory: ${configuredAccessory.accessoryName}`);

        // update the device configuration in the `accessory.context`
        existingAccessory.context.deviceConfiguration = configuredAccessory;

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. e.g.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        const virtualAccessory: Accessory | undefined = AccessoryFactory.createVirtualAccessory(this, existingAccessory, configuredAccessory.accessoryType);

        if (virtualAccessory !== undefined) {
          if (existingAccessory.displayName !== configuredAccessory.accessoryName) {
            this.log.info(`Updating accessory name from ${existingAccessory.displayName} to ${configuredAccessory.accessoryName}`);

            virtualAccessory.updateConfiguredName();
            existingAccessory.updateDisplayName(configuredAccessory.accessoryName);

            this.api.updatePlatformAccessories([existingAccessory]);
          }

          virtualAccessories.push(virtualAccessory);
        } else {
          this.log.error(`Error restoring existing accessory: ${configuredAccessory.accessoryName}`);
        }
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info(`Adding new accessory: ${configuredAccessory.accessoryName}`);

        // create a new accessory
        const accessory = new this.api.platformAccessory(configuredAccessory.accessoryName, uuid, configuredAccessory.category);

        // store a copy of the device configuration in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.deviceConfiguration = configuredAccessory;

        const storagePath: string = path.join(this.api.user.persistPath(), `VA4HB_${configuredAccessory.accessoryID}.json`);
        accessory.context.storagePath = storagePath;
        this.log.debug(`Storage path if stateful accessory: ${storagePath}`);

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        const virtualAccessory: Accessory | undefined = AccessoryFactory.createVirtualAccessory(this, accessory, configuredAccessory.accessoryType);
        if (virtualAccessory === undefined) {
          this.log.error(`Error adding new accessory: ${configuredAccessory.accessoryName}`);
        } else if (configuredAccessory.category === Categories.SPEAKER) {
          this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);
        } else {
          // link the accessory to your platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

          virtualAccessories.push(virtualAccessory);
        }
      }

      // Cleanup config
      // const configPath = api.user.configPath();
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

    // Start sensor server

    // TODO: check configuration

    this.sensorUpdateServer?.addAccessories(virtualAccessories);
    this.sensorUpdateServer?.start();
  }

  private deserializeConfiguredAccessories(
    configuredDevices,
  ): AccessoryConfiguration[] {
    const accessoryConfigurations: AccessoryConfiguration[] = [];
    const accessoryUUIDs: string[] = [];

    for (const configuredDevice of configuredDevices) {
      // Deserialize accessory configuration
      const configuration: Configuration = new Configuration(this.log);
      const accessoryConfiguration: AccessoryConfiguration | undefined = configuration.deserializeAccessoryConfig(configuredDevice);

      // Skip accessory if the configuration is invalid
      if (accessoryConfiguration === undefined) {
        this.log.error(`Error deserializing: ${JSON.stringify(configuredDevice)}`);
        this.log.info('Skipping accessory until configuration is fixed');
      } else if (accessoryUUIDs.includes(accessoryConfiguration.accessoryID)) {
        this.log.error(`Found accessory with duplicate ID: ${JSON.stringify(configuredDevice)}`);
        this.log.info('Skipping accessory until configuration is fixed');
      } else {
        this.log.debug(`Deserialized accessory: ${JSON.stringify(configuredDevice)}`);

        let isValidAccessoryConfig: boolean = false;
        let errorFields: string[] = [];
        [isValidAccessoryConfig, errorFields] = accessoryConfiguration.isValid();
        if (!isValidAccessoryConfig) {
          this.log.error(`Skipping accessory. Configuration is invalid: ${JSON.stringify(accessoryConfiguration)}`);
          this.log.error(`Invalid fields: ${errorFields.toString()}`);
        } else {
          this.log.debug(`Configuration is valid: ${JSON.stringify(accessoryConfiguration)}`);
          accessoryConfigurations.push(accessoryConfiguration);

          accessoryUUIDs.push(accessoryConfiguration.accessoryID);
        }
      }
    }

    return accessoryConfigurations;
  }
}
