import { ConverterEngine } from '../core/converter-engine.js';
import { GeometryEngine } from '../core/geometry-engine.js';

export class CalculatorUI {
  constructor(calcEngine, soundEffects, onUnlockAttempt) {
    this.engine = calcEngine;
    this.sound = soundEffects;
    this.onUnlockAttempt = onUnlockAttempt;

    this.converter = new ConverterEngine();
    this.geometry = new GeometryEngine();

    this.currentMode = 'basic'; // 'basic' | 'scientific' | 'programmer' | 'converter' | 'geometry'
    this.expression = '';
    this.activeOperator = null;
    this.history = [];
    this.showHistory = false;
    this.is2nd = false;
    this.bitSize = 32;

    // DOM Elements
    this.appRoot = document.getElementById('app-root');
    this.calcContainer = document.getElementById('calc-view');
    this.modeBar = document.getElementById('calc-mode-bar');
    this.exprEl = document.getElementById('calc-expr');
    this.resultEl = document.getElementById('calc-res');
    this.degBtn = document.getElementById('calc-deg-btn');
    this.memBadge = document.getElementById('calc-mem-badge');
    this.historyBtn = document.getElementById('calc-history-btn');
    this.historyDrawer = document.getElementById('calc-history-drawer');
    this.historyList = document.getElementById('calc-history-list');

    // Panes & Wings
    this.leftWing = document.getElementById('calc-left-wing');
    this.sciGrid = document.getElementById('calc-sci-grid');
    this.convertPanel = document.getElementById('calc-convert-panel');
    this.geomPanel = document.getElementById('calc-geom-panel');
    this.progPanel = document.getElementById('calc-prog-panel');
    this.progBoard = document.getElementById('calc-prog-board');
    this.progKeys = document.getElementById('calc-prog-keys');

    // Converter Elements
    this.convertCategory = document.getElementById('convert-category');
    this.convertFromVal = document.getElementById('convert-from-val');
    this.convertFromUnit = document.getElementById('convert-from-unit');
    this.convertToVal = document.getElementById('convert-to-val');
    this.convertToUnit = document.getElementById('convert-to-unit');
    this.convertSwapBtn = document.getElementById('convert-swap-btn');
    this.convertToCalcBtn = document.getElementById('convert-to-calc-btn');

    // Geometry Elements
    this.geomShapeSelect = document.getElementById('geom-shape-select');
    this.geomInputsContainer = document.getElementById('geom-inputs-container');
    this.geomResultsCard = document.getElementById('geom-results-card');
    this.geomToCalcBtn = document.getElementById('geom-to-calc-btn');
    this.latestGeomResultVal = 0;

    // Programmer Elements
    this.progValHex = document.getElementById('prog-val-hex');
    this.progValDec = document.getElementById('prog-val-dec');
    this.progValOct = document.getElementById('prog-val-oct');
    this.progValBin = document.getElementById('prog-val-bin');

    this.initModeSwitcher();
    this.initKeypad();
    this.initConverterUI();
    this.initGeometryUI();
    this.initProgrammerUI();
    this.initKeyboardListener();

    this.setMode('basic');
    this.updateDisplay('0');
  }

  // Mode switching
  initModeSwitcher() {
    if (!this.modeBar) return;
    const modeBtns = this.modeBar.querySelectorAll('.calc-mode-btn');

    modeBtns.forEach((btn) => {
      btn.onclick = () => {
        const mode = btn.getAttribute('data-mode');
        this.setMode(mode);
        this.sound.playKeyClick(false);
      };
    });
  }

  setMode(mode) {
    this.currentMode = mode;

    // Update active tab button
    if (this.modeBar) {
      this.modeBar.querySelectorAll('.calc-mode-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
      });
    }

    const isBasic = mode === 'basic';
    const isSci = mode === 'scientific';
    const isProg = mode === 'programmer';
    const isConv = mode === 'converter';
    const isGeom = mode === 'geometry';

