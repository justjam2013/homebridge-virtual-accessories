/* eslint-disable brace-style */

import { Units, CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { Utils } from '../utils/utils.js';
import { TLVDeviceCredentialRequest, TLVDeviceCredentialResponse, TLVReaderKeyRequest, TLVReaderKeyResponse, TLVRequest, TLVUtils } from '../utils/tlv.js';
import { LockCurrentState, LockLastKnownAction, LockTargetState } from './accessoryCharacteristics.js';

/**
 * Lock - Accessory implementation
 */
export class Lock extends Accessory<typeof Service.LockMechanism> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'Lock';

  private readonly stateStorageKey: string = 'LockState';
  private readonly securityTimeoutStorageKey: string = 'LockAutoSecurityTimeout';
  private readonly lastKnownActionStorageKey: string = 'LockLastKnownAction';
  private readonly deviceCredentialPublicKeysStorageKey = 'DeviceCredentialPublicKeys';
  private readonly readerPrivateKeysStorageKey = 'readerPrivateKeys';

  // base64 encoded hex "010110020110"; 16 keys each
  private readonly deviceCredentialPublicKeysCount: number = 16;
  private readonly readerPrivateKeysCount: number = 16;
  private readonly nfcAccessSupportedConfiguration: string = 'AQEQAgEQ';

  private deviceCredentialPublicKeys = new Map<string, string>();   // Issuer Key Identifier - Device Credential Public Key
  private readerPrivateKeys = new Map<string, string>();   // Key Identifier - Reader Private Key

  private setupHomeKey: boolean;

  // base64 encoded hex
  private readonly lockHardwareFinish: Record<string, string> = {
    'default': 'AQT///8A',  // 0104FFFFFF00
    'tan': 'AQTO1doA',      // 0104CED5DA00
    'gold': 'AQSq1uwA',     // 0104AAD6EC00
    'silver': 'AQTj4+MA',   // 0104E3E3E300
    'black': 'AQQAAAAA',    // 010400000000
  };

  private securityTimerId: ReturnType<typeof setTimeout> | undefined;

  // Device states
  private CurrentState: number = LockCurrentState.SECURED;
  private TargetState: number = LockTargetState.SECURED;
  private ManagementAutoSecurityTimeout: number = 0;
  private LastKnownAction: number = LockLastKnownAction.UNSECURED_REMOTELY;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.LockMechanism,
      Lock.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.lock.defaultState === 'unlocked' ? LockCurrentState.UNSECURED : LockCurrentState.SECURED;
    const autoSecurityTimeout = this.accessoryConfiguration.lock.autoSecurityTimeout;
    // const walletKeyColor = this.accessoryConfiguration.lock.walletKeyColor || 'default';
    // HomeKey appears to be broken right now, so temporarily leaving NFC out if no HomeKey card color is selected
    const walletKeyColor = (this.accessoryConfiguration.lock.walletKeyColor !== undefined) ? this.accessoryConfiguration.lock.walletKeyColor : undefined;
    this.setupHomeKey = (walletKeyColor === undefined) ? false : true;

    this.CurrentState = this.defaultState;
    this.ManagementAutoSecurityTimeout = autoSecurityTimeout;
    this.LastKnownAction = LockLastKnownAction.UNSECURED_REMOTELY;      // There is no "unknown" value

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedSecurityTimeout: number = accessoryState[this.securityTimeoutStorageKey] as number;
      const cachedLastKnownAction: number = accessoryState[this.lastKnownActionStorageKey] as number;

      const jsonDeviceCredentialPublicKeys: string = accessoryState[this.deviceCredentialPublicKeysStorageKey]; 
      const cachedDeviceCredentialPublicKeys = (jsonDeviceCredentialPublicKeys !== undefined) ? Utils.jsonToMap(jsonDeviceCredentialPublicKeys) : undefined;
      const jsonReaderPrivateKeys: string = accessoryState[this.readerPrivateKeysStorageKey];
      const cachedReaderPrivateKeys = (jsonReaderPrivateKeys !== undefined) ? Utils.jsonToMap(jsonReaderPrivateKeys) : undefined;

      if (cachedState !== undefined) {
        this.CurrentState = cachedState;
      }
      if (cachedSecurityTimeout !== undefined) {
        this.ManagementAutoSecurityTimeout = cachedSecurityTimeout;
      }
      if (cachedLastKnownAction !== undefined) {
        this.LastKnownAction = cachedLastKnownAction;
      }
      if (cachedDeviceCredentialPublicKeys !== undefined) {
        this.deviceCredentialPublicKeys = cachedDeviceCredentialPublicKeys;
      }
      if (cachedReaderPrivateKeys !== undefined) {
        this.readerPrivateKeys = cachedReaderPrivateKeys;
      }
    }

    this.TargetState = this.CurrentState;

    if (this.setupHomeKey) {
      this.accessoryInformationService!.setCharacteristic(this.platform.Characteristic.HardwareFinish, this.lockHardwareFinish[walletKeyColor as string]);
    }

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Lock Current State: ${LockCurrentState.getName(this.CurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, (this.CurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, (this.TargetState));
    this.service.updateCharacteristic(this.platform.Characteristic.LockLastKnownAction, (this.LastKnownAction));
    this.service.updateCharacteristic(this.platform.Characteristic.LockManagementAutoSecurityTimeout, (this.ManagementAutoSecurityTimeout));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.LockCurrentState)
      .onGet(this.getLockCurrentState.bind(this)); // GET - bind to the 'handleLockCurrentStateGet` method below

    this.service.getCharacteristic(this.platform.Characteristic.LockTargetState)
      .onSet(this.setLockTargetState.bind(this)) // SET - bind to the `handleLockTargetStateSet` method below
      .onGet(this.getLockTargetState.bind(this)); // GET - bind to the `handleLockTargetStateGet` method below

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same subtype id.)
     */

    // Creating Lock Management service
    const lockManagementServiceName = `${this.accessoryName} Management`;
    const lockManagementService = this.accessory.getService(lockManagementServiceName)
      || this.accessory.addService(this.platform.Service.LockManagement, lockManagementServiceName, this.accessory.UUID + '-LMS');

    lockManagementService.getCharacteristic(this.platform.Characteristic.LockControlPoint)
      .onSet(this.setLockControlPoint.bind(this));
    lockManagementService.getCharacteristic(this.platform.Characteristic.Version)
      .onGet(this.getVersion.bind(this));
    lockManagementService.getCharacteristic(this.platform.Characteristic.LockManagementAutoSecurityTimeout)
      .onSet(this.setLockManagementAutoSecurityTimeout.bind(this))
      .onGet(this.getLockManagementAutoSecurityTimeout.bind(this))
      .setProps({
        minValue: 0,
        maxValue: 3600,
        minStep: 1,
        unit: Units.SECONDS,
      });
    lockManagementService.getCharacteristic(this.platform.Characteristic.LockLastKnownAction)
      .onGet(this.getLockLastKnownAction.bind(this));

    if (this.setupHomeKey) {
    // Creating Nfc Access service
      const nfcAccessServiceName = `${this.accessoryName} Nfc Access`;
      const nfcAccessService = this.accessory.getService(nfcAccessServiceName)
        || this.accessory.addService(this.platform.Service.NFCAccess, nfcAccessServiceName, this.accessory.UUID + '-NFC');

      nfcAccessService.getCharacteristic(this.platform.Characteristic.ConfigurationState)
        .onGet(this.getConfigurationState.bind(this));
      nfcAccessService.getCharacteristic(this.platform.Characteristic.NFCAccessControlPoint)
        .onSet(this.setNFCAccessControlPoint.bind(this))
        .onGet(this.getNFCAccessControlPoint.bind(this));
      nfcAccessService.getCharacteristic(this.platform.Characteristic.NFCAccessSupportedConfiguration)
        .onGet(this.getNFCAccessSupportedConfiguration.bind(this));
    }
  }

  // Handlers

  async getLockCurrentState(): Promise<CharacteristicValue> {
    const lockState = this.CurrentState;

    this.log.debug(`[${this.accessoryName}] Getting Current State: ${LockCurrentState.getName(lockState)}`);

    return lockState;
  }

  async setLockTargetState(value: CharacteristicValue) {
    this.TargetState = value as number;

    this.log.info(`[${this.accessoryName}] Setting Target State: ${LockTargetState.getName(this.TargetState)}`);

    this.CurrentState = this.TargetState;
    this.service!.setCharacteristic(this.platform.Characteristic.LockCurrentState, (this.CurrentState));

    this.LastKnownAction = (this.CurrentState === LockCurrentState.SECURED) ?
      LockLastKnownAction.SECURED_REMOTELY :
      LockLastKnownAction.UNSECURED_REMOTELY;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Current State: ${LockTargetState.getName(this.CurrentState)}`);

    // Run auto lock timeout
    this.startAutoSecurityTimeout();
  }

  async getLockTargetState(): Promise<CharacteristicValue> {
    const lockState = this.TargetState;

    this.log.debug(`[${this.accessoryName}] Getting Target State: ${LockTargetState.getName(lockState)}`);

    return lockState;
  }

  // Lock Management Service handlers

  async setLockControlPoint(value: CharacteristicValue) {
    const lockControlPoint = value;

    this.log.info(`[${this.accessoryName}] Setting Lock Control Point: ${lockControlPoint}`);
  }

  async getVersion(): Promise<CharacteristicValue> {
    const version = '1.0.0';

    this.log.debug(`[${this.accessoryName}] Getting Lock Management Version: ${version}`);

    return version;
  }

  async setLockManagementAutoSecurityTimeout(value: CharacteristicValue) {
    this.ManagementAutoSecurityTimeout = value as number;

     
    this.log.info(`[${this.accessoryName}] Setting Lock Management Auto Security Timeout: ${this.ManagementAutoSecurityTimeout}`);
  }

  async getLockManagementAutoSecurityTimeout(): Promise<CharacteristicValue> {
    const lockManagementAutoSecurityTimeout = this.ManagementAutoSecurityTimeout;

    this.log.debug(`[${this.accessoryName}] Getting Lock Management Auto Security Timeout: ${lockManagementAutoSecurityTimeout}`);

    return lockManagementAutoSecurityTimeout;
  }

  async getLockLastKnownAction(): Promise<CharacteristicValue> {
    const lockLastKnownAction = this.LastKnownAction;

    this.log.debug(`[${this.accessoryName}] Getting Lock Last Known Action: ${LockLastKnownAction.getName(lockLastKnownAction)}`);

    return lockLastKnownAction;
  }

  // NFC Service handlers

  async getConfigurationState(): Promise<CharacteristicValue> {
    const configurationState = 0;   // Successful

    this.log.debug(`[${this.accessoryName}] Getting NFC Access Configuration State: ${configurationState}`);

    return configurationState;
  }

  async setNFCAccessControlPoint(value: CharacteristicValue) {
    const nfcAccessControlPoint = value as string;

    try {
      const response: string = this.processAccessControlPointRequest(nfcAccessControlPoint);

      this.log.debug(`[${this.accessoryName}] Setting NFC Access Control Point: ${nfcAccessControlPoint}`);
      this.log.debug(`[${this.accessoryName}] NFC Access Control Point Response: "${response}"`);

      return response;
    }
    catch (error) {
      this.log.error(`Caught error ${error}`);
      if (error instanceof Error) {
        this.log.error(`Error message: ${error.message}`);
        this.log.error(`Error stack: ${error.stack}`);
      }
    }

    return '';
  }

  async getNFCAccessControlPoint(): Promise<CharacteristicValue> {
    const nfcAccessControlPoint = '';

    this.log.debug(`[${this.accessoryName}] Getting NFC Access Control Point: ${nfcAccessControlPoint}`);

    return nfcAccessControlPoint;
  }

  async getNFCAccessSupportedConfiguration(): Promise<CharacteristicValue> {
    const nfcAccessSupportedConfiguration = this.nfcAccessSupportedConfiguration;

    this.log.debug(`[${this.accessoryName}] Getting NFC Access Supported Configuration: ${nfcAccessSupportedConfiguration}`);

    return nfcAccessSupportedConfiguration;
  }

  //

  protected override getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.CurrentState,
      [this.securityTimeoutStorageKey]: this.ManagementAutoSecurityTimeout,
      [this.lastKnownActionStorageKey]: this.LastKnownAction,
    };

    if (this.setupHomeKey) {
      Object.assign(jsonState, { [this.deviceCredentialPublicKeysStorageKey]: Utils.mapToJson(this.deviceCredentialPublicKeys) });
      Object.assign(jsonState, { [this.readerPrivateKeysStorageKey]: Utils.mapToJson(this.readerPrivateKeys) });
    }

    const json = JSON.stringify(jsonState);

    return json;
  }

  private startAutoSecurityTimeout(): void {
    if (this.TargetState !== this.defaultState && this.ManagementAutoSecurityTimeout > 0) {
      const securityTimeoutMillis: number = this.ManagementAutoSecurityTimeout * 1000;
      this.securityTimerId = setTimeout(() => {
        // Reset timer
        clearTimeout(this.securityTimerId);

        this.service!.setCharacteristic(this.platform.Characteristic.LockTargetState, (this.defaultState));

        this.LastKnownAction = LockLastKnownAction.SECURED_BY_AUTO_SECURE_TIMEOUT;
      }, securityTimeoutMillis)
        .unref();
 
      const timeout: string = Utils.secondsToHHmmss(this.ManagementAutoSecurityTimeout);
      this.log.info(`[${this.accessoryName}] Security Timeout in ${timeout}`);
    }
    else {
      this.log.info(`[${this.accessoryName}] No Security Timeout defined`);
    }
  }

  // Security

  private readonly GET_DEVICE_CREDENTIAL_REQUEST: number =      Utils.concatenate(TLVUtils.OPERATION_GET, TLVUtils.DEVICE_CREDENTIAL_REQUEST);
  private readonly GET_READER_KEY_REQUEST: number =             Utils.concatenate(TLVUtils.OPERATION_GET, TLVUtils.READER_KEY_REQUEST);
  private readonly ADD_DEVICE_CREDENTIAL_REQUEST: number =      Utils.concatenate(TLVUtils.OPERATION_ADD, TLVUtils.DEVICE_CREDENTIAL_REQUEST);
  private readonly ADD_GET_READER_KEY_REQUEST: number =         Utils.concatenate(TLVUtils.OPERATION_ADD, TLVUtils.READER_KEY_REQUEST);
  private readonly RFEMOVE_DEVICE_CREDENTIAL_REQUEST: number =  Utils.concatenate(TLVUtils.OPERATION_REMOVE, TLVUtils.DEVICE_CREDENTIAL_REQUEST);
  private readonly REMOVE_GET_READER_KEY_REQUEST: number =      Utils.concatenate(TLVUtils.OPERATION_REMOVE, TLVUtils.READER_KEY_REQUEST);

  private processAccessControlPointRequest(base64TlvRequest: string) {
    const hexTlvRequest: string = Utils.base64DecodeToHexString(base64TlvRequest);
    const tlvRequest: TLVRequest = new TLVRequest(hexTlvRequest, this.log);

    this.log.debug(`[${this.accessoryName}] hexTlvRequest: "${hexTlvRequest}"`);

    let hexTlvResponse: string = '';

    const controlPointRequest: number = Utils.concatenate(tlvRequest.operation.value as number, tlvRequest.request.type);

    switch (controlPointRequest) {
    // Not called
    case this.GET_DEVICE_CREDENTIAL_REQUEST: {
      this.log.info(`[${this.accessoryName}] Access Control Point: GET Device Credential`);

      if (this.deviceCredentialPublicKeys.size > 0) {
        const issuerKeyIdentifier = this.deviceCredentialPublicKeys.keys().next().value;

        if (issuerKeyIdentifier !== undefined) {
          const response: TLVDeviceCredentialResponse = TLVDeviceCredentialResponse.getResponseForGetOperation(issuerKeyIdentifier);
          hexTlvResponse = response.toHexString();
        }
      }

      break;
    }
    case this.GET_READER_KEY_REQUEST: {
      this.log.info(`[${this.accessoryName}] Access Control Point: GET Reader Key`);

      if (this.readerPrivateKeys.size > 0) {
        const readerKeyIdentifier = this.readerPrivateKeys.keys().next().value;

        if (readerKeyIdentifier !== undefined) {
          const response: TLVReaderKeyResponse = TLVReaderKeyResponse.getResponseForGetOperation(readerKeyIdentifier);
          hexTlvResponse = response.toHexString();
        }
      }

      break;
    }
    case this.ADD_DEVICE_CREDENTIAL_REQUEST: {
      this.log.info(`[${this.accessoryName}] Access Control Point: ADD Device Credential`);

      const request: TLVDeviceCredentialRequest = tlvRequest.requestPayload as TLVDeviceCredentialRequest;
      const issuerKeyIdentifier: string = request.issuerKeyIdentifier!.value as string;
      const deviceCredentialPublicKey = request.deviceCredentialPublicKey!.value as string;
      // const keyState: number = request.keyState!.value as number;
      // const keyType: number = request.keyType!.value as number;

      let status = TLVUtils.STATUS_SUCCESS;
      if (this.deviceCredentialPublicKeys.size >= this.deviceCredentialPublicKeysCount) {
        status = TLVUtils.STATUS_OUT_OF_RESOURCES;
      }
      else if (this.deviceCredentialPublicKeys.get(issuerKeyIdentifier) !== undefined) {
        status = TLVUtils.STATUS_DUPLICATE;
      }
      else {
        this.deviceCredentialPublicKeys.set(issuerKeyIdentifier, deviceCredentialPublicKey);
      }

      const response: TLVDeviceCredentialResponse = TLVDeviceCredentialResponse.getResponseForAddOperation(issuerKeyIdentifier, status);
      hexTlvResponse = response.toHexString();

      break;
    }
    case this.ADD_GET_READER_KEY_REQUEST: {
      this.log.info(`[${this.accessoryName}] Access Control Point: ADD Reader Key`);

      const request: TLVReaderKeyRequest = tlvRequest.requestPayload as TLVReaderKeyRequest;
      const readerPrivateKey = request.readerPrivateKey!.value as string;
      // const keyType: number = request.keyType!.value as number;
      // const unknown: string = request.unknown!.value as string;

      const readerKeyIdentifier = TLVUtils.getReaderIdentifier(readerPrivateKey);
      let status = TLVUtils.STATUS_SUCCESS;
      if (this.readerPrivateKeys.size >= this.readerPrivateKeysCount) {
        status = TLVUtils.STATUS_OUT_OF_RESOURCES;
      }
      else if (this.readerPrivateKeys.get(readerKeyIdentifier) !== undefined) {
        status = TLVUtils.STATUS_DUPLICATE;
      }
      else {
        this.readerPrivateKeys.set(readerKeyIdentifier, readerPrivateKey);
      }

      const response: TLVReaderKeyResponse = TLVReaderKeyResponse.getResponseForAddOperation(status);
      hexTlvResponse = response.toHexString();

      break;
    }
    // Not called
    case this.RFEMOVE_DEVICE_CREDENTIAL_REQUEST: {
      this.log.info(`[${this.accessoryName}] Access Control Point: REMOVE Device Credential`);

      const request: TLVDeviceCredentialRequest = tlvRequest.requestPayload as TLVDeviceCredentialRequest;
      const issuerKeyIdentifier: string = request.issuerKeyIdentifier!.value as string;
      //const keyIdentifier: number = request.keyIdentifier!.value as number;

      let status = TLVUtils.STATUS_SUCCESS;
      if (this.deviceCredentialPublicKeys.get(issuerKeyIdentifier) === undefined) {
        status = TLVUtils.STATUS_DOES_NOT_EXIST;
      }
      else {
        this.deviceCredentialPublicKeys.delete(issuerKeyIdentifier);
      }

      const response: TLVDeviceCredentialResponse = TLVDeviceCredentialResponse.getResponseForRemoveOperation(status);
      hexTlvResponse = response.toHexString();

      break;
    }
    case this.REMOVE_GET_READER_KEY_REQUEST: {
      this.log.info(`[${this.accessoryName}] Access Control Point: REMOVE Reader Key`);

      const request: TLVReaderKeyRequest = tlvRequest.requestPayload as TLVReaderKeyRequest;
      const keyIdentifier = request.keyIdentifier!.value as string;

      let status = TLVUtils.STATUS_SUCCESS;
      if (this.readerPrivateKeys.get(keyIdentifier) === undefined) {
        status = TLVUtils.STATUS_DOES_NOT_EXIST;
      }
      else {
        this.readerPrivateKeys.delete(keyIdentifier);
      }

      const response: TLVReaderKeyResponse = TLVReaderKeyResponse.getResponseForRemoveOperation(status);
      hexTlvResponse = response.toHexString();

      break;
    }
    default: {
      if (!TLVUtils.OPERATIONS.includes(tlvRequest.operation.type)) {
        this.log.error(`[${this.accessoryName}] Invalid operation: "${tlvRequest.operation.value}"`);
      }
      if (!TLVUtils.REQUESTS.includes(tlvRequest.request.type)) {
        this.log.error(`[${this.accessoryName}] Invalid request: "${tlvRequest.request.type}"`);
      }
    }
    }

    this.log.debug(`[${this.accessoryName}] hexTlvResponse: "${hexTlvResponse}"`);

    const base64TlvResponse = Utils.hexStringEncodeToBase64(hexTlvResponse);
    return base64TlvResponse;
  }
}
