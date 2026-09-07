/* eslint-disable brace-style */

import { Units, CharacteristicValue, PlatformAccessory, WithUUID, Service } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { Utils } from '../utils/utils.js';
import { TLVDeviceCredentialRequest, TLVDeviceCredentialResponse, TLVReaderKeyRequest, TLVReaderKeyResponse, TLVRequest, TLVUtils } from '../utils/tlv.js';

/**
 * Lock - Accessory implementation
 */
export class Lock extends Accessory {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.LockMechanism;

  private readonly stateStorageKey: string = 'LockState';
  private readonly securityTimeoutStorageKey: string = 'LockAutoSecurityTimeout';
  private readonly lastKnownActionStorageKey: string = 'LockLastKnownAction';
  private readonly deviceCredentialPublicKeysStorageKey = 'DeviceCredentialPublicKeys';
  private readonly readerPrivateKeysStorageKey = 'readerPrivateKeys';

  // base64 encoded hex "010110020110"; 16 keys each
  private readonly deviceCredentialPublicKeysCount: number = 16;
  private readonly readerPrivateKeysCount: number = 16;

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

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    let LockCurrentState: number = Lock.SECURED;
    let LockTargetState: number = Lock.SECURED;
    let LockManagementAutoSecurityTimeout: number = 0;
    let LockLastKnownAction: number = Lock.UNSECURED_REMOTELY;
    const NFCAccessSupportedConfiguration: string = 'AQEQAgEQ';


    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.lock.defaultState === 'unlocked' ? Lock.UNSECURED : Lock.SECURED;
    // HomeKey appears to be broken right now, so temporarily leaving NFC out if no HomeKey card color is selected
    const walletKeyColor = (this.accessoryConfiguration.lock.walletKeyColor !== undefined) ? this.accessoryConfiguration.lock.walletKeyColor : undefined;
    this.setupHomeKey = (walletKeyColor === undefined) ? false : true;

    LockCurrentState = this.defaultState;
    LockManagementAutoSecurityTimeout = this.accessoryConfiguration.lock.autoSecurityTimeout;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedSecurityTimeout: number = accessoryState[this.securityTimeoutStorageKey] as number;
      const cachedLastKnownAction: number = accessoryState[this.lastKnownActionStorageKey] as number;

      const jsonDeviceCredentialPublicKeys: string = accessoryState[this.deviceCredentialPublicKeysStorageKey]; 
      const cachedDeviceCredentialPublicKeys = (jsonDeviceCredentialPublicKeys !== undefined) ? Utils.jsonToMap(jsonDeviceCredentialPublicKeys) : undefined;
      const jsonReaderPrivateKeys: string = accessoryState[this.readerPrivateKeysStorageKey];
      const cachedReaderPrivateKeys = (jsonReaderPrivateKeys !== undefined) ? Utils.jsonToMap(jsonReaderPrivateKeys) : undefined;

