export class GeometryEngine {
  constructor() {
    this.shapes = {
      // 2D Shapes
      circle: {
        name: 'Circle',
        type: '2d',
        fields: [{ id: 'radius', label: 'Radius (r)', default: 5 }],
        calc: ({ radius }) => {
          const r = parseFloat(radius) || 0;
          const area = Math.PI * r * r;
          const perimeter = 2 * Math.PI * r;
          const diameter = 2 * r;
          return {
            'Area (A)': area,
            'Circumference (C)': perimeter,
            'Diameter (d)': diameter
          };
        }
      },
      rectangle: {
        name: 'Rectangle / Square',
        type: '2d',
        fields: [
          { id: 'length', label: 'Length (l)', default: 8 },
          { id: 'width', label: 'Width (w)', default: 4 }
        ],
        calc: ({ length, width }) => {
          const l = parseFloat(length) || 0;
          const w = parseFloat(width) || 0;
          const area = l * w;
          const perimeter = 2 * (l + w);
          const diagonal = Math.sqrt(l * l + w * w);
          return {
            'Area (A)': area,
            'Perimeter (P)': perimeter,
            'Diagonal (d)': diagonal
          };
        }
      },
      triangle: {
        name: 'Triangle',
        type: '2d',
        fields: [
          { id: 'base', label: 'Base (b)', default: 6 },
          { id: 'height', label: 'Height (h)', default: 4 },
          { id: 'sideA', label: 'Side a (optional)', default: 5 },
          { id: 'sideC', label: 'Side c (optional)', default: 5 }
        ],
        calc: ({ base, height, sideA, sideC }) => {
          const b = parseFloat(base) || 0;
          const h = parseFloat(height) || 0;
          const a = parseFloat(sideA) || b;
          const c = parseFloat(sideC) || b;
          const area = 0.5 * b * h;
          const perimeter = a + b + c;
          return {
            'Area (A)': area,
            'Perimeter (P)': perimeter
          };
        }
      },
      trapezoid: {
        name: 'Trapezoid',
        type: '2d',
        fields: [
          { id: 'baseA', label: 'Top Base (a)', default: 4 },
          { id: 'baseB', label: 'Bottom Base (b)', default: 8 },
          { id: 'height', label: 'Height (h)', default: 5 }
        ],
        calc: ({ baseA, baseB, height }) => {
          const a = parseFloat(baseA) || 0;
          const b = parseFloat(baseB) || 0;
          const h = parseFloat(height) || 0;
          const area = 0.5 * (a + b) * h;
          return {
            'Area (A)': area
          };
        }
      },
      ellipse: {
        name: 'Ellipse',
        type: '2d',
        fields: [
          { id: 'axisA', label: 'Semi-major axis (a)', default: 6 },
          { id: 'axisB', label: 'Semi-minor axis (b)', default: 4 }
        ],
        calc: ({ axisA, axisB }) => {
          const a = parseFloat(axisA) || 0;
          const b = parseFloat(axisB) || 0;
          const area = Math.PI * a * b;
          // Ramanujan's approximation for ellipse circumference
          const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
          const perimeter = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
          return {
            'Area (A)': area,
            'Approx. Perimeter (P)': perimeter
          };
        }
      },

      // 3D Shapes (Volume & Surface Area)
      box: {
        name: 'Box / Rectangular Prism',
        type: '3d',
        fields: [
          { id: 'length', label: 'Length (l)', default: 6 },
          { id: 'width', label: 'Width (w)', default: 4 },
          { id: 'height', label: 'Height (h)', default: 3 }
        ],
        calc: ({ length, width, height }) => {
          const l = parseFloat(length) || 0;
          const w = parseFloat(width) || 0;
          const h = parseFloat(height) || 0;
          const volume = l * w * h;
          const surfaceArea = 2 * (l * w + l * h + w * h);
          const diagonal = Math.sqrt(l * l + w * w + h * h);
          return {
            'Volume (V)': volume,
            'Total Surface Area': surfaceArea,
            'Space Diagonal': diagonal
          };
        }
      },
      cylinder: {
        name: 'Cylinder',
        type: '3d',
        fields: [
          { id: 'radius', label: 'Radius (r)', default: 3 },
          { id: 'height', label: 'Height (h)', default: 8 }
        ],
        calc: ({ radius, height }) => {
          const r = parseFloat(radius) || 0;
          const h = parseFloat(height) || 0;
          const volume = Math.PI * r * r * h;
          const lateralArea = 2 * Math.PI * r * h;
          const totalArea = 2 * Math.PI * r * (r + h);
          return {
            'Volume (V)': volume,
            'Total Surface Area': totalArea,
            'Lateral Surface Area': lateralArea
          };
        }
      },
      sphere: {
        name: 'Sphere (Ball)',
        type: '3d',
        fields: [{ id: 'radius', label: 'Radius (r)', default: 4 }],
        calc: ({ radius }) => {
          const r = parseFloat(radius) || 0;
          const volume = (4 / 3) * Math.PI * Math.pow(r, 3);
          const surfaceArea = 4 * Math.PI * r * r;
          return {
            'Volume (V)': volume,
            'Surface Area (A)': surfaceArea
          };
        }
      },
      cone: {
        name: 'Cone',
        type: '3d',
        fields: [
          { id: 'radius', label: 'Radius (r)', default: 3 },
          { id: 'height', label: 'Height (h)', default: 6 }
        ],
        calc: ({ radius, height }) => {
          const r = parseFloat(radius) || 0;
          const h = parseFloat(height) || 0;
          const volume = (1 / 3) * Math.PI * r * r * h;
          const slant = Math.sqrt(r * r + h * h);
          const surfaceArea = Math.PI * r * (r + slant);
          return {
            'Volume (V)': volume,
            'Total Surface Area': surfaceArea,
            'Slant Height (s)': slant
          };
        }
      },
      pyramid: {
        name: 'Square Pyramid',
        type: '3d',
        fields: [
          { id: 'baseSide', label: 'Base Side (a)', default: 4 },
          { id: 'height', label: 'Height (h)', default: 6 }
        ],
        calc: ({ baseSide, height }) => {
          const a = parseFloat(baseSide) || 0;
          const h = parseFloat(height) || 0;
          const volume = (1 / 3) * a * a * h;
          const slant = Math.sqrt(Math.pow(a / 2, 2) + h * h);
          const surfaceArea = a * a + 2 * a * slant;
          return {
            'Volume (V)': volume,
            'Total Surface Area': surfaceArea,
            'Slant Height (s)': slant
          };
        }
      }
    };
  }

  getShapeList() {
    return Object.keys(this.shapes).map((key) => ({
      id: key,
      name: this.shapes[key].name,
      type: this.shapes[key].type
    }));
  }

  getShape(id) {
    return this.shapes[id];
  }

  calculate(shapeId, inputValues) {
    const shape = this.shapes[shapeId];
    if (!shape) return {};
    return shape.calc(inputValues);
  }

  formatValue(val) {
    if (typeof val === 'number') {
      if (isNaN(val)) return 'Invalid';
      if (!isFinite(val)) return 'Infinity';
      return String(parseFloat(val.toFixed(5)));
    }
    return String(val);
  }
}
