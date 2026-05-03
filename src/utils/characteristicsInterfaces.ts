
export function staticImplements<T>() {
  return <U extends T>(constructor: U) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    constructor;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Characteristic {
}

export interface CharacteristicStatic {
    new():Characteristic;
    getName(status: number): string;
}

export interface BinaryCharacteristicStatic {
    new():Characteristic;
    getName(status: boolean): string;
}
