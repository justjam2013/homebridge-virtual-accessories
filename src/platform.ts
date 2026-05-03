/* eslint-disable brace-style */

import { APIEvent } from 'homebridge';
import { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service, UnknownContext } from 'homebridge';

import { Accessory } from './accessories/accessory.js';
import { AccessoryConfiguration } from './configuration/configurationAccessory.js';
import { AccessoryFactory } from './accessoryFactory.js';
import { ConfigurationUtils } from './configuration/utils.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { VirtualLogger, VirtualLogLevel } from './utils/virtualLogger.js';
import { WebhookServerConfiguration } from './configuration/configurationWebhookServer.js';
import { WebhookServer } from './webhookServer.js';

import { shutdownSignal } from './utils/utils.js';

import * as path from 'path';
import fs from 'fs';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore <-- TODO remove this line, unless that gives an error
import packageInfo from '../package.json' with { type: 'json' };

/**
 * HomebridgePlatform
 */
export class VirtualAccessoriesPlatform implements DynamicPlatformPlugin {

  static platformName: string = 'Virtual Accessories Platform';

  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly log: VirtualLogger;

  private readonly sensorUpdateServer?: WebhookServer;

  // this is used to track restored cached accessories
  public readonly cachedAccessories: PlatformAccessory[] = [];

  public version: string = packageInfo.version;

  constructor(
    log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    // This should catch the "TimeoutNegativeWarning: -1 is a negative number." warning
    // and show where it is occurring
    process.on('warning', (warning) => {
      console.log('WARNING:', warning.name);
      console.log(warning.message);
      console.log(warning.stack);
    });

    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    // This is for dev purposes only to control the output of this plugin
    this.log = new VirtualLogger(log, VirtualLogLevel.DEBUG);

    // Validate platform name
    const platformName: string | undefined = this.config.name;
    if (platformName !== VirtualAccessoriesPlatform.platformName) {
      this.log.error(`Platform Name is invalid: '${platformName}'`);
      this.log.error(`Platform Name must be '${VirtualAccessoriesPlatform.platformName}'`);
    }
    else {
      this.log.debug(`Platform Name is valid: '${platformName}'`);
    }

    // Create webhook server
    const sensorServerConfig: WebhookServerConfiguration | undefined = new ConfigurationUtils(this.log)
      .deserializeWebhookServerConfig(this.config.sensorServer);
    if (sensorServerConfig?.enabled) {
      const prefix: string = 'sensorServer';
      let isValid: boolean = false;
      let errorFields: string[] = [ prefix ];
      [isValid, errorFields] = sensorServerConfig.isValid(prefix);

      if (!isValid) {
        this.log.error(`Sensor Server configuration is invalid: ${JSON.stringify(sensorServerConfig)}`);
        this.log.error(`Invalid fields: ${errorFields.toString()}`);
      }
      else {
        this.log.debug(`Sensor Server configuration is valid: ${JSON.stringify(sensorServerConfig)}`);
        
        this.sensorUpdateServer = new WebhookServer(this.log, parseInt(sensorServerConfig!.port));
      }
    }
    
    this.log.debug('Finished initializing platform');

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
      log.debug('Executing didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();

      this.log.info(`Running Virtual Accessories For Homebridge v${this.version}`);
    });

