# A5 Paper Estimate Print & Local Encrypted Database System

A secure, standalone web application built with **HTML, CSS, JavaScript, and PHP** for calculating door and WPC frame estimates, managing local encrypted JSON databases, and generating standard **A5 paper printouts** with the top header title **"ESTIMATE"**.

---

## Key Features

### 1. Local Encrypted Database (Hidden Storage)
- **AES-256-CBC with HMAC-SHA256 authenticated encryption** via PHP OpenSSL.
- All estimates and configurations are stored in the hidden `.data/` directory (`.data/estimates.enc.json` and `.data/config.enc.json`).
- Directory is protected with `.htaccess` and `index.html` to prevent any direct web browsing.
- Files remain **encrypted at rest** and are decrypted **only in memory** when authenticated with the user's PIN.

### 2. PIN Protection & 3-Attempts Lockout Security
- The web app is gated by a security PIN (4 to 8 digits).
- Includes an on-screen numeric keypad, eye toggle, and attempt limit indicator.
- **Security Rule**: If an incorrect PIN is entered **3 consecutive times**:
  1. The PIN entry is **locked**.
  2. The system prompts for the **Master Decryption Key**.
  3. Only upon verifying the valid Decryption Key can the user reset the PIN and regain access.

### 3. Dynamic Formulas & Calculation Engine
- **Doors Calculation**:
  $$\text{SQFT} = \frac{\text{Height (inches)} \times \text{Width (inches)} \times \text{Quantity}}{144}$$
  $$\text{Door Amount} = \text{SQFT} \times \text{Rate (₹/sqft)}$$
- **WPC Frames Calculation**:
  - Supports standard sections (`3x2`, `4x2`, `4x2.5`, `5x2.5`, Custom).
  - Formula: $\text{RFT} = \text{Length (feet)} \times \text{Quantity (nos)}$.
  - Example: $7\text{ ft} \times 14\text{ nos} = 98\text{ RFT}$; $3\text{ ft} \times 7\text{ nos} = 21\text{ RFT}$.
  - $\text{Frame Amount} = \text{RFT} \times \text{Rate (₹/RFT)}$.
- **Other Adjustments (+ / -)**:
  - Add extra items (Transport, Loading, Fitting, Discounts) with `+` or `-` selector.
- **Bill Amount & Cash Balance**:
  - Input field for **Bill Amount / Advance Paid**.
  - Formula: $\text{Cash Balance Due} = \text{Total Estimate Amount} - \text{Bill Amount}$.

### 4. A5 Paper Estimate Print Formats (Authentic Tally Bill UI)
- Strictly sized for **A5 Paper Sheet** ($148\text{mm} \times 210\text{mm}$ portrait).
- Prominent header title at the top of the page: **`ESTIMATE`**.
- Authentic Tally boxed grid format with vertical and horizontal borders.
- Two-column header: Buyer / Party details on the left, Estimate No. and Date on the right.
- Indian numbering system amount-in-words converter (e.g. *INR Eighty Four Thousand Six Hundred Nineteen Only*).
- **Strict Page-Break Protection**:
  - Table rows, headers, and totals use `break-inside: avoid !important;`.
  - Non-repeating table totals prevent duplicate counts on multi-page orders.
