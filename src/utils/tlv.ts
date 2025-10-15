/* eslint-disable brace-style */

import { createHash } from 'crypto';

/**
 * TLV8
 * 
 * https://github.com/kupa22/apple-homekey
 */
export class TLVUtils {

  // Request
  public static readonly OPERATION: number = 1;
  public static readonly DEVICE_CREDENTIAL_REQUEST: number = 4;
  public static readonly DEVICE_CREDENTIAL_RESPONSE: number = 5;
  public static readonly READER_KEY_REQUEST: number = 6;
  public static readonly READER_KEY_RESPONSE: number = 7;

  // Operation value
  public static readonly OPERATION_GET: number = 1;
  public static readonly OPERATION_ADD: number = 2;
  public static readonly OPERATION_REMOVE: number = 3;

  // Device Credential Request
  public static readonly DEVICE_CREDENTIAL_REQUEST_KEY_TYPE: number = 1;                        // Add
  public static readonly DEVICE_CREDENTIAL_REQUEST_DEVICE_CREDENTIAL_PUBLIC_KEY: number = 2;    // Add
  public static readonly DEVICE_CREDENTIAL_REQUEST_ISSUER_KEY_IDENTIFIER: number = 3;           // Add
  public static readonly DEVICE_CREDENTIAL_REQUEST_KEY_STATE: number = 4;                       // Add
  public static readonly DEVICE_CREDENTIAL_REQUEST_KEY_IDENTIFIER: number = 5;                  // Remove? (not seen yet)

  // Device Credential Response
  public static readonly DEVICE_CREDENTIAL_RESPONSE_KEY_IDENTIFIER : number = 1;          // Get? (not seen yet)
  public static readonly DEVICE_CREDENTIAL_RESPONSE_ISSUER_KEY_IDENTIFIER : number = 2;   // Add
  public static readonly DEVICE_CREDENTIAL_RESPONSE_STATUS : number = 3;                  // Add, Remove

  // Reader Key Request
  public static readonly READER_KEY_REQUEST_KEY_TYPE : number = 1;              // Add
  public static readonly READER_KEY_REQUEST_READER_PRIVATE_KEY : number = 2;    // Add
  public static readonly READER_KEY_REQUEST_UNKNOWN : number = 3;               // Add
  public static readonly READER_KEY_REQUEST_KEY_IDENTIFIER : number = 4;        // Remove

  // Reader Key Response
  public static readonly READER_KEY_RESPONSE_KEY_IDENTIFIER : number = 1;   // Get? (not seen yet)
  public static readonly READER_KEY_RESPONSE_STATUS : number = 2;           // Add, Remove

  // Key Types values
  public static readonly KEY_TYPE_CURVE25519: number = 1;
  public static readonly KEY_TYPE_SECP256R1: number = 2;

  // Status values
  public static readonly STATUS_SUCCESS: number = 0;            // Add, Remove
  public static readonly STATUS_OUT_OF_RESOURCES: number = 1;   // Add, Remove
  public static readonly STATUS_DUPLICATE: number = 2;          // Add, Remove
  public static readonly STATUS_DOES_NOT_EXIST: number = 3;     // Add, Remove
  public static readonly STATUS_NOT_SUPPORTED: number = 4;      // Add, Remove

  // Key State values
  public static readonly KEY_STATE_INACTIVE: number = 0;    // (not seen yet)
  public static readonly KEY_STATE_ACTIVE: number = 1;

  static parseTLVs(tlvString: string): Set<TLV> {
    let hexString = tlvString;
    const tlvs: Set<TLV> = new Set<TLV>();

    while (hexString.length > 0) {
      const valueLength: number = parseInt(hexString.substring(2, 4), 16);
      const splitIndex: number = 4 + (valueLength * 2);   // hex values are two characters

      const tlvHexObject: string = hexString.substring(0, splitIndex);
      const tlv: TLV = TLV.fromHexString(tlvHexObject);

      tlvs.add(tlv);

      hexString = hexString.substring(splitIndex);
    }

    return tlvs;
  }

  static toHexString(number: number): string {
    return number.toString(16).padStart(2, '0');
  }

  static getReaderIdentifier(readerPrivateKey: string) {
    const KEY_IDENTIFIER = '6B65792D6964656E746966696572';    // hex encoding of "key-identifier"

    const prefixBuffer = Buffer.from(KEY_IDENTIFIER, 'hex');
    const readerPrivateKeyBuffer = Buffer.from(readerPrivateKey, 'hex');
    const valueBuffer = Buffer.concat([prefixBuffer, readerPrivateKeyBuffer]);

    const sha256hash: Buffer = createHash('sha256').update(valueBuffer).digest();
    const first8Bytes: Buffer = sha256hash.subarray(0, 8);

    return first8Bytes.toString('hex');
  }
}