    // Toggle split mode on calculator container & app root
    if (this.calcContainer) {
      this.calcContainer.classList.toggle('is-split', !isBasic);
    }
    if (this.appRoot) {
      this.appRoot.classList.toggle('expanded-calc', !isBasic);
    }

    // Toggle left wing
    if (this.leftWing) {
      this.leftWing.classList.toggle('hidden', isBasic);
    }

    // Toggle specific tool panels inside the left wing
    if (this.sciGrid) this.sciGrid.classList.toggle('hidden', !isSci);
    if (this.convertPanel) this.convertPanel.classList.toggle('hidden', !isConv);
    if (this.geomPanel) this.geomPanel.classList.toggle('hidden', !isGeom);
    if (this.progPanel) this.progPanel.classList.toggle('hidden', !isProg);

    // DEG/RAD button only relevant in scientific
    if (this.degBtn) this.degBtn.style.visibility = isSci ? 'visible' : 'hidden';

    // Trigger sync updates
    if (isConv) this.syncConverterFromCalc();
    if (isProg) this.updateProgrammerBoard();
    if (isGeom) this.updateGeometryCalculations();
  }

  // Keypad controls
  initKeypad() {
    // Degree / Radian toggle
    if (this.degBtn) {
      this.degBtn.onclick = () => {
        const nextDeg = !this.engine.isDegMode();
        this.engine.setDegMode(nextDeg);
        this.degBtn.textContent = nextDeg ? 'DEG' : 'RAD';
        this.sound.playKeyClick(false);
      };
    }

    // History drawer toggle
    if (this.historyBtn && this.historyDrawer) {
      this.historyBtn.onclick = () => {
        this.showHistory = !this.showHistory;
        this.historyDrawer.classList.toggle('hidden', !this.showHistory);
        this.renderHistory();
        this.sound.playKeyClick(false);
      };

      const closeHist = document.getElementById('calc-history-close');
      if (closeHist) {
        closeHist.onclick = () => {
          this.showHistory = false;
          this.historyDrawer.classList.add('hidden');
        };
      }

      const clearHist = document.getElementById('calc-history-clear');
      if (clearHist) {
        clearHist.onclick = () => {
          this.history = [];
          this.renderHistory();
          this.sound.playKeyClick(false);
        };
      }
    }

    // Secondary (2nd) function toggle
    const btn2nd = document.getElementById('calc-2nd-btn');
    if (btn2nd) {
      btn2nd.onclick = () => {
        this.is2nd = !this.is2nd;
        btn2nd.classList.toggle('active-2nd', this.is2nd);
        this.updateSecondaryKeys();
        this.sound.playKeyClick(false);
      };
    }

    // Memory operations
    document.querySelectorAll('[data-mem]').forEach((btn) => {
      btn.onclick = () => {
        const op = btn.getAttribute('data-mem');
        const currentVal = parseFloat(this.getCurrentDisplayNumber()) || 0;

        if (op === 'mc') this.engine.memoryClear();
        else if (op === 'm+') this.engine.memoryAdd(currentVal);
        else if (op === 'm-') this.engine.memorySubtract(currentVal);
        else if (op === 'mr') {
          const rec = this.engine.memoryRecall();
          this.expression = String(rec);
          this.updateDisplay(this.expression);
        }

        if (this.memBadge) {
          this.memBadge.classList.toggle('hidden', !this.engine.hasMemory());
        }
        this.sound.playKeyClick(false);
      };
    });

    // Keypad button listeners
    const buttons = document.querySelectorAll('[data-key]');
    buttons.forEach((btn) => {
      btn.onclick = () => {
        const key = btn.getAttribute('data-key');
        this.handleInput(key, btn);
      };
    });
  }

  updateSecondaryKeys() {
    const sSin = document.getElementById('sci-btn-sin');
    const sCos = document.getElementById('sci-btn-cos');
    const sTan = document.getElementById('sci-btn-tan');
    const sLn = document.getElementById('sci-btn-ln');
    const sLog = document.getElementById('sci-btn-log');
    const sSqrt = document.getElementById('sci-btn-sqrt');

    if (this.is2nd) {
      if (sSin) { sSin.textContent = 'sin⁻¹'; sSin.setAttribute('data-key', 'asin'); }
      if (sCos) { sCos.textContent = 'cos⁻¹'; sCos.setAttribute('data-key', 'acos'); }
      if (sTan) { sTan.textContent = 'tan⁻¹'; sTan.setAttribute('data-key', 'atan'); }
      if (sLn) { sLn.textContent = 'eˣ'; sLn.setAttribute('data-key', 'e^'); }
      if (sLog) { sLog.textContent = '10ˣ'; sLog.setAttribute('data-key', '10^'); }
      if (sSqrt) { sSqrt.textContent = 'x²'; sSqrt.setAttribute('data-key', '^2'); }
    } else {
      if (sSin) { sSin.textContent = 'sin'; sSin.setAttribute('data-key', 'sin'); }
      if (sCos) { sCos.textContent = 'cos'; sCos.setAttribute('data-key', 'cos'); }
      if (sTan) { sTan.textContent = 'tan'; sTan.setAttribute('data-key', 'tan'); }
      if (sLn) { sLn.textContent = 'ln'; sLn.setAttribute('data-key', 'ln'); }
      if (sLog) { sLog.textContent = 'log₁₀'; sLog.setAttribute('data-key', 'log'); }
      if (sSqrt) { sSqrt.textContent = '√x'; sSqrt.setAttribute('data-key', '√'); }
    }
  }

  // Unit converter
  initConverterUI() {
    if (!this.convertCategory) return;

    // Populate categories (Length, Area, Volume, etc.)
    const cats = this.converter.getCategories();
    this.convertCategory.innerHTML = '';
    cats.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      this.convertCategory.appendChild(opt);
    });

    const updateUnits = () => {
      const catId = this.convertCategory.value;
      const units = this.converter.getUnits(catId);

      this.convertFromUnit.innerHTML = '';
      this.convertToUnit.innerHTML = '';

      units.forEach((u, idx) => {
        const opt1 = document.createElement('option');
        opt1.value = u.id;
        opt1.textContent = u.name;
        this.convertFromUnit.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = u.id;
        opt2.textContent = u.name;
        this.convertToUnit.appendChild(opt2);
      });

      // Default selection (first and second or sensible pair)
      if (units.length > 1) {
        this.convertToUnit.selectedIndex = 1;
      }
      this.performConversion(true);
    };

    this.convertCategory.onchange = updateUnits;
    updateUnits();

    // From Value Input
    this.convertFromVal.oninput = () => this.performConversion(true);
    this.convertFromUnit.onchange = () => this.performConversion(true);
    this.convertToUnit.onchange = () => this.performConversion(true);

    // Swap button
    if (this.convertSwapBtn) {
      this.convertSwapBtn.onclick = () => {
        const tempUnit = this.convertFromUnit.value;
        this.convertFromUnit.value = this.convertToUnit.value;
        this.convertToUnit.value = tempUnit;
        this.performConversion(true);
        this.sound.playKeyClick(false);
      };
    }

    // Insert to Calc button
    if (this.convertToCalcBtn) {
      this.convertToCalcBtn.onclick = () => {
        const resVal = this.convertToVal.value;
        if (resVal !== '') {
          this.expression = resVal;
          this.updateDisplay(resVal);
          this.sound.playKeyClick(false);
        }
      };
    }
  }

  performConversion(fromLeft = true) {
    if (!this.convertCategory) return;
    const cat = this.convertCategory.value;
    const fromU = this.convertFromUnit.value;
    const toU = this.convertToUnit.value;

    if (fromLeft) {
      const val = parseFloat(this.convertFromVal.value) || 0;
      const converted = this.converter.convert(cat, fromU, toU, val);
      this.convertToVal.value = this.converter.formatResult(converted);
    } else {
      const val = parseFloat(this.convertToVal.value) || 0;
      const converted = this.converter.convert(cat, toU, fromU, val);
      this.convertFromVal.value = this.converter.formatResult(converted);
    }
  }

  syncConverterFromCalc() {
    if (this.convertFromVal) {
      const currentNumber = parseFloat(this.getCurrentDisplayNumber()) || 0;
      this.convertFromVal.value = currentNumber;
      this.performConversion(true);
    }
  }

  // Geometry tools
  initGeometryUI() {
    if (!this.geomShapeSelect) return;

    // Populate shapes
    const shapes = this.geometry.getShapeList();
    this.geomShapeSelect.innerHTML = '';

    const group2D = document.createElement('optgroup');
    group2D.label = '2D Shapes (Area & Perimeter)';
    const group3D = document.createElement('optgroup');
    group3D.label = '3D Shapes (Volume & Surface Area)';

    shapes.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      if (s.type === '2d') group2D.appendChild(opt);
      else group3D.appendChild(opt);
    });

    this.geomShapeSelect.appendChild(group2D);
    this.geomShapeSelect.appendChild(group3D);

    const onShapeChange = () => {
      const shapeId = this.geomShapeSelect.value;
      const shape = this.geometry.getShape(shapeId);
      if (!shape) return;

      this.geomInputsContainer.innerHTML = '';
      shape.fields.forEach((f) => {
        const wrap = document.createElement('div');
        wrap.className = 'geom-field-wrap';
        wrap.innerHTML = `
          <label for="geom-${f.id}">${f.label}</label>
          <input type="number" id="geom-${f.id}" value="${f.default}" step="any">
        `;
        const inp = wrap.querySelector('input');
        inp.oninput = () => this.updateGeometryCalculations();
        this.geomInputsContainer.appendChild(wrap);
      });

      this.updateGeometryCalculations();
    };

    this.geomShapeSelect.onchange = onShapeChange;
    onShapeChange();

    if (this.geomToCalcBtn) {
      this.geomToCalcBtn.onclick = () => {
        if (this.latestGeomResultVal !== undefined) {
          const str = String(this.latestGeomResultVal);
          this.expression = str;
          this.updateDisplay(str);
          this.sound.playKeyClick(false);
        }
      };
    }
  }

  updateGeometryCalculations() {
    if (!this.geomShapeSelect || !this.geomResultsCard) return;
    const shapeId = this.geomShapeSelect.value;
    const shape = this.geometry.getShape(shapeId);
    if (!shape) return;

    const values = {};
    shape.fields.forEach((f) => {
      const inp = document.getElementById(`geom-${f.id}`);
      values[f.id] = inp ? parseFloat(inp.value) || 0 : f.default;
    });

    const results = this.geometry.calculate(shapeId, values);
    this.geomResultsCard.innerHTML = '';

    const keys = Object.keys(results);
    if (keys.length > 0) {
      // Pick first result (e.g. Area or Volume) as primary to copy to calculator
      this.latestGeomResultVal = this.geometry.formatValue(results[keys[0]]);
    }

    keys.forEach((key) => {
      const row = document.createElement('div');
      row.className = 'geom-res-row';
      row.innerHTML = `
        <span class="geom-res-label">${key}:</span>
        <span class="geom-res-val">${this.geometry.formatValue(results[key])}</span>
      `;
      this.geomResultsCard.appendChild(row);
    });
  }

  // Programmer mode
  initProgrammerUI() {
    // Word size toggles (8, 16, 32, 64)
    document.querySelectorAll('.calc-bit-toggle').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('.calc-bit-toggle').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.bitSize = parseInt(btn.getAttribute('data-bits'), 10) || 32;
        this.updateProgrammerBoard();
        this.sound.playKeyClick(false);
      };
    });

    // Bitwise operators
    document.querySelectorAll('[data-prog-op]').forEach((btn) => {
      btn.onclick = () => {
        const op = btn.getAttribute('data-prog-op');
        this.handleBitwiseOp(op);
      };
    });
  }

  handleBitwiseOp(op) {
    const curVal = parseFloat(this.getCurrentDisplayNumber()) || 0;
    this.sound.playKeyClick(true);

    if (op === 'NOT') {
      const res = this.engine.bitwiseOp('NOT', curVal, 0, this.bitSize);
      this.expression = String(res);
      this.updateDisplay(this.expression);
      return;
    }

    // Two-operand bitwise operation (e.g. 5 AND 3)
    this.expression += ` ${op} `;
    this.updateDisplay();
  }

  updateProgrammerBoard() {
    if (!this.progValHex) return;
    const curVal = parseFloat(this.getCurrentDisplayNumber()) || 0;
    const bases = this.engine.toProgrammerBases(curVal, this.bitSize);

    this.progValHex.textContent = bases.hex;
    this.progValDec.textContent = bases.dec;
    this.progValOct.textContent = bases.oct;
    this.progValBin.textContent = bases.bin;
  }

  getCurrentDisplayNumber() {
    const raw = this.resultEl ? this.resultEl.textContent.replace(/,/g, '') : '0';
    const num = parseFloat(raw);
    return isNaN(num) ? '0' : String(num);
  }

  // Keyboard shortcuts
  initKeyboardListener() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      const calcContainer = document.getElementById('calc-view');
      if (!calcContainer || calcContainer.classList.contains('hidden')) return;

      const keyMap = {
        '*': '×',
        '/': '÷',
        '-': '−',
        '+': '+',
        'Enter': '=',
        '=': '=',
        'Backspace': '⌫',
        'Escape': 'AC',
        '%': '%',
        '^': '^',
        '!': '!',
        '(': '(',
        ')': ')'
      };

      const mappedKey = keyMap[e.key] || (/^[0-9a-fA-F.]$/.test(e.key) ? e.key.toUpperCase() : null);
      if (mappedKey) {
        e.preventDefault();
        const btn = document.querySelector(`[data-key="${mappedKey}"]`);
        this.handleInput(mappedKey, btn);
      }
    });
  }

  // Input handling & evaluation
  handleInput(key, btnElement) {
    const isOp = '+−×÷'.includes(key);
    this.sound.playKeyClick(isOp || key === '=');

    if (!isOp) {
      this.clearActiveOperator();
    }

    if (key === 'AC') {
      this.expression = '';
      this.updateDisplay('0');
      return;
    }

    if (key === '⌫') {
      this.expression = this.expression.slice(0, -1);
      this.updateDisplay(this.expression || '0');
      return;
    }

    if (key === '±') {
      if (this.expression.startsWith('-')) {
        this.expression = this.expression.slice(1);
      } else {
        this.expression = '-' + this.expression;
      }
      this.updateDisplay(this.expression || '0');
      return;
    }

    if (isOp) {
      this.setActiveOperator(btnElement);
      if (/[+−×÷]$/.test(this.expression)) {
        this.expression = this.expression.slice(0, -1) + key;
      } else {
        this.expression += key;
      }
      this.updateDisplay();
      return;
    }

    if (key === '=') {
      this.evaluateExpression();
      return;
    }

    // Function inputs
    if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'ln', 'log', 'log2', '√', '∛'].includes(key)) {
      this.expression += key === '√' ? '√(' : key === '∛' ? '∛(' : `${key}(`;
      this.updateDisplay();
      return;
    }

    // Powers and special constants
    if (key === 'e^') {
      this.expression += 'exp(';
      this.updateDisplay();
      return;
    }
    if (key === '10^') {
      this.expression += '10^';
      this.updateDisplay();
      return;
    }
    if (key === '2^') {
      this.expression += '2^';
      this.updateDisplay();
      return;
    }
    if (key === '^2') {
      this.expression += '^2';
      this.updateDisplay();
      return;
    }
    if (key === '^3') {
      this.expression += '^3';
      this.updateDisplay();
      return;
    }
    if (key === 'Rand') {
      const r = parseFloat(Math.random().toFixed(4));
      this.expression += String(r);
      this.updateDisplay();
      return;
    }

    // Reset if display was showing error
    if (this.resultEl.textContent === 'Error' || this.resultEl.textContent === 'Infinity') {
      this.expression = '';
    }

    this.expression += key;
    this.updateDisplay();
  }

  async evaluateExpression() {
    const raw = this.expression.trim();
    if (!raw) return;

    // Check stealth vault unlock condition (numeric passcode 6-12 digits without operators)
    const isPotentialPasscode = /^\d{6,12}$/.test(raw);

    if (isPotentialPasscode && this.onUnlockAttempt) {
      const unlocked = await this.onUnlockAttempt(raw);
      if (unlocked) {
        this.expression = '';
        this.updateDisplay('0');
        return;
      }
    }

    // Check if bitwise expression in programmer mode (e.g. "12 AND 5")
    const progMatch = raw.match(/^(\d+)\s+(AND|OR|XOR|LSH|RSH|MOD)\s+(\d+)$/);
    if (progMatch) {
      const a = parseInt(progMatch[1], 10);
      const op = progMatch[2];
      const b = parseInt(progMatch[3], 10);
      const res = this.engine.bitwiseOp(op, a, b, this.bitSize);
      const strRes = String(res);

      this.history.unshift({ expr: raw, res: strRes });
      if (this.history.length > 20) this.history.pop();

      this.expression = strRes;
      this.updateDisplay(strRes);
      return;
    }

    // Standard Math Evaluation
    try {
      const result = this.engine.evaluate(raw);
      const formatted = this.engine.formatResult(result);

      this.history.unshift({ expr: raw, res: formatted });
      if (this.history.length > 20) this.history.pop();

      this.expression = formatted;
      this.updateDisplay(formatted);
    } catch {
      this.resultEl.textContent = 'Error';
    }
  }

  updateDisplay(overrideResult) {
    if (this.exprEl) {
      this.exprEl.textContent = this.expression;
    }

    let dispText = overrideResult !== undefined ? overrideResult : (this.expression || '0');
    dispText = this.engine.groupDigits(dispText);

    if (this.resultEl) {
      this.resultEl.textContent = dispText;

      const len = dispText.length;
      if (len > 14) this.resultEl.style.fontSize = '24px';
      else if (len > 10) this.resultEl.style.fontSize = '32px';
      else if (len > 7) this.resultEl.style.fontSize = '42px';
      else this.resultEl.style.fontSize = '52px';
    }

    // Sync other tool panels with active number
    if (this.currentMode === 'converter') {
      this.syncConverterFromCalc();
    }
    if (this.currentMode === 'programmer') {
      this.updateProgrammerBoard();
    }
  }

  setActiveOperator(btn) {
    this.clearActiveOperator();
    if (btn) {
      btn.classList.add('is-active-op');
      this.activeOperator = btn;
    }
  }

  clearActiveOperator() {
    if (this.activeOperator) {
      this.activeOperator.classList.remove('is-active-op');
      this.activeOperator = null;
    }
  }

  renderHistory() {
    if (!this.historyList) return;
    this.historyList.innerHTML = '';

    const clearBtn = document.getElementById('calc-history-clear');
    if (clearBtn) {
      clearBtn.style.display = this.history.length === 0 ? 'none' : 'inline-flex';
    }

    if (this.history.length === 0) {
      this.historyList.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-tertiary);font-size:13px;">No calculation history yet</div>';
      return;
    }

    this.history.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'calc-history-item';
      row.innerHTML = `
        <div class="calc-history-expr">${item.expr} =</div>
        <div class="calc-history-res">${item.res}</div>
      `;
      row.onclick = () => {
        this.expression = item.res;
        this.updateDisplay(item.res);
        this.historyDrawer.classList.add('hidden');
        this.showHistory = false;
      };
      this.historyList.appendChild(row);
    });
  }

  reset() {
    this.expression = '';
    this.clearActiveOperator();
    this.updateDisplay('0');
  }
}