- Dual printing options:
  - **In-App A5 Print**: Click `Preview & Print A5` on the dashboard to view the live preview and trigger native printing.
  - **Dedicated Print View**: Accessible via [`print.php`](file:///e:/Ravi%20kanta%20Estimate%20print%20A5/print.php).

### 5. Party Directory & Memorized Custom Pricing (Party-Wise Isolation)
- **Zero Cross-Party Contamination**: Each party maintains their own independent custom price card (e.g. Party A has Laminate at ₹250/sqft, while Party B has Laminate at ₹255/sqft).
- **Automatic Memorization**:
  - **Import JSON**: Importing estimate JSON automatically memorizes the customer and their custom door/frame rates into the encrypted party master.
  - **Save Estimate**: Saving or updating an estimate automatically updates the latest agreed rates for that specific party.
  - **Manual Party Directory**: Open the **👥 Parties & Rates** modal to add, search, edit, or delete customer price cards.
- **Smart Rate Auto-Fill**:
  - Typing or selecting a customer name automatically detects memorized rates and displays an active rate badge (e.g. `⚡ Active Rates: 7 door types, 3 frame sections memorized`).
  - Adding a door category instantly auto-fills that specific party's agreed rate into the Rate (₹/sqft) field.

### 6. Door Categories & Quick-Add Pills
- Full support for all standard and modern door finishes:
  - **Microcoating**
  - **Membrane**
  - **Primer**
  - **Laminate**
  - **WPC**
  - **UV Coating**
  - **Veneer**
  - **Flush Door**
  - **Teak Wood**
- **One-Click Quick Add Pills**:
  - `+ Microcoating`, `+ Membrane`, `+ Primer`, `+ Laminate`, `+ WPC`, `+ UV Coating`, `+ Veneer` buttons to add rows with pre-selected category and auto-filled party rate.
- **WPC Frame Quick Add Pills**:
  - `+ 3x2 (7ft)`, `+ 4x2 (7ft)`, `+ 4x2.5 (7ft)`, `+ 5x2.5 (7ft)` buttons to quickly append standard frames with party-specific section rates.

### 7. Setup Wizard & Security Provisioning (`setup.php`)
- Guided first-time setup or emergency reconfiguration.
- Generates a cryptographically secure **Master Decryption Key** (`RK-XXXX-XXXX-XXXX-XXXX-XXXX`) with 1-click clipboard copy and `.txt` backup file download.
- Sets your 4 to 8-digit access PIN and business details (Shop Name, Mobile, Address).
- Automatically initializes the local encrypted database with preloaded sample data (**RK-KISHAN** - 20 Doors & 21 WPC Frames) and seeds the initial party master directory.
- 1-click startup on Windows via **`setup.bat`**.

---

## Setup Functions & Architecture (`setup.php`)

The [`setup.php`](file:///e:/Ravi%20kanta%20Estimate%20print%20A5/setup.php) wizard serves as the root provisioning and emergency recovery portal:

1. **Cryptographic Key Generation (`generateSecureKey()`)**:
   - Uses PHP's cryptographically secure pseudo-random bytes (`random_bytes(12)`) to generate a 24-character hexadecimal key formatted as:
     $$\text{RK-XXXX-XXXX-XXXX-XXXX-XXXX}$$
   - This key acts as the master decryption secret for the AES-256-CBC database files.
   - Includes one-click **Copy to Clipboard** and automated `.txt` backup file generation (`ravi_kanta_recovery_key.txt`).

2. **PIN Credential Hashing & Key Envelope**:
   - Sets a 4 to 8-digit numeric access PIN with verification confirmation.
   - The PIN is securely hashed using **Bcrypt** (`PASSWORD_BCRYPT`).
   - The Master Key is encrypted using the PIN via `encryptData($decryptionKey, $pin)` and stored in `.data/config.enc.json`. On daily login, entering the PIN unlocks the Master Key in memory without storing it in plaintext anywhere.

3. **Business Profile & Shop Customization**:
   - Configures business identity fields:
     - **Shop Name**: e.g. *RAVI KANTA DOORS & HARDWARE*
     - **Support Mobile**: e.g. *9019711881*
     - **Shop Address / Site**: e.g. *Bangalore, Karnataka*
   - These details propagate automatically across the application headers and estimate documents.

4. **Preloaded Real-World Sample Data Initialization**:
   - Optional toggle checkbox to seed the encrypted database with realistic orders (**RK-KISHAN** with 20 Doors and 21 WPC Frames).
   - Pre-populates door sizes ($79" \times 39"$, $81" \times 32"$), frame sections ($3\times2$, $4\times2$), flush door types, design numbers, and transport charges right out of the box.

5. **Lockout Recovery & Emergency Access**:
   - If an incorrect PIN is entered 3 consecutive times on the main dashboard, the app enters locked mode.
   - Accessing [`setup.php`](file:///e:/Ravi%20kanta%20Estimate%20print%20A5/setup.php) allows the administrator to enter the Master Decryption Key to reset the PIN and unlock the database without losing any saved estimate records.

6. **1-Click Execution via `setup.bat`**:
   - Validates that PHP is available on the system, starts the local PHP server on port `8088`, and immediately opens the setup wizard in your default browser.

---

## File Structure

```
e:/Ravi kanta Estimate print A5/
├── Run.bat                  # 1-Click launcher: starts server & opens main dashboard
├── setup.bat                # 1-Click setup: starts server & opens setup.php wizard
├── index.php                # Main dashboard, PIN gatekeeper, dynamic forms & A5 preview
├── setup.php                # First-time setup, PIN creation & Decryption Key generator
├── print.php                # Standalone dedicated A5 print template
├── api.php                  # REST API for PIN check, lockout, recovery, and encrypted CRUD
├── crypto.php               # AES-256-CBC, PBKDF2, HMAC-SHA256 cryptographic engine
├── assets/
│   ├── css/
│   │   ├── style.css        # Modern, responsive application styles
│   │   └── print-a5.css     # Authentic Tally Bill format calibrated for A5 portrait
│   └── js/
│       └── app.js           # Dynamic row logic, live math calculations & AJAX bridge
└── .data/                   # Hidden local encrypted JSON storage (protected)
    ├── .htaccess            # Apache direct access denial
    ├── index.html           # Directory listing blocker
    ├── config.enc.json      # Encrypted config and lockout tracking
    ├── estimates.enc.json   # AES-256 encrypted estimates database
    └── parties.enc.json     # AES-256 encrypted party master & custom price cards
```

---

## How to Run

### Quick Start (Windows):
- **To Launch the Application**: Double-click **`Run.bat`**. It starts the server and opens the dashboard (`http://127.0.0.1:8088/`).
- **To Run Setup & Configuration**: Double-click **`setup.bat`**. It starts the server and opens the Setup & Recovery Wizard (`http://127.0.0.1:8088/setup.php`).

### Manual Start:
1. Start the PHP server from the project directory:
   ```powershell
   php -S 127.0.0.1:8088
   ```
2. Open your browser and visit:
   ```
   http://127.0.0.1:8088/
   ```
3. If setting up for the first time, visit [`setup.php`](file:///e:/Ravi%20kanta%20Estimate%20print%20A5/setup.php).
4. Save your **Master Decryption Key** safely!