export class TLV {

  public type: number = 0;
  public length: number = 0;
  public value: number | string = 0;

  static new(type: number, length: number, value: number | string): TLV {
    const tlv = new TLV();
    tlv.type = type;
    tlv.length = length;
    tlv.value = value;

    return tlv;
  }

  static fromHexString(tlvHexString: string): TLV {
    const type = tlvHexString.substring(0, 2);
    const length = tlvHexString.substring(2, 4);
    const value = tlvHexString.substring(4);

    const tlv = new TLV();
    tlv.type = parseInt(type, 16);
    tlv.length = parseInt(length, 16);
    if (value.length === 2) {
      tlv.value = parseInt(value, 16);
    }
    else {
      tlv.value = value;
    }

    return tlv;
  }

  private constructor() {}

  toHexString() {
    const type = TLVUtils.toHexString(this.type);
    const length = TLVUtils.toHexString(this.length);
    let value = '';

    if (typeof this.value === 'string') {
      value = this.value;
    }
    else if (typeof this.value === 'number') {
      value = TLVUtils.toHexString(this.value);
    }

    return `${type}${length}${value}`;
  }

  toFormattedHexString() {
    const type = TLVUtils.toHexString(this.type);
    const length = TLVUtils.toHexString(this.length);
    let value = '';

    if (typeof this.value === 'string') {
      value = this.value;
    }
    else if (typeof this.value === 'number') {
      value = TLVUtils.toHexString(this.value);
    }

    return `${type} ${length} ${value}`;
  }
}

export class TLVRequest {

  public operation!: TLV;
  public request!: TLV;
  public requestPayload?: TLVDeviceCredentialRequest | TLVReaderKeyRequest;

  constructor(tlvString: string) {
    const tlvs: Set<TLV> = TLVUtils.parseTLVs(tlvString);

    tlvs.forEach(tlv => {
      switch (tlv.type) {
      case TLVUtils.OPERATION: {
        this.operation = tlv;
        break;
      }
      default: {
        this.request = tlv;
      }
      }
    });    

    if (this.request.type === TLVUtils.DEVICE_CREDENTIAL_REQUEST) {
      this.requestPayload = new TLVDeviceCredentialRequest(this.request.value as string);
    }
    else if (this.request.type === TLVUtils.READER_KEY_REQUEST) {
      this.requestPayload = new TLVReaderKeyRequest(this.request.value as string);
    }
    else {
      console.log(`Invalid request type: ${this.request.type}`);
    }
  }
}

export class TLVDeviceCredentialRequest {

  public keyType?: TLV;                     // Add
  public deviceCredentialPublicKey?: TLV;   // Add
  public issuerKeyIdentifier?: TLV;         // Add
  public keyState?: TLV;                    // Add
  public keyIdentifier?: TLV;               // Remove? (not seen yet)

  constructor(tlvString: string) {
    const tlvs: Set<TLV> = TLVUtils.parseTLVs(tlvString);

    tlvs.forEach(tlv => {
      switch (tlv.type) {
      case TLVUtils.DEVICE_CREDENTIAL_REQUEST_KEY_TYPE: {
        this.keyType = tlv;
        break;
      }
      case TLVUtils.DEVICE_CREDENTIAL_REQUEST_DEVICE_CREDENTIAL_PUBLIC_KEY: {
        this.deviceCredentialPublicKey = tlv;
        break;
      }
      case TLVUtils.DEVICE_CREDENTIAL_REQUEST_ISSUER_KEY_IDENTIFIER: {
        this.issuerKeyIdentifier = tlv;
        break;
      }
      case TLVUtils.DEVICE_CREDENTIAL_REQUEST_KEY_STATE: {
        this.keyState = tlv;
        break;
      }
      case TLVUtils.DEVICE_CREDENTIAL_REQUEST_KEY_IDENTIFIER: {
        this.keyIdentifier = tlv;
        break;
      }
      default: {
        console.log(`Invalid TLVDeviceCredentialRequest sub tlv: ${tlv.type}`);
      }
      }
    });
  }
}

export class TLVDeviceCredentialResponse {

  private operation!: number;

  private keyIdentifier?: TLV;          // Get? (not seen yet)
  private issuerKeyIdentifier?: TLV;    // Add
  private status?: TLV;                 // Add, Remove

  private constructor() {}

  toHexString(): string {
    let responseValue: string = '';

    if (this.operation === TLVUtils.OPERATION_GET) {
      responseValue = this.keyIdentifier!.toHexString();
    }
    else if (this.operation === TLVUtils.OPERATION_ADD) {
      responseValue = this.issuerKeyIdentifier!.toHexString() + this.status!.toHexString();
    }
    else if (this.operation === TLVUtils.OPERATION_REMOVE) {
      responseValue = this.status!.toHexString();
    }

    const responseType: string = TLVUtils.toHexString(TLVUtils.READER_KEY_RESPONSE);
    const responseLength = TLVUtils.toHexString(responseValue.length / 2);   // hex values are two characters

    return `${responseType}${responseLength}${responseValue}`;
  }

