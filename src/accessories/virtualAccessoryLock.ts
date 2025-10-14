/* eslint-disable brace-style */

import { Units, CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { Utils } from '../utils/utils.js';
import { TLVDeviceCredentialRequest, TLVDeviceCredentialResponse, TLVReaderKeyRequest, TLVReaderKeyResponse, TLVRequest, TLVUtils } from '../utils/tlv.js';

/**
 * Lock - Accessory implementation
 */
export class Lock extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Lock';

  static readonly UNSECURED: number = 0;  // Characteristic.LockCurrentState.UNSECURED
  static readonly SECURED: number = 1;    // Characteristic.LockCurrentState.SECURED
  static readonly JAMMED: number = 2;     // Characteristic.LockCurrentState.JAMMED
  static readonly UNKNOWN: number = 3;    // Characteristic.LockCurrentState.UNKNOWN

  static readonly SECURED_REMOTELY: number = 6;                 // Characteristic.LockLastKnownAction.SECURED_REMOTELY
  static readonly UNSECURED_REMOTELY: number = 7;               // Characteristic.LockLastKnownAction.UNSECURED_REMOTELY
  static readonly SECURED_BY_AUTO_SECURE_TIMEOUT: number = 8;   // Characteristic.LockLastKnownAction.SECURED_BY_AUTO_SECURE_TIMEOUT

  private readonly stateStorageKey: string = 'LockState';
  private readonly securityTimeoutStorageKey: string = 'LockAutoSecurityTimeout';
  private readonly lastKnownActionKey: string = 'LockLastKnownAction';

  // https://github.com/kupa22/apple-homekey#characteristic-nfc-access-supported-configuration
  // base64 encoded hex "010110020110"; 16 keys each
  private readonly nfcAccessSupportedConfiguration: string = 'AQEQAgEQ';

  // https://github.com/kupa22/apple-homekey#characteristic-hardware-finish
  // base64 encoded hex
  private readonly lockHardwareFinish: Record<string, string> = {
    'tan': 'AQTO1doA',      // 0104CED5DA00
    'gold': 'AQSq1uwA',     // 0104AAD6EC00
    'silver': 'AQTj4+MA',   // 0104E3E3E300
    'black': 'AQQAAAAA',    // 010400000000
  };

  private securityTimerId: ReturnType<typeof setTimeout> | undefined;

  private states = {
    LockCurrentState: Lock.SECURED,
    LockTargetState: Lock.SECURED,
    LockManagementAutoSecurityTimeout: 0,
    LockLastKnownAction: Lock.UNSECURED_REMOTELY,
  };

  private deviceCredentialPublicKeys = new Map<string, string>();
  private readerPrivateKey: string = '';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.lock.defaultState === 'unlocked' ? Lock.UNSECURED : Lock.SECURED;
    const autoSecurityTimeout = this.accessoryConfiguration.lock.autoSecurityTimeout;
    const walletKeyColor = this.accessoryConfiguration.lock.walletKeyColor;

    this.states.LockCurrentState = this.defaultState;
    this.states.LockManagementAutoSecurityTimeout = autoSecurityTimeout;
    this.states.LockLastKnownAction = Lock.UNSECURED_REMOTELY;      // There is no "unknown" value

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedSecurityTimeout: number = accessoryState[this.securityTimeoutStorageKey] as number;
      const cachedLastKnownAction: number = accessoryState[this.lastKnownActionKey] as number;

      if (cachedState !== undefined) {
        this.states.LockCurrentState = cachedState;
      }
      if (cachedSecurityTimeout !== undefined) {
        this.states.LockManagementAutoSecurityTimeout = cachedSecurityTimeout;
      }
      if (cachedLastKnownAction !== undefined) {
        this.states.LockLastKnownAction = cachedLastKnownAction;
      }
    }

    this.states.LockTargetState = this.states.LockCurrentState;

    this.accessoryInformationService!.setCharacteristic(this.platform.Characteristic.HardwareFinish, this.lockHardwareFinish[walletKeyColor]);

    this.service = this.accessory.getService(this.platform.Service.LockMechanism) || this.accessory.addService(this.platform.Service.LockMechanism);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Current State: ${Lock.getStateName(this.states.LockCurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, (this.states.LockCurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, (this.states.LockTargetState));

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
    const lockManagementServiceName = `${this.accessoryConfiguration.accessoryName} Management`;
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

    // Creating Nfc Access service
    const nfcAccessServiceName = `${this.accessoryConfiguration.accessoryName} Nfc Access`;
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

  // Handlers

  async getLockCurrentState(): Promise<CharacteristicValue> {
    const lockState = this.states.LockCurrentState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current State: ${Lock.getStateName(lockState)}`);

    return lockState;
  }

  async setLockTargetState(value: CharacteristicValue) {
    this.states.LockTargetState = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target State: ${Lock.getStateName(this.states.LockTargetState)}`);

    this.states.LockCurrentState = this.states.LockTargetState;
    this.service!.setCharacteristic(this.platform.Characteristic.LockCurrentState, (this.states.LockCurrentState));

    this.states.LockLastKnownAction = (this.states.LockCurrentState === Lock.SECURED) ?
      Lock.SECURED_REMOTELY :
      Lock.UNSECURED_REMOTELY;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current State: ${Lock.getStateName(this.states.LockCurrentState)}`);

    // Run auto lock timeout
    this.startAutoSecurityTimeout();
  }

  async getLockTargetState(): Promise<CharacteristicValue> {
    const lockState = this.states.LockTargetState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target State: ${Lock.getStateName(lockState)}`);

    return lockState;
  }

  // Lock Management Service handlers

  async setLockControlPoint(value: CharacteristicValue) {
    const lockControlPoint = value;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Control Point: ${lockControlPoint}`);
  }

  async getVersion(): Promise<CharacteristicValue> {
    const version = '1.0.0';

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Lock Management Version: ${version}`);

    return version;
  }

  async setLockManagementAutoSecurityTimeout(value: CharacteristicValue) {
    this.states.LockManagementAutoSecurityTimeout = value as number;

    // eslint-disable-next-line max-len
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Management Auto Security Timeout: ${this.states.LockManagementAutoSecurityTimeout}`);
  }

  async getLockManagementAutoSecurityTimeout(): Promise<CharacteristicValue> {
    const lockManagementAutoSecurityTimeout = this.states.LockManagementAutoSecurityTimeout;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Lock Management Auto Security Timeout: ${lockManagementAutoSecurityTimeout}`);

    return lockManagementAutoSecurityTimeout;
  }

  async getLockLastKnownAction(): Promise<CharacteristicValue> {
    const lockLastKnownAction = this.states.LockLastKnownAction;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Lock Last Known Action: ${lockLastKnownAction}`);

    return lockLastKnownAction;
  }

  // NFC Service handlers

  async getConfigurationState(): Promise<CharacteristicValue> {
    const configurationState = 0;   // Successful

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting NFC Access Configuration State: ${configurationState}`);

    return configurationState;
  }

  async setNFCAccessControlPoint(value: CharacteristicValue) {
    const nfcAccessControlPoint = value as string;

    try {
      const response: string = this.processAccessControlPointRequest(nfcAccessControlPoint);

      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting NFC Access Control Point: ${nfcAccessControlPoint}`);
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] NFC Access Control Point Response: "${response}"`);

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

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting NFC Access Control Point: ${nfcAccessControlPoint}`);

    return nfcAccessControlPoint;
  }

  async getNFCAccessSupportedConfiguration(): Promise<CharacteristicValue> {
    const nfcAccessSupportedConfiguration = this.nfcAccessSupportedConfiguration;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting NFC Access Supported Configuration: ${nfcAccessSupportedConfiguration}`);

    return nfcAccessSupportedConfiguration;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.LockCurrentState,
      [this.securityTimeoutStorageKey]: this.states.LockManagementAutoSecurityTimeout,
      [this.lastKnownActionKey]: this.states.LockLastKnownAction,
    });
    return json;
  }

  protected getAccessoryTypeName(): string {
    return Lock.ACCESSORY_TYPE_NAME;
  }

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

  private startAutoSecurityTimeout(): void {
    if (this.states.LockTargetState !== this.defaultState && this.states.LockManagementAutoSecurityTimeout > 0) {
      const securityTimeoutMillis: number = this.states.LockManagementAutoSecurityTimeout * 1000;
      this.securityTimerId = setTimeout(() => {
        // Reset timer
        clearTimeout(this.securityTimerId);

        this.service!.setCharacteristic(this.platform.Characteristic.LockTargetState, (this.defaultState));

        this.states.LockLastKnownAction = Lock.SECURED_BY_AUTO_SECURE_TIMEOUT;
      }, securityTimeoutMillis);
 
      const timeout: string = Utils.secondsToHHmmss(this.states.LockManagementAutoSecurityTimeout);
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Security Timeout in ${timeout}`);
    }
    else {
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] No Security Timeout defined`);
    }
  }

  private processAccessControlPointRequest(base64TlvRequest: string) {
    const hexTlvRequest: string = Utils.base64DecodeToHexString(base64TlvRequest);
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] hexTlvRequest: "${hexTlvRequest}"`);
    const tlvRequest: TLVRequest = new TLVRequest(hexTlvRequest);
    // eslint-disable-next-line max-len
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] tlvRequest operation: type: "${tlvRequest.operation.type}", length: "${tlvRequest.operation.length}", value: "${tlvRequest.operation.value}"`);
    // eslint-disable-next-line max-len
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] tlvRequest request: type: "${tlvRequest.request.type}", length: "${tlvRequest.request.length}", value: "${tlvRequest.request.value}"`);

    let hexTlvResponse: string = '';

    if (tlvRequest.operation.value === TLVUtils.OPERATION_GET) {
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Access Control Point: GET`);

      // Not called
      if (tlvRequest.request.type === TLVUtils.DEVICE_CREDENTIAL_REQUEST) {
        this.log.info(`[${this.accessoryConfiguration.accessoryName}] Access Control Point: Device Credential`);

        const response: TLVDeviceCredentialResponse = TLVDeviceCredentialResponse.getResponseForGetOperation('');
        hexTlvResponse = response.toHexString();
      }
      else if (tlvRequest.request.type === TLVUtils.READER_KEY_REQUEST) {
        this.log.info(`[${this.accessoryConfiguration.accessoryName}] Access Control Point: Reader Key`);

        if (this.readerPrivateKey !== '') {
          const response: TLVReaderKeyResponse = TLVReaderKeyResponse.getResponseForGetOperation(TLVUtils.getReaderIdentifier(this.readerPrivateKey));
          hexTlvResponse = response.toHexString();
        }
      }
      else {
        this.log.error(`[${this.accessoryConfiguration.accessoryName}] Invalid request: "${tlvRequest.request.type}"`);
      }
    }
    else if (tlvRequest.operation.value === TLVUtils.OPERATION_ADD) {
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Access Control Point ADD`);

      if (tlvRequest.request.type === TLVUtils.DEVICE_CREDENTIAL_REQUEST) {
        this.log.info(`[${this.accessoryConfiguration.accessoryName}] Access Control Point: Device Credential`);

        const request: TLVDeviceCredentialRequest = tlvRequest.requestPayload as TLVDeviceCredentialRequest;
        this.deviceCredentialPublicKeys.set(request.issuerKeyIdentifier!.value as string, request.deviceCredentialPublicKey!.value as string);
        const issuerKeyIdentifier: string = request.issuerKeyIdentifier!.value as string;
        //const keyState: number = request.keyState!.value as number;

        const response: TLVDeviceCredentialResponse = TLVDeviceCredentialResponse.getResponseForAddOperation(issuerKeyIdentifier, TLVUtils.STATUS_SUCCESS);
        hexTlvResponse = response.toHexString();
      }
      else if (tlvRequest.request.type === TLVUtils.READER_KEY_REQUEST) {
        this.log.info(`[${this.accessoryConfiguration.accessoryName}] Access Control Point: Reader Key`);

        const request: TLVReaderKeyRequest = tlvRequest.requestPayload as TLVReaderKeyRequest;
        this.readerPrivateKey = request.readerPrivateKey!.value as string;
        //const unknown: string = request.unknown!.value as string;

        const response: TLVReaderKeyResponse = TLVReaderKeyResponse.getResponseForAddOperation(TLVUtils.STATUS_SUCCESS);
        hexTlvResponse = response.toHexString();
      }
      else {
        this.log.error(`[${this.accessoryConfiguration.accessoryName}] Invalid request: "${tlvRequest.request.type}"`);
      }
    }
    else if (tlvRequest.operation.value === TLVUtils.OPERATION_REMOVE) {
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Access Control Point REMOVE`);

      // Not called
      if (tlvRequest.request.type === TLVUtils.DEVICE_CREDENTIAL_REQUEST) {
        this.log.info(`[${this.accessoryConfiguration.accessoryName}] Access Control Point: Device Credential`);

        const request: TLVDeviceCredentialRequest = tlvRequest.requestPayload as TLVDeviceCredentialRequest;
        this.deviceCredentialPublicKeys.delete(request.issuerKeyIdentifier!.value as string);
        //const issuerKeyIdentifier: string = request.issuerKeyIdentifier!.value as string;
        //const keyState: number = request.keyState!.value as number;

        const response: TLVDeviceCredentialResponse = TLVDeviceCredentialResponse.getResponseForRemoveOperation(TLVUtils.STATUS_SUCCESS);
        hexTlvResponse = response.toHexString();
      }
      // Not called
      else if (tlvRequest.request.type === TLVUtils.READER_KEY_REQUEST) {
        this.log.info(`[${this.accessoryConfiguration.accessoryName}] Access Control Point: Reader Key`);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const request: TLVReaderKeyRequest = tlvRequest.requestPayload as TLVReaderKeyRequest;
        this.readerPrivateKey = '';
        //const unknown: string = request.unknown!.value as string;

        const response: TLVReaderKeyResponse = TLVReaderKeyResponse.getResponseForRemoveOperation(TLVUtils.STATUS_SUCCESS);
        hexTlvResponse = response.toHexString();
      }
      else {
        this.log.error(`[${this.accessoryConfiguration.accessoryName}] Invalid request: "${tlvRequest.request.type}"`);
      }
    }
    else {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Invalid operation: "${tlvRequest.operation.value}"`);
    }

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] hexTlvResponse: "${hexTlvResponse}"`);

    const base64TlvResponse = Utils.hexStringEncodeToBase64(hexTlvResponse);
    return base64TlvResponse;
  }
}
