export class CalcEngine {
  constructor() {
    this.degMode = true;
    this.memory = 0;
  }

  setDegMode(isDeg) {
    this.degMode = Boolean(isDeg);
  }

  isDegMode() {
    return this.degMode;
  }

  // Memory Functions
  memoryClear() {
    this.memory = 0;
  }

  memoryAdd(val) {
    const num = parseFloat(val) || 0;
    this.memory += num;
  }

  memorySubtract(val) {
    const num = parseFloat(val) || 0;
    this.memory -= num;
  }

  memoryRecall() {
    return this.memory;
  }

  hasMemory() {
    return this.memory !== 0;
  }

  evaluate(rawExpr) {
    if (!rawExpr || typeof rawExpr !== 'string') {
      throw new Error('Invalid expression');
    }

    // Normalize characters
    let s = rawExpr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, 'pi')
      .replace(/√/g, 'sqrt')
      .replace(/∛/g, 'cbrt')
      .replace(/φ/g, 'phi');

    // Tokenize
    const tokens = s.match(/\d*\.?\d+|[a-z]+[0-9]*|[-+*/^()%!]/g) || [];
    if (tokens.join('') !== s.replace(/\s/g, '')) {
      throw new Error('Syntax error in expression');
    }

    let idx = 0;
    const peek = () => tokens[idx];
    const next = () => tokens[idx++];

    const toRad = (x) => (this.degMode ? (x * Math.PI) / 180 : x);
    const toDeg = (x) => (this.degMode ? (x * 180) / Math.PI : x);

    // Exact trigonometric fixes for common degree angles (e.g. sin(180)=0, cos(90)=0)
    const safeSin = (x) => {
      if (this.degMode) {
        const norm = ((x % 360) + 360) % 360;
        if (norm === 0 || norm === 180) return 0;
        if (norm === 90) return 1;
        if (norm === 270) return -1;
      }
      return Math.sin(toRad(x));
    };

    const safeCos = (x) => {
      if (this.degMode) {
        const norm = ((x % 360) + 360) % 360;
        if (norm === 90 || norm === 270) return 0;
        if (norm === 0) return 1;
        if (norm === 180) return -1;
      }
      return Math.cos(toRad(x));
    };

    const safeTan = (x) => {
      if (this.degMode) {
        const norm = ((x % 180) + 180) % 180;
        if (norm === 90) throw new Error('Undefined (tan 90°)');
        if (norm === 0) return 0;
      }
      return Math.tan(toRad(x));
    };

    const funcs = {
      sin: safeSin,
      cos: safeCos,
      tan: safeTan,
      asin: (x) => {
        if (x < -1 || x > 1) throw new Error('Domain error (asin)');
        return toDeg(Math.asin(x));
      },
      acos: (x) => {
        if (x < -1 || x > 1) throw new Error('Domain error (acos)');
        return toDeg(Math.acos(x));
      },
      atan: (x) => toDeg(Math.atan(x)),
      sinh: Math.sinh,
      cosh: Math.cosh,
      tanh: Math.tanh,
      asinh: Math.asinh,
      acosh: (x) => {
        if (x < 1) throw new Error('Domain error (acosh < 1)');
        return Math.acosh(x);
      },
      atanh: (x) => {
        if (x <= -1 || x >= 1) throw new Error('Domain error (|atanh| >= 1)');
        return Math.atanh(x);
      },
      ln: (x) => {
        if (x <= 0) throw new Error('Domain error (ln <= 0)');
        return Math.log(x);
      },
      log: (x) => {
        if (x <= 0) throw new Error('Domain error (log <= 0)');
        return Math.log10(x);
      },
      log2: (x) => {
        if (x <= 0) throw new Error('Domain error (log2 <= 0)');
        return Math.log2(x);
      },
      sqrt: (x) => {
        if (x < 0) throw new Error('Domain error (sqrt < 0)');
        return Math.sqrt(x);
      },
      cbrt: Math.cbrt,
      exp: Math.exp,
      abs: Math.abs,
      round: Math.round,
      floor: Math.floor,
      ceil: Math.ceil
    };

    const fact = (n) => {
      if (n < 0 || n > 170 || n % 1 !== 0) {
        throw new Error('Factorial out of range');
      }
      let r = 1;
      for (let k = 2; k <= n; k++) r *= k;
      return r;
    };

    // Recursive descent grammar:
    // expr   := term (('+' | '-') term)*
    // term   := unary (('*' | '/') unary)*
    // unary  := '-' unary | power
    // power  := postfix ('^' unary)?
    // postfix:= primary ('!' | '%')*
    // primary:= '(' expr ')' | number | constant | func '(' expr ')'

