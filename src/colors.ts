
export class ColorHSL {

  hue: number;
  saturation: number;
  luminance: number;

  constructor(
    hue: number,
    saturation: number,
    luminance: number,
  ) {
    this.hue = hue;
    this.saturation = saturation;
    this.luminance = luminance;
  }
}

export class ColorRGB {

  red: number;
  green: number;
  blue: number;

  constructor(
    red: number,
    green: number,
    blue: number,
  ) {
    this.red = red;
    this.green = green;
    this.blue = blue;
  }
}

/**
 * Colors
 */
export class Colors {

  static isValidHex(
    value: string,
  ): boolean {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);

    return (result !== undefined);
  }

  static HSLToHex(
    hsl: ColorHSL,
  ): string {
    const hue: number = hsl.hue;
    const saturation: number = hsl.saturation;
    const luminance: number = hsl.luminance;

    const hueDecimal: number = luminance / 100;
    const a: number = (saturation * Math.min(hueDecimal, 1 - hueDecimal)) / 100;
    const hexFunc = (n: number) => {
      const k = (n + hue / 30) % 12;
      const color = hueDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

      // Convert to Hex and prefix with "0" if required
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, '0');
    };

    return `#${hexFunc(0)}${hexFunc(8)}${hexFunc(4)}`;
  }

  static HexToHSL(
    hex: string,
  ): ColorHSL | undefined {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    if (!result) {
      return undefined;
    }

    const red: number = parseInt(result[1], 16) / 255;
    const green: number = parseInt(result[2], 16) / 255;
    const blue: number = parseInt(result[3], 16) / 255;

    const max: number = Math.max(red, green, blue);
    const min: number = Math.min(red, green, blue);

    let hue: number = (max + min) / 2;
    let saturation: number = hue;
    let luminance: number = hue;

    if (max === min) {
    // Achromatic
      return new ColorHSL(0, 0, luminance);
    }

    const d: number = max - min;
    saturation = luminance > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
    case red:
      hue = (green - blue) / d + (green < blue ? 6 : 0);
      break;
    case green:
      hue = (blue - red) / d + 2;
      break;
    case blue:
      hue = (red - green) / d + 4;
      break;
    }
    hue /= 6;

    saturation = saturation * 100;
    saturation = Math.round(saturation);
    luminance = luminance * 100;
    luminance = Math.round(luminance);
    hue = Math.round(360 * hue);

    return new ColorHSL(hue, saturation, luminance);
  }

  static HSLToRGB(
    hsl: ColorHSL,
  ): ColorRGB {
    const hue: number = hsl.hue / 100;
    const saturation: number = hsl.saturation / 100;
    const luminance: number = hsl.luminance / 100;

    if (saturation === 0) {
      return new ColorRGB(luminance, luminance, luminance);
    }

    const HueToRGB = (p: number, q: number, t: number) => {
      if (t < 0) {
        t += 1;
      }
      if (t > 1) {
        t -= 1;
      }
      if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
      }
      if (t < 1 / 2) {
        return q;
      }
      if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
      }
      return p;
    };

    const q: number =
      luminance < 0.5 ?
        luminance * (1 + saturation) :
        luminance + saturation - luminance * saturation;
    const p: number = 2 * luminance - q;

    const red: number = HueToRGB(p, q, hue + 1 / 3);
    const green: number = HueToRGB(p, q, hue);
    const blue: number = HueToRGB(p, q, hue - 1 / 3);

    return new ColorRGB(red * 255, green * 255, blue * 255);
  }

  static RGBToHSL(
    rgb: ColorRGB,
  ): ColorHSL {
    const red: number = rgb.red / 255;
    const green: number = rgb.green / 255;
    const blue: number = rgb.blue / 255;

    const max: number = Math.max(red, green, blue);
    const min: number = Math.min(red, green, blue);

    let hue: number = (max + min) / 2;
    let saturation: number = hue;
    const luminance: number = hue;

    if (max === min) {
    // Achromatic
      return new ColorHSL(0, 0, luminance);
    }

    const d = max - min;
    saturation = luminance >= 0.5 ? d / (2 - (max + min)) : d / (max + min);
    switch (max) {
    case red:
      hue = ((green - blue) / d + 0) * 60;
      break;
    case green:
      hue = ((blue - red) / d + 2) * 60;
      break;
    case blue:
      hue = ((red - green) / d + 4) * 60;
      break;
    }

    return new ColorHSL(Math.round(hue), Math.round(saturation * 100), Math.round(luminance * 100));
  }
}