  static getResponseForGetOperation(keyIdentifier: string): TLVDeviceCredentialResponse {
    const response = new TLVDeviceCredentialResponse();
    response.keyIdentifier = TLV.new(TLVUtils.DEVICE_CREDENTIAL_RESPONSE_KEY_IDENTIFIER, keyIdentifier.length / 2, keyIdentifier);

    response.operation = TLVUtils.OPERATION_GET;

    return response;
  }

  static getResponseForAddOperation(issuerKeyIdentifier: string, status: number): TLVDeviceCredentialResponse {
    const response = new TLVDeviceCredentialResponse();
    response.issuerKeyIdentifier = TLV.new(TLVUtils.DEVICE_CREDENTIAL_RESPONSE_ISSUER_KEY_IDENTIFIER, issuerKeyIdentifier.length / 2, issuerKeyIdentifier);
    response.status = TLV.new(TLVUtils.DEVICE_CREDENTIAL_RESPONSE_STATUS, 1, status);

    response.operation = TLVUtils.OPERATION_ADD;

    return response;
  }

  static getResponseForRemoveOperation(status: number): TLVDeviceCredentialResponse {
    const response = new TLVDeviceCredentialResponse();
    response.status = TLV.new(TLVUtils.DEVICE_CREDENTIAL_RESPONSE_STATUS, 1, status);

    response.operation = TLVUtils.OPERATION_REMOVE;

    return response;
  }
}

export class TLVReaderKeyRequest {

  public keyType?: TLV;             // Add
  public readerPrivateKey?: TLV;    // Add
  public unknown?: TLV;             // Add
  public keyIdentifier?: TLV;       // Remove

  constructor(tlvString: string) {
    const tlvs: Set<TLV> = TLVUtils.parseTLVs(tlvString);

    tlvs.forEach(tlv => {
      switch (tlv.type) {
      case TLVUtils.READER_KEY_REQUEST_KEY_TYPE: {
        this.keyType = tlv;
        break;
      }
      case TLVUtils.READER_KEY_REQUEST_READER_PRIVATE_KEY: {
        this.readerPrivateKey = tlv;
        break;
      }
      case TLVUtils.READER_KEY_REQUEST_UNKNOWN: {
        this.unknown = tlv;
        break;
      }
      case TLVUtils.READER_KEY_REQUEST_KEY_IDENTIFIER: {
        this.keyIdentifier = tlv;
        break;
      }
      default: {
        console.log(`Invalid TLVReaderKeyRequest sub tlv: ${tlv.type}`);
      }
      }
    });
  }
}

export class TLVReaderKeyResponse {

  private operation!: number;

  private keyIdentifier?: TLV;    // Get
  private status?: TLV;           // Add, Remove

  private constructor() {}

  toHexString(): string {
    let responseValue: string = '';

    if (this.operation === TLVUtils.OPERATION_GET) {
      responseValue = this.keyIdentifier!.toHexString();
    }
    else if (this.operation === TLVUtils.OPERATION_ADD || this.operation === TLVUtils.OPERATION_REMOVE) {
      responseValue = this.status!.toHexString();
    }

    const responseType: string = TLVUtils.toHexString(TLVUtils.READER_KEY_RESPONSE);
    const responseLength = TLVUtils.toHexString(responseValue.length / 2);   // hex values are two characters

    return `${responseType}${responseLength}${responseValue}`;
  }

  static getResponseForGetOperation(keyIdentifier: string): TLVReaderKeyResponse {
    const response = new TLVReaderKeyResponse();
    response.keyIdentifier = TLV.new(TLVUtils.READER_KEY_RESPONSE_KEY_IDENTIFIER, keyIdentifier.length / 2, keyIdentifier);

    response.operation = TLVUtils.OPERATION_GET;

    return response;
  }

  static getResponseForAddOperation(status: number): TLVReaderKeyResponse {
    const response = new TLVReaderKeyResponse();
    response.status = TLV.new(TLVUtils.READER_KEY_RESPONSE_STATUS, 1, status);

    response.operation = TLVUtils.OPERATION_ADD;

    return response;
  }

  static getResponseForRemoveOperation(status: number): TLVReaderKeyResponse {
    const response = new TLVReaderKeyResponse();
    response.status = TLV.new(TLVUtils.READER_KEY_RESPONSE_STATUS, 1, status);

    response.operation = TLVUtils.OPERATION_REMOVE;

    return response;
  }
}
