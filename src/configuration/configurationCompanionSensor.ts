/**
 * 
 */
export class CompanionSensorConfiguration {
  name!: string;
  type!: string;

  isValid(): boolean {
    const validName: boolean = (this.name !== undefined);
    const validType: boolean = (this.type !== undefined);

    return (validName && validType);
  }
}