    this.api.on(APIEvent.SHUTDOWN, () => {
      log.debug('Executing shutdown callback');

      shutdownSignal.isShuttingDown = true;
      this.sensorUpdateServer?.stop();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info(`Loading accessory from cache: ${accessory.displayName}`);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.cachedAccessories.push(accessory);
  }

  /**
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    let configDevices = this.config.devices;

    if (configDevices === undefined) {
      this.log.info('No configured accessories');
      configDevices = JSON.parse('[]');
    }
    this.log.debug(`Found ${configDevices.length} configured accessories: ${JSON.stringify(configDevices)}`);

    const accessoryConfigurations: AccessoryConfiguration[] = this.deserializeAccessoryConfigurations(configDevices);
    this.log.debug(`Deserialized accessories: ${JSON.stringify(accessoryConfigurations)}`);

    const virtualAccessories: Accessory<typeof Service>[] = [];

    // loop over the discovered devices and register each one if it has not already been registered
    for (const accessoryConfiguration of accessoryConfigurations) {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid: string = this.api.hap.uuid.generate(accessoryConfiguration.accessoryID);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const cachedAccessory: PlatformAccessory<UnknownContext> | undefined = this.cachedAccessories.find(accessory => accessory.UUID === uuid);

      if (cachedAccessory) {
        // the accessory already exists
        this.log.info(`Restoring existing accessory: ${accessoryConfiguration.accessoryName}`);

        // update the device firmware version in the `accessory.context`
        cachedAccessory.context.firmwareVersion = this.version;

        // Remove any services from the cached accessory. These will be added back
        // when the accessory handler for the restored accessory is recreated
        for (const service of cachedAccessory.services) {
          if (service.isPrimaryService) {
            //
          }
          cachedAccessory.removeService(service);
        }

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. e.g.:
        // registeredAccessory.context.device = device;
        // this.api.updatePlatformAccessories([registeredAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        const virtualAccessory: Accessory<typeof Service> | undefined = AccessoryFactory.createVirtualAccessory(this, cachedAccessory, accessoryConfiguration);

        if (virtualAccessory !== undefined) {
          if (cachedAccessory.displayName !== accessoryConfiguration.accessoryName) {
            this.log.info(`Updating accessory name from ${cachedAccessory.displayName} to ${accessoryConfiguration.accessoryName}`);

            virtualAccessory.updateConfiguredName();
            cachedAccessory.updateDisplayName(accessoryConfiguration.accessoryName);
          }
          // Just update all the cached accessories
          this.api.updatePlatformAccessories([cachedAccessory]);
          this.log.debug(`Updating cache: ${accessoryConfiguration.accessoryName}`);

          virtualAccessories.push(virtualAccessory);
        }
        else {
          this.log.error(`Error restoring existing accessory: ${accessoryConfiguration.accessoryName}`);
        }
      }
      else {
        // the accessory does not yet exist, so we need to create it
        this.log.info(`Adding new accessory: ${accessoryConfiguration.accessoryName}`);

        // create a new accessory
        const accessory: PlatformAccessory<UnknownContext> = new this.api.platformAccessory(
          accessoryConfiguration.accessoryName,
          uuid,
          accessoryConfiguration.category,
        );

        // store a copy of the device configuration in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.firmwareVersion = this.version;

        const storagePath: string = path.join(this.api.user.persistPath(), `VA4HB_${accessoryConfiguration.accessoryID}.json`);
        accessory.context.storagePath = storagePath;
        this.log.debug(`Storage path if stateful accessory: ${storagePath}`);

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        const virtualAccessory: Accessory<typeof Service> | undefined = AccessoryFactory.createVirtualAccessory(this, accessory, accessoryConfiguration);
        if (virtualAccessory === undefined) {
          this.log.error(`Error adding new accessory: ${accessoryConfiguration.accessoryName}`);
        }
        else if (virtualAccessory.isExternalAccessory()) {
          this.log.info(`Publishing new external accessory: ${accessoryConfiguration.accessoryName}`);
          this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);
        }
        else {
          // link the accessory to your platform
          this.log.info(`Publishing new accessory: ${accessoryConfiguration.accessoryName}`);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

          virtualAccessories.push(virtualAccessory);
        }
      }

      // Cleanup config
      // const configPath = api.user.configPath();
    }

    // loop over the cached accessories and unregister each one if it is not in the config
    for (const cachedAccessory of this.cachedAccessories) {
      const configuredDevice = configDevices.find(device => this.api.hap.uuid.generate(device.accessoryID) === cachedAccessory.UUID);

      // If there is no configured device for this cached accessory
      if (!configuredDevice) {
        this.log.info(`Removing deleted accessory: ${cachedAccessory.displayName}`);

        // Unregister the accessory from the platform
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [cachedAccessory]);

        // Delete any stateful info, if it exists
        const storagePath: string = cachedAccessory.context.storagePath as string;
        if (fs.existsSync(storagePath)) {
          fs.unlink(storagePath, (err) => {
            if (err) {
              this.log.debug(`No stateful storage found for: ${cachedAccessory.displayName}`);
            }
            else {
              this.log.debug(`Deleted stateful storage for: ${cachedAccessory.displayName}`);
            }
          }); 
        }
      }
    }

    // Start sensor server
    this.sensorUpdateServer?.addAccessories(virtualAccessories);
    this.sensorUpdateServer?.start();
  }

  private deserializeAccessoryConfigurations(
    configDevices,
  ): AccessoryConfiguration[] {
    const accessoryConfigurations: AccessoryConfiguration[] = [];
    const accessoryUUIDs: string[] = [];

    for (const configDevice of configDevices) {
      // Deserialize accessory configuration
      const configurationUtils: ConfigurationUtils = new ConfigurationUtils(this.log);
      const accessoryConfiguration: AccessoryConfiguration | undefined = configurationUtils.deserializeAccessoryConfig(configDevice);

      // Skip accessory if the configuration is invalid
      if (accessoryConfiguration === undefined) {
        this.log.error(`Error deserializing: ${JSON.stringify(configDevice)}`);
        this.log.info('Skipping accessory until configuration is fixed');
      }
      else if (accessoryUUIDs.includes(accessoryConfiguration.accessoryID)) {
        this.log.error(`Found accessory with duplicate ID: ${JSON.stringify(configDevice)}`);
        this.log.info('Skipping accessory until configuration is fixed');
      }
      else {
        this.log.debug(`Deserialized accessory: ${JSON.stringify(configDevice)}`);

        let isValidAccessoryConfiguration: boolean = false;
        let errorFields: string[] = [];
        [isValidAccessoryConfiguration, errorFields] = accessoryConfiguration.isValid();
        if (!isValidAccessoryConfiguration) {
          this.log.error(`Skipping accessory. Configuration is invalid: ${JSON.stringify(accessoryConfiguration)}`);
          this.log.error(`Invalid fields: ${errorFields.toString()}`);
        }
        else {
          this.log.debug(`Configuration is valid: ${JSON.stringify(accessoryConfiguration)}`);
          accessoryConfigurations.push(accessoryConfiguration);

          accessoryUUIDs.push(accessoryConfiguration.accessoryID);
        }
      }
    }

    return accessoryConfigurations;
  }
}
