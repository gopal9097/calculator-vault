export class ConverterEngine {
  constructor() {
    this.definitions = {
      length: {
        name: 'Length',
        base: 'm',
        units: {
          nm: { name: 'Nanometers (nm)', factor: 1e-9 },
          um: { name: 'Micrometers (μm)', factor: 1e-6 },
          mm: { name: 'Millimeters (mm)', factor: 0.001 },
          cm: { name: 'Centimeters (cm)', factor: 0.01 },
          m: { name: 'Meters (m)', factor: 1 },
          km: { name: 'Kilometers (km)', factor: 1000 },
          in: { name: 'Inches (in)', factor: 0.0254 },
          ft: { name: 'Feet (ft)', factor: 0.3048 },
          yd: { name: 'Yards (yd)', factor: 0.9144 },
          mi: { name: 'Miles (mi)', factor: 1609.344 },
          nmi: { name: 'Nautical Miles (NM)', factor: 1852 }
        }
      },
      area: {
        name: 'Area',
        base: 'm2',
        units: {
          mm2: { name: 'Square Millimeters (mm²)', factor: 1e-6 },
          cm2: { name: 'Square Centimeters (cm²)', factor: 1e-4 },
          m2: { name: 'Square Meters (m²)', factor: 1 },
          ha: { name: 'Hectares (ha)', factor: 10000 },
          km2: { name: 'Square Kilometers (km²)', factor: 1e6 },
          in2: { name: 'Square Inches (in²)', factor: 0.00064516 },
          ft2: { name: 'Square Feet (ft²)', factor: 0.09290304 },
          yd2: { name: 'Square Yards (yd²)', factor: 0.83612736 },
          ac: { name: 'Acres (ac)', factor: 4046.8564224 },
          mi2: { name: 'Square Miles (mi²)', factor: 2589988.110336 }
        }
      },
      volume: {
        name: 'Volume',
        base: 'l',
        units: {
          ml: { name: 'Milliliters (mL)', factor: 0.001 },
          cm3: { name: 'Cubic Centimeters (cm³)', factor: 0.001 },
          l: { name: 'Liters (L)', factor: 1 },
          m3: { name: 'Cubic Meters (m³)', factor: 1000 },
          tsp: { name: 'Teaspoons (US tsp)', factor: 0.00492892 },
          tbsp: { name: 'Tablespoons (US tbsp)', factor: 0.0147868 },
          floz: { name: 'Fluid Ounces (US fl oz)', factor: 0.0295735 },
          cup: { name: 'Cups (US cup)', factor: 0.236588 },
          pt: { name: 'Pints (US pt)', factor: 0.473176 },
          qt: { name: 'Quarts (US qt)', factor: 0.946353 },
          gal: { name: 'Gallons (US gal)', factor: 3.78541 },
          in3: { name: 'Cubic Inches (in³)', factor: 0.0163871 },
          ft3: { name: 'Cubic Feet (ft³)', factor: 28.3168 },
          yd3: { name: 'Cubic Yards (yd³)', factor: 764.555 }
        }
      },
      mass: {
        name: 'Mass & Weight',
        base: 'kg',
        units: {
          mg: { name: 'Milligrams (mg)', factor: 1e-6 },
          g: { name: 'Grams (g)', factor: 0.001 },
          kg: { name: 'Kilograms (kg)', factor: 1 },
          t: { name: 'Metric Tons (t)', factor: 1000 },
          oz: { name: 'Ounces (oz)', factor: 0.028349523125 },
          lb: { name: 'Pounds (lb)', factor: 0.45359237 },
          st: { name: 'Stones (st)', factor: 6.35029318 }
        }
      },
      temperature: {
        name: 'Temperature',
        base: 'c',
        units: {
          c: { name: 'Celsius (°C)' },
          f: { name: 'Fahrenheit (°F)' },
          k: { name: 'Kelvin (K)' }
        }
      },
      speed: {
        name: 'Speed',
        base: 'mps',
        units: {
          mps: { name: 'Meters / sec (m/s)', factor: 1 },
          kph: { name: 'Kilometers / hour (km/h)', factor: 0.2777777778 },
          mph: { name: 'Miles / hour (mph)', factor: 0.44704 },
          kn: { name: 'Knots (kn)', factor: 0.5144444444 },
          fps: { name: 'Feet / sec (ft/s)', factor: 0.3048 }
        }
      },
      time: {
        name: 'Time',
        base: 's',
        units: {
          ms: { name: 'Milliseconds (ms)', factor: 0.001 },
          s: { name: 'Seconds (s)', factor: 1 },
          min: { name: 'Minutes (min)', factor: 60 },
          hr: { name: 'Hours (hr)', factor: 3600 },
          d: { name: 'Days (d)', factor: 86400 },
          wk: { name: 'Weeks (wk)', factor: 604800 },
          mo: { name: 'Months (avg 30.44 d)', factor: 2629800 },
          yr: { name: 'Years (365.25 d)', factor: 31557600 }
        }
      },
      data: {
        name: 'Data Storage',
        base: 'B',
        units: {
          b: { name: 'Bits (b)', factor: 0.125 },
          B: { name: 'Bytes (B)', factor: 1 },
          KB: { name: 'Kilobytes (KB)', factor: 1024 },
          MB: { name: 'Megabytes (MB)', factor: 1048576 },
          GB: { name: 'Gigabytes (GB)', factor: 1073741824 },
          TB: { name: 'Terabytes (TB)', factor: 1099511627776 },
          PB: { name: 'Petabytes (PB)', factor: 1125899906842624 }
        }
      },
      pressure: {
        name: 'Pressure',
        base: 'Pa',
        units: {
          Pa: { name: 'Pascals (Pa)', factor: 1 },
          kPa: { name: 'Kilopascals (kPa)', factor: 1000 },
          bar: { name: 'Bar', factor: 100000 },
          psi: { name: 'Pounds / sq in (psi)', factor: 6894.757 },
          atm: { name: 'Standard Atmospheres (atm)', factor: 101325 },
          torr: { name: 'Torr (mmHg)', factor: 133.322 }
        }
      },
      energy: {
        name: 'Energy & Power',
        base: 'J',
        units: {
          J: { name: 'Joules (J)', factor: 1 },
          kJ: { name: 'Kilojoules (kJ)', factor: 1000 },
          cal: { name: 'Calories (cal)', factor: 4.184 },
          kcal: { name: 'Kilocalories (kcal)', factor: 4184 },
          Wh: { name: 'Watt-hours (Wh)', factor: 3600 },
          kWh: { name: 'Kilowatt-hours (kWh)', factor: 3600000 },
          btu: { name: 'BTU', factor: 1055.06 }
        }
      },
      angle: {
        name: 'Angle',
        base: 'deg',
        units: {
          deg: { name: 'Degrees (°)', factor: 1 },
          rad: { name: 'Radians (rad)', factor: 180 / Math.PI },
          grad: { name: 'Gradians (grad)', factor: 0.9 },
          arcmin: { name: 'Arcminutes (′)', factor: 1 / 60 },
          arcsec: { name: 'Arcseconds (″)', factor: 1 / 3600 }
        }
      }
    };
  }

  getCategories() {
    return Object.keys(this.definitions).map((key) => ({
      id: key,
      name: this.definitions[key].name
    }));
  }

  getUnits(categoryId) {
    const cat = this.definitions[categoryId];
    if (!cat) return [];
    return Object.keys(cat.units).map((key) => ({
      id: key,
      name: cat.units[key].name
    }));
  }

  convert(categoryId, fromUnit, toUnit, value) {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    if (fromUnit === toUnit) return num;

    const cat = this.definitions[categoryId];
    if (!cat) return num;

    // Special handling for Temperature (non-linear offsets)
    if (categoryId === 'temperature') {
      let celsius = num;
      if (fromUnit === 'f') celsius = ((num - 32) * 5) / 9;
      else if (fromUnit === 'k') celsius = num - 273.15;

      if (toUnit === 'c') return celsius;
      if (toUnit === 'f') return (celsius * 9) / 5 + 32;
      if (toUnit === 'k') return celsius + 273.15;
      return celsius;
    }

    const fromDef = cat.units[fromUnit];
    const toDef = cat.units[toUnit];
    if (!fromDef || !toDef) return num;

    // Convert from source to base, then base to target
    const inBase = num * fromDef.factor;
    const result = inBase / toDef.factor;
    return result;
  }

  formatResult(val) {
    if (val === 0) return '0';
    if (Math.abs(val) < 1e-6 || Math.abs(val) >= 1e12) {
      return val.toExponential(6);
    }
    // Clean precision
    return String(parseFloat(val.toPrecision(8)));
  }
}
