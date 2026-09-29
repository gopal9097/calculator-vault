<p align="center">
  <img src="assets/logo.svg" alt="Calculator Vault Logo" width="128" height="128">
</p>

<h1 align="center">Calculator Vault</h1>

<p align="center">
  <strong>A zero-knowledge, client-side encrypted storage vault hidden inside a fully functional macOS-style calculator.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-Vanilla%20ES6-F7DF1E?logo=javascript&logoColor=black" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/Security-AES--256--GCM-007AFF" alt="AES-256-GCM">
  <img src="https://img.shields.io/badge/Derivation-PBKDF2%20600k-34C759" alt="PBKDF2">
  <img src="https://img.shields.io/badge/Storage-IndexedDB-FF9500" alt="IndexedDB">
  <img src="https://img.shields.io/badge/Dependencies-Zero-green" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="MIT License">
</p>

---

## Overview

Calculator Vault is a privacy-first web application designed as a dual-purpose tool:
1. **The Decoy**: A sleek, high-precision desktop calculator offering Basic, Scientific, Programmer, Unit Converter, and 2D/3D Geometry calculation suites with live calculation history.
2. **The Vault**: A zero-knowledge encrypted local repository. Entering your secret numeric passcode on the keypad and pressing `=` instantly transitions the interface into an encrypted file gallery capable of previewing images, videos, audio recordings, PDF documents, and plain text notes.

Everything executes entirely within your browser's local sandbox using the W3C Web Cryptography API. There are no remote backends, no tracking analytics, and no external dependencies. If network access is cut completely, the application continues to run offline without interruption.

---

## Key Features

### 1. Multi-Mode Calculator
- **Basic Mode**: Standard 4-function arithmetic (`+`, `−`, `×`, `÷`, `%`, `±`) with large, tactile buttons and fluid animations.
- **Scientific Mode**: Trigonometric functions (sin, cos, tan, sinh, cosh, tanh), natural logarithms (`ln`), common logarithms (`log10`), powers (`xʸ`, `x²`), roots (`√`, `∛`), factorials (`x!`), and constants ($\pi, e$). Supports instant switching between **Degrees** and **Radians**.
- **Programmer Mode**: Real-time simultaneous base conversion across **HEX**, **DEC**, **OCT**, and **BIN** representations. Includes bitwise operators (`AND`, `OR`, `XOR`, `NOT`, left shift `<<`, right shift `>>`) and selectable word lengths (8-bit, 16-bit, 32-bit, 64-bit).
- **Unit Converter**: Multi-category conversion tool spanning Length, Area, Volume, Mass, Speed, Temperature, and Digital Data, featuring two-way swap capability.
- **Geometry Suite**: Dedicated formulas and input fields for computing area, perimeter, surface area, and volume across 2D and 3D shapes (Circle, Triangle, Rectangle, Sphere, Cylinder, Cone, Cuboid).
- **History Tape**: Maintains a scrollable tape of past calculations with one-click result recall and a clear history control.
- **Synthesized Audio**: Realistic click feedback synthesized in real-time via the Web Audio API without downloading external audio files.

### 2. Stealth Vault & Security
- **Stealth Unlock**: Unlock the vault by typing your secret passcode on the calculator keypad and pressing the `=` key.
- **Emergency Quick Hide**: Press the `Esc` key or click **Quick Hide** to instantly snap back to the calculator display.
- **Automatic Session Termination**: Automatically locks the vault and purges the decryption key from memory whenever the browser tab loses focus (`visibilitychange`) or after a configurable inactivity timeout.
- **Encrypted Media Gallery**: Decrypts and renders images, videos, audio, and PDF documents directly in memory using secure Blob object URLs.
- **Drag-and-Drop Ingestion**: Drop files directly onto the vault surface for chunked client-side encryption and storage.
- **Encrypted Backup & Recovery**: Export your entire vault database as a single password-protected encrypted file for offline migration across devices.

---

## Cryptographic Architecture

Calculator Vault follows an envelope encryption architecture backed by the standard browser `window.crypto.subtle` API.

```
Passcode (6–12 digits) ──> [ PBKDF2 (SHA-256, 600,000 rounds, 16B Salt) ]
                                            │
                                            ▼
                              Key Encryption Key (KEK)
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
    [ Unwrap Master Key ]                                      [ Encrypt Master Key ]
               │                                                         │
               ▼                                                         ▼
       Master Key (AES-256)                                       Wrapped Header (h)
               │                                                    (Stored in DB)
               ├────────────────────────────┐
               ▼                            ▼
      [ Encrypt File Payload ]     [ Decrypt File Payload ]
      (AES-256-GCM + 12B IV)       (AES-256-GCM + 12B IV)
               │                            │
               ▼                            ▼
      Ciphertext + Auth Tag                Plaintext Buffer
      (Stored in Store 'f')                (Rendered in Memory)
```

1. **Key Derivation (PBKDF2)**:
   - When the user sets up their passcode, the application generates a cryptographically secure 16-byte random salt using `crypto.getRandomValues()`.
   - The passcode is derived using PBKDF2 with HMAC-SHA-256 over **600,000 iterations** (exceeding OWASP recommended standards for client-side hashing) to generate a 256-bit Key Encryption Key (KEK).
2. **Master Key Wrapping (Envelope Encryption)**:
   - A random 256-bit AES-GCM Master Key (MK) is generated to encrypt all user data.
   - The MK is encrypted (wrapped) with the KEK and stored in IndexedDB under store `h`.
   - This architecture allows changing the vault passcode in the future without needing to re-encrypt all stored files.