    function parseExpr() {
      let val = parseTerm();
      while (peek() === '+' || peek() === '-') {
        const op = next();
        const right = parseTerm();
        val = op === '+' ? val + right : val - right;
      }
      return val;
    }

    function parseTerm() {
      let val = parseUnary();
      while (peek() === '*' || peek() === '/') {
        const op = next();
        const right = parseUnary();
        if (op === '/' && right === 0) {
          throw new Error('Division by zero');
        }
        val = op === '*' ? val * right : val / right;
      }
      return val;
    }

    function parseUnary() {
      if (peek() === '-') {
        next();
        return -parseUnary();
      }
      if (peek() === '+') {
        next();
        return parseUnary();
      }
      return parsePower();
    }

    function parsePower() {
      let val = parsePostfix();
      if (peek() === '^') {
        next();
        val = Math.pow(val, parseUnary());
      }
      return val;
    }

    function parsePostfix() {
      let val = parsePrimary();
      while (peek() === '!' || peek() === '%') {
        const op = next();
        val = op === '!' ? fact(val) : val / 100;
      }
      return val;
    }

    function parsePrimary() {
      const token = next();
      if (token === undefined) {
        throw new Error('Unexpected end of expression');
      }
      if (token === '(') {
        const val = parseExpr();
        if (peek() === ')') {
          next();
        }
        return val;
      }
      if (token === 'pi') return Math.PI;
      if (token === 'e') return Math.E;
      if (token === 'phi') return 1.618033988749895; // Golden Ratio
      if (token === 'rand') return Math.random();

      if (funcs[token]) {
        return funcs[token](parsePrimary());
      }
      const num = parseFloat(token);
      if (isNaN(num)) {
        throw new Error(`Invalid token: ${token}`);
      }
      return num;
    }

    const result = parseExpr();
    if (idx < tokens.length || !isFinite(result)) {
      throw new Error('Calculation error');
    }
    return result;
  }

  // Programmer Mode conversions & bitwise
  toProgrammerBases(val, bitSize = 32) {
    let n = Math.trunc(parseFloat(val) || 0);

    // Apply bitmask for bit size (8, 16, 32, 64)
    let mask;
    if (bitSize === 8) mask = 0xFFn;
    else if (bitSize === 16) mask = 0xFFFFn;
    else if (bitSize === 64) mask = 0xFFFFFFFFFFFFFFFFn;
    else mask = 0xFFFFFFFFn;

    const bigN = BigInt.asIntN(bitSize, BigInt(n));
    const unsignedBig = BigInt.asUintN(bitSize, bigN);

    const hex = unsignedBig.toString(16).toUpperCase();
    const dec = bigN.toString(10);
    const oct = unsignedBig.toString(8);
    const binRaw = unsignedBig.toString(2).padStart(bitSize, '0');
    // Group binary by 4
    const binGrouped = binRaw.replace(/(\d{4})(?=\d)/g, '$1 ');

    return {
      hex: `0x${hex}`,
      dec,
      oct: `0o${oct}`,
      bin: binGrouped,
      rawHex: hex,
      rawBin: binRaw
    };
  }

  bitwiseOp(op, a, b, bitSize = 32) {
    const bigA = BigInt.asIntN(bitSize, BigInt(Math.trunc(a || 0)));
    const bigB = BigInt.asIntN(bitSize, BigInt(Math.trunc(b || 0)));

    let res;
    switch (op) {
      case 'AND': res = bigA & bigB; break;
      case 'OR': res = bigA | bigB; break;
      case 'XOR': res = bigA ^ bigB; break;
      case 'NOT': res = ~bigA; break;
      case 'LSH': res = bigA << BigInt(Math.min(Number(bigB), 64)); break;
      case 'RSH': res = bigA >> BigInt(Math.min(Number(bigB), 64)); break;
      case 'MOD': res = bigB === 0n ? 0n : bigA % bigB; break;
      default: res = bigA;
    }
    return Number(BigInt.asIntN(bitSize, res));
  }

  formatResult(val) {
    if (typeof val === 'number') {
      if (isNaN(val)) return 'Error';
      if (!isFinite(val)) return val > 0 ? 'Infinity' : '-Infinity';
      const rounded = parseFloat(val.toPrecision(12));
      return String(rounded);
    }
    return String(val);
  }

  groupDigits(str) {
    if (!str) return '0';
    if (/^-?\d+(\.\d*)?$/.test(str)) {
      return str.replace(/^(-?\d+)/, (m) =>
        m.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      );
    }
    return str;
  }
}
