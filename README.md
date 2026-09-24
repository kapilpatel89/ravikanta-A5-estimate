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

### 3. Setup Wizard (`setup.php`)
- Guided first-time setup or reconfiguration.
- Generates a high-entropy **Master Decryption Key** (e.g. `RK-XXXX-XXXX-XXXX-XXXX`) with one-click copy and `.txt` backup download.
- Sets your PIN and business details (Shop Name, Mobile, Address).
- Automatically initializes the encrypted database with preloaded sample data (**RK-KISHAN** - 20 Doors & 21 WPC Frames).

### 4. Dynamic Formulas & Calculation Engine
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
  - Example: Total $500 - 300\text{ (Bill Amount)} = 200\text{ Cash Balance}$.

### 5. A5 Paper Estimate Print Formats
- Strictly sized for **A5 Paper Sheet** ($148\text{mm} \times 210\text{mm}$ portrait).
- Prominent header title at the top of the page: **`ESTIMATE`**.
- **Space-Optimized Single-Line Header**:
  - Removed shop name, phone, priority, tagline, and notes/terms from the printout.
  - Order details formatted into a single horizontal strip:
    $$\text{Est No: RKD-...} \quad\vert\quad \text{Date: DD-MM-YYYY} \quad\vert\quad \text{Party: Name} \quad\vert\quad \text{Mobile: XXXXXXXXXX}$$
- **Signatures & Notes Removed**:
  - Customer signature and shop signature blocks removed from the bottom.
  - Notes / terms block removed to maximize printable item rows.
- **Dynamic Multi-Page Counter**:
  - If the estimate fits on 1 page: no counter is displayed.
  - If the estimate spans more than 1 page: automatically displays a page counter at the bottom of all pages (e.g., `Page 1 of 2`, `Page 2 of 2`, `Page 1 of 3`).
- Dual printing options:
  - **In-App A5 Print**: Click `Print A5 Format` to view the interactive modal preview and trigger browser print (`window.print()`).
  - **Dedicated Print View**: Accessible via [`print.php`](file:///e:/Ravi%20kanta%20Estimate%20print%20A5/print.php).

---

## File Structure

```
e:/Ravi kanta Estimate print A5/
├── index.php                # Main dashboard, PIN gatekeeper, dynamic forms & A5 preview
├── setup.php                # First-time setup, PIN creation & Decryption Key generator
├── print.php                # Standalone dedicated A5 print template
├── api.php                  # REST API for PIN check, lockout, recovery, and encrypted CRUD
├── crypto.php               # AES-256-CBC, PBKDF2, HMAC-SHA256 cryptographic engine
├── assets/
│   ├── css/
│   │   ├── style.css        # Modern, responsive application styles
│   │   └── print-a5.css     # Strict A5 paper print stylesheet (@page A5 portrait)
│   └── js/
│       └── app.js           # Dynamic row logic, live math calculations & AJAX bridge
└── .data/                   # Hidden local encrypted JSON storage (protected)
    ├── .htaccess            # Apache direct access denial
    ├── index.html           # Directory listing blocker
    ├── config.enc.json      # Encrypted config and lockout tracking
    └── estimates.enc.json   # AES-256 encrypted estimates database
```

---

## How to Run

1. Start the PHP server from the project directory:
   ```powershell
   php -S 127.0.0.1:8088
   ```
2. Open your browser and visit:
   ```
   http://127.0.0.1:8088/
   ```
3. If setting up for the first time, it will automatically guide you through [`setup.php`](file:///e:/Ravi%20kanta%20Estimate%20print%20A5/setup.php).
4. Save your **Master Decryption Key** safely!