3. **Payload Encryption (AES-256-GCM)**:
   - Every file uploaded to the vault is encrypted using the Master Key in Galois/Counter Mode (AES-256-GCM).
   - Each item receives an independently generated, unique 12-byte Initialization Vector (IV).
   - AES-GCM provides both confidentiality and data authenticity; any tampering with ciphertext bytes causes decryption to immediately reject with an authentication error.
4. **Memory Sanitation**:
   - Master Key byte buffers are zeroed out (`.fill(0)`) immediately after importation into non-extractable WebCrypto handles.
   - When the vault is locked or idle, key instances are dropped and garbage collected.

---

## Storage Model

All persistent data is stored in the browser's native **IndexedDB** engine (`c` database):

| Object Store | Key | Value | Purpose |
| :--- | :--- | :--- | :--- |
| `h` (Header) | `'h'` | `{ salt, it, w }` | PBKDF2 salt, iteration count (600,000), and the KEK-wrapped Master Key payload. |
| `f` (Files) | UUID / Timestamp | `{ id, name, size, type, iv, ct, date }` | Encrypted file buffers, unique IVs, metadata, and creation timestamps. |
| `s` (Settings) | Key name | Stored settings object | User preferences: theme preference (auto/dark/light), auto-lock duration, and sound effects toggle. |

---

## Project Structure

```
├── index.html              # Application entrypoint & semantic view containers
├── server.py               # Local development server with MIME configuration
├── .gitignore              # Ignores OS artifacts (.DS_Store), cache, and logs
├── assets/
│   ├── logo.svg            # Custom vector mark (calculator + lock shackle)
│   └── favicon.svg         # High-contrast application favicon
├── css/
│   ├── theme.css           # Design tokens, color system, and dark/light mode rules
│   ├── main.css            # Base typography, grid helpers, and modal layouts
│   ├── calculator.css      # Calculator keypads, displays, and conversion panels
│   └── vault.css           # Vault gallery, dropzone, lightbox, and batch controls
└── js/
    ├── app.js              # Application lifecycle, routing, and idle timers
    ├── core/               # Pure calculation and security engines
    │   ├── crypto.js       # Web Crypto API wrapper (PBKDF2 + AES-GCM)
    │   ├── storage.js      # IndexedDB promise-based transactions
    │   ├── calc-engine.js  # Tokenizer and recursive descent expression evaluator
    │   ├── converter-engine.js # Unit conversions and category dictionaries
    │   └── geometry-engine.js  # 2D and 3D geometric math solvers
    └── ui/                 # DOM event handlers and view managers
        ├── calculator-ui.js# Keypad routing, display updates, and tape history
        ├── vault-ui.js     # File dropzone, gallery rendering, and preview modal
        ├── modal-manager.js# Settings modal, password change, and wipe dialogue
        ├── theme-manager.js# System theme synchronization & manual overrides
        └── sound-effects.js# Synthesized mechanical key click sound generator
```

---

## Calculation Engine (No `eval`)

Mathematical expressions are parsed using a custom **recursive descent parser** with standard operator precedence. The engine never invokes JavaScript's `eval()` or `Function()` constructor.

- **Grammar Hierarchy**:
  1. Parentheses `(...)` and constants (`pi`, `e`)
  2. Functions (`sin`, `cos`, `tan`, `sinh`, `cosh`, `tanh`, `ln`, `log10`, `sqrt`, `cbrt`)
  3. Postfix operators: Factorial (`!`) and Percent (`%`)
  4. Exponentiation (`^`, right-associative)
  5. Unary signs (`+`, `-`)
  6. Multiplication (`×`, `*`) and Division (`÷`, `/`)
  7. Addition (`+`) and Subtraction (`-`)
- **Safety**: Division by zero throws an explicit error rather than silently returning `Infinity`. Large floating point rounding errors are normalized using precision trimming.

---

## Keyboard Shortcuts

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `0` – `9` | Calculator | Enter digits |
| `+`, `-`, `*`, `/` | Calculator | Arithmetic operators |
| `Enter` or `=` | Calculator | Evaluate calculation (or unlock vault if PIN matches) |
| `Backspace` | Calculator | Delete last character |
| `Escape` | Calculator | Clear current entry (`AC`) |
| `Escape` | Vault | **Emergency Quick Hide** (instantly lock and show calculator) |
| `h` or `H` | Calculator | Open / close calculation history drawer |
| `.` | Calculator | Decimal separator |
| `(` and `)` | Scientific | Open / close nested parenthesis |

---

## Running Locally

Because the project is composed of standard ES modules (`<script type="module">`), browsers require it to be served over HTTP/HTTPS rather than via the `file://` protocol.

### Option 1: Python Built-in Server (Included)
Run the provided development server:
```bash
python3 server.py
```
Then open [http://localhost:8080](http://localhost:8080) in your web browser.

### Option 2: Node.js (npx)
```bash
npx serve .
```

### Option 3: VS Code Live Server
Right-click on `index.html` inside VS Code and choose **"Open with Live Server"**.

---

## Deploying to GitHub Pages

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Calculator Vault"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
   git push -u origin main
   ```
2. In your repository on GitHub, navigate to **Settings** $\rightarrow$ **Pages**.
3. Under **Branch**, select `main` and root directory `/ (root)`.
4. Click **Save**. Within 1–2 minutes, your private vault is live on your personal GitHub Pages URL with automatic HTTPS.

---

## Browser Support

Requires a modern browser with support for the W3C Web Cryptography API and ES Modules:
- **Chrome / Chromium**: Version 80 or higher
- **Apple Safari**: Version 14 or higher (iOS & macOS)
- **Mozilla Firefox**: Version 78 or higher
- **Microsoft Edge**: Version 80 or higher

---

## License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, study, and distribute this codebase for personal or commercial projects.