      if (cachedState !== undefined) {
        LockCurrentState = cachedState;
      }
      if (cachedSecurityTimeout !== undefined) {
        LockManagementAutoSecurityTimeout = cachedSecurityTimeout;
      }
      if (cachedLastKnownAction !== undefined) {
        LockLastKnownAction = cachedLastKnownAction;
      }
      if (cachedDeviceCredentialPublicKeys !== undefined) {
        this.deviceCredentialPublicKeys = cachedDeviceCredentialPublicKeys;
      }
      if (cachedReaderPrivateKeys !== undefined) {
        this.readerPrivateKeys = cachedReaderPrivateKeys;
      }
    }

    LockTargetState = LockCurrentState;

    if (this.setupHomeKey) {
      this.accessoryInformationService!.setCharacteristic(CharacteristicType.HardwareFinish, this.lockHardwareFinish[walletKeyColor as string]);
    }

    // Update the initial state of the accessory
    this.setLockCurrentState(LockCurrentState);
    this.setLockTargetState(LockTargetState);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.LockCurrentState)
      .onGet(this.getLockCurrentStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.LockTargetState)
      .onSet(this.setLockTargetStateHandler.bind(this))
      .onGet(this.getLockTargetStateHandler.bind(this));

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
    const lockManagementService =
      this.accessory.getService(lockManagementServiceName) ||
      this.accessory.addService(ServiceType.LockManagement, lockManagementServiceName, this.accessory.UUID + '-LMS');

    this.setCharacteristicValue(CharacteristicType.LockManagementAutoSecurityTimeout, LockManagementAutoSecurityTimeout);
    this.setCharacteristicValue(CharacteristicType.LockLastKnownAction, LockLastKnownAction);

    // Last register handlers

    lockManagementService.getCharacteristic(CharacteristicType.LockControlPoint)
      .onSet(this.setLockControlPoint.bind(this));
    lockManagementService.getCharacteristic(CharacteristicType.Version)
      .onGet(this.getVersion.bind(this));
    lockManagementService.getCharacteristic(CharacteristicType.LockManagementAutoSecurityTimeout)
      .onSet(this.setLockManagementAutoSecurityTimeout.bind(this))
      .onGet(this.getLockManagementAutoSecurityTimeout.bind(this))
      .setProps({
        minValue: 0,
        maxValue: 3600,
        minStep: 1,
        unit: Units.SECONDS,
      });
    lockManagementService.getCharacteristic(CharacteristicType.LockLastKnownAction)
      .onGet(this.getLockLastKnownAction.bind(this));

    // Creating Nfc Access service
    if (this.setupHomeKey) {
      const nfcAccessServiceName = `${this.accessoryName} Nfc Access`;
      const nfcAccessService =
        this.accessory.getService(nfcAccessServiceName) ||
        this.accessory.addService(ServiceType.NFCAccess, nfcAccessServiceName, this.accessory.UUID + '-NFC');

      this.setCharacteristicValue(CharacteristicType.NFCAccessSupportedConfiguration, NFCAccessSupportedConfiguration);

      // Last register handlers

      nfcAccessService.getCharacteristic(CharacteristicType.ConfigurationState)
        .onGet(this.getConfigurationState.bind(this));
      nfcAccessService.getCharacteristic(CharacteristicType.NFCAccessControlPoint)
        .onSet(this.setNFCAccessControlPoint.bind(this))
        .onGet(this.getNFCAccessControlPoint.bind(this));
      nfcAccessService.getCharacteristic(CharacteristicType.NFCAccessSupportedConfiguration)
        .onGet(this.getNFCAccessSupportedConfiguration.bind(this));
    }
  }

  //
  // ****************************** Handlers ******************************
  //

  // LockCurrentState

  async getLockCurrentStateHandler(): Promise<CharacteristicValue> {
    const LockCurrentState: number = this.getLockCurrentState();
    this.log.debug(`[${this.accessoryName}] Getting Current State: ${Lock.getStateName(LockCurrentState)}`);

    return LockCurrentState;
  }

  // LockTargetState

  async getLockTargetStateHandler(): Promise<CharacteristicValue> {
    const LockTargetState: number = this.getLockTargetState();
    this.log.debug(`[${this.accessoryName}] Getting Target State: ${Lock.getStateName(LockTargetState)}`);

    return LockTargetState;
  }

  async setLockTargetStateHandler(value: CharacteristicValue) {
    let LockTargetState: number = value as number;
    LockTargetState = this.updateLockTargetState(LockTargetState);
    this.log.info(`[${this.accessoryName}] Setting Target State: ${Lock.getStateName(LockTargetState)}`);

    const LockCurrentState: number = this.updateLockCurrentState(LockTargetState);
    this.log.info(`[${this.accessoryName}] Setting Current State: ${Lock.getStateName(LockCurrentState)}`);

    let LockLastKnownAction: number = (LockCurrentState === Lock.SECURED) ?
      Lock.SECURED_REMOTELY :
      Lock.UNSECURED_REMOTELY;
    LockLastKnownAction = this.updateCharacteristicValue(CharacteristicType.LockLastKnownAction, LockLastKnownAction) as number;
    this.log.info(`[${this.accessoryName}] Setting Lock Last Known Action: ${Lock.getStateName(LockLastKnownAction)}`);

    this.saveState();

    // Run auto lock timeout
    this.startAutoSecurityTimeout();
  }

  // Lock Management Service handlers

  async setLockControlPoint(value: CharacteristicValue) {
    const LockControlPoint = value;
    this.log.info(`[${this.accessoryName}] Setting Lock Control Point: ${LockControlPoint}`);
  }

  async getVersion(): Promise<CharacteristicValue> {
    const Version: string = '1.0.0';
    this.log.debug(`[${this.accessoryName}] Getting Lock Management Version: ${Version}`);

    return Version;
  }

  async getLockManagementAutoSecurityTimeout(): Promise<CharacteristicValue> {
    const LockAutoSecurityTimeout: number = this.getCharacteristicValue(CharacteristicType.LockManagementAutoSecurityTimeout) as number;
    this.log.debug(`[${this.accessoryName}] Getting Lock Management Auto Security Timeout: ${LockAutoSecurityTimeout}`);

    return LockAutoSecurityTimeout;
  }

  async setLockManagementAutoSecurityTimeout(value: CharacteristicValue) {
    let LockAutoSecurityTimeout: number = value as number;
    LockAutoSecurityTimeout = this.updateCharacteristicValue(CharacteristicType.LockManagementAutoSecurityTimeout, LockAutoSecurityTimeout) as number;
    this.log.info(`[${this.accessoryName}] Setting Lock Management Auto Security Timeout: ${LockAutoSecurityTimeout}`);
  }

  async getLockLastKnownAction(): Promise<CharacteristicValue> {
    const LockLastKnownAction: number = this.getCharacteristicValue(CharacteristicType.LockLastKnownAction) as number;
    this.log.debug(`[${this.accessoryName}] Getting Lock Last Known Action: ${LockLastKnownAction}`);

    return LockLastKnownAction;
  }

  // NFC Service handlers

  async getConfigurationState(): Promise<CharacteristicValue> {
    const ConfigurationState: number = 0;   // Successful
    this.log.debug(`[${this.accessoryName}] Getting NFC Access Configuration State: ${ConfigurationState}`);

    return ConfigurationState;
  }

  async getNFCAccessControlPoint(): Promise<CharacteristicValue> {
    const NFCAccessControlPoint: string = '';
    this.log.debug(`[${this.accessoryName}] Getting NFC Access Control Point: ${NFCAccessControlPoint}`);

    return NFCAccessControlPoint;
  }

  async setNFCAccessControlPoint(value: CharacteristicValue) {
    const NFCAccessControlPoint: string = value as string;

    try {
      const response: string = this.processAccessControlPointRequest(NFCAccessControlPoint);

      this.log.debug(`[${this.accessoryName}] Setting NFC Access Control Point: ${NFCAccessControlPoint}`);
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

  async getNFCAccessSupportedConfiguration(): Promise<CharacteristicValue> {
    const NFCAccessSupportedConfiguration: string = this.getCharacteristicValue(CharacteristicType.NFCAccessSupportedConfiguration) as string;
    this.log.debug(`[${this.accessoryName}] Getting NFC Access Supported Configuration: ${NFCAccessSupportedConfiguration}`);

    return NFCAccessSupportedConfiguration;
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getLockCurrentState(),
      [this.securityTimeoutStorageKey]: this.getCharacteristicValue(CharacteristicType.LockManagementAutoSecurityTimeout),
      [this.lastKnownActionStorageKey]: this.getCharacteristicValue(CharacteristicType.LockLastKnownAction),
    };

    if (this.setupHomeKey) {
      Object.assign(jsonState, { [this.deviceCredentialPublicKeysStorageKey]: Utils.mapToJson(this.deviceCredentialPublicKeys) });
      Object.assign(jsonState, { [this.readerPrivateKeysStorageKey]: Utils.mapToJson(this.readerPrivateKeys) });
    }

    const json = JSON.stringify(jsonState);
    return json;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return Lock.ACCESSORY_SERVICE_TYPE;
  }

  //

  private startAutoSecurityTimeout(): void {
    const LockTargetState: number = this.getLockTargetState();
    const LockManagementAutoSecurityTimeout: number = this.getCharacteristicValue(CharacteristicType.LockManagementAutoSecurityTimeout) as number;
    if (LockTargetState !== this.defaultState && LockManagementAutoSecurityTimeout > 0) {
      const securityTimeoutMillis: number = LockManagementAutoSecurityTimeout * 1000;
      this.securityTimerId = setTimeout(() => {
        // Reset timer
        clearTimeout(this.securityTimerId);

        this.service!.setCharacteristic(this.platform.Characteristic.LockTargetState, (this.defaultState));

        this.updateCharacteristicValue(CharacteristicType.LockLastKnownAction, Lock.SECURED_BY_AUTO_SECURE_TIMEOUT);
      }, securityTimeoutMillis)
        .unref();
 
      const timeout: string = Utils.secondsToHHmmss(LockManagementAutoSecurityTimeout);
      this.log.info(`[${this.accessoryName}] Security Timeout in ${timeout}`);
    }
    else {
      this.log.info(`[${this.accessoryName}] No Security Timeout defined`);
    }
  }

  private readonly GET_DEVICE_CREDENTIAL_REQUEST: number =      Utils.concatenate(TLVUtils.OPERATION_GET, TLVUtils.DEVICE_CREDENTIAL_REQUEST);
  private readonly GET_READER_KEY_REQUEST: number =             Utils.concatenate(TLVUtils.OPERATION_GET, TLVUtils.READER_KEY_REQUEST);
  private readonly ADD_DEVICE_CREDENTIAL_REQUEST: number =      Utils.concatenate(TLVUtils.OPERATION_ADD, TLVUtils.DEVICE_CREDENTIAL_REQUEST);
  private readonly ADD_GET_READER_KEY_REQUEST: number =         Utils.concatenate(TLVUtils.OPERATION_ADD, TLVUtils.READER_KEY_REQUEST);
  private readonly REMOVE_DEVICE_CREDENTIAL_REQUEST: number =   Utils.concatenate(TLVUtils.OPERATION_REMOVE, TLVUtils.DEVICE_CREDENTIAL_REQUEST);
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
    case this.REMOVE_DEVICE_CREDENTIAL_REQUEST: {
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

  //
  // ****************************** Characteristics ******************************
  //

  static readonly UNSECURED: number =                       CharacteristicType.LockCurrentState.UNSECURED;
  static readonly SECURED: number =                         CharacteristicType.LockCurrentState.SECURED;
  static readonly JAMMED: number =                          CharacteristicType.LockCurrentState.JAMMED;
  static readonly UNKNOWN: number =                         CharacteristicType.LockCurrentState.UNKNOWN;

  static readonly SECURED_REMOTELY: number =                CharacteristicType.LockLastKnownAction.SECURED_REMOTELY;
  static readonly UNSECURED_REMOTELY: number =              CharacteristicType.LockLastKnownAction.UNSECURED_REMOTELY;
  static readonly SECURED_BY_AUTO_SECURE_TIMEOUT: number =  CharacteristicType.LockLastKnownAction.SECURED_BY_AUTO_SECURE_TIMEOUT;

  static getStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Lock.UNSECURED: { stateName = 'UNSECURED'; break; }
    case Lock.SECURED: { stateName = 'SECURED'; break; }
    case Lock.JAMMED: { stateName = 'JAMMED'; break; }
    case Lock.UNKNOWN: { stateName = 'UNKNOWN'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}
