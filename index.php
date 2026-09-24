<?php
require_once __DIR__ . '/crypto.php';

// Check if setup completed
if (!isSetupCompleted()) {
    header('Location: setup.php');
    exit;
}

$isAuth = isAuthenticated();
$config = getConfig();
$isLocked = !empty($config['is_locked']);
$failedAttempts = isset($config['failed_attempts']) ? (int)$config['failed_attempts'] : 0;
$attemptsLeft = max(0, 3 - $failedAttempts);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ESTIMATE - A5 Paper Print & Encrypted Storage</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css?v=<?= time() ?>">
    <link rel="stylesheet" href="assets/css/print-a5.css?v=<?= time() ?>">
</head>
<body>

    <!-- AUTHENTICATION GATEKEEPER / PIN LOCK SCREEN -->
    <div id="lockScreen" class="lock-screen" style="display: <?= $isAuth ? 'none' : 'flex' ?>;">
        <div class="lock-card">
            <div class="lock-header">
                <div class="lock-avatar">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <h2 style="font-size:22px; font-weight:800; margin-bottom:4px;"><?= htmlspecialchars($config['shop_name'] ?? 'RAVI KANTA DOORS') ?></h2>
                <div style="font-size:13px; color:#c7d2fe;">A5 Paper Estimate &bull; Protected System</div>
            </div>

            <div class="lock-body">
                <!-- NORMAL PIN ENTRY MODE -->
                <div id="pinModeSection" style="display: <?= $isLocked ? 'none' : 'block' ?>;">
                    <p style="font-size:14px; color:#475569; margin-bottom:16px;">
                        Enter your security PIN to decrypt local database:
                    </p>

                    <div id="pinAlertBox" style="display:none; margin-bottom:14px;"></div>

                    <div class="password-wrapper" style="max-width:280px; margin:0 auto 10px auto;">
                        <input type="password" id="inputPin" class="form-control pin-display" placeholder="••••" maxlength="8" autofocus autocomplete="off">
                        <button type="button" class="eye-toggle" onclick="togglePassword('inputPin')">&#128065;</button>
                    </div>

                    <div id="attemptsIndicator" class="attempts-badge <?= $attemptsLeft <= 1 ? 'danger' : ($attemptsLeft === 2 ? 'warning' : 'ok') ?>">
                        <span id="attemptsText"><?= $attemptsLeft ?> attempt(s) remaining</span>
                    </div>

                    <!-- On-screen Numeric Keypad for convenience -->
                    <div class="pin-keypad">
                        <button type="button" class="pin-key" onclick="appendPin('1')">1</button>
                        <button type="button" class="pin-key" onclick="appendPin('2')">2</button>
                        <button type="button" class="pin-key" onclick="appendPin('3')">3</button>
                        <button type="button" class="pin-key" onclick="appendPin('4')">4</button>
                        <button type="button" class="pin-key" onclick="appendPin('5')">5</button>
                        <button type="button" class="pin-key" onclick="appendPin('6')">6</button>
                        <button type="button" class="pin-key" onclick="appendPin('7')">7</button>
                        <button type="button" class="pin-key" onclick="appendPin('8')">8</button>
                        <button type="button" class="pin-key" onclick="appendPin('9')">9</button>
                        <button type="button" class="pin-key" style="color:#ef4444; font-size:14px;" onclick="clearPin()">CLEAR</button>
                        <button type="button" class="pin-key" onclick="appendPin('0')">0</button>
                        <button type="button" class="pin-key" style="color:#4338ca; font-size:14px;" onclick="backspacePin()">⌫</button>
                    </div>

                    <div style="margin-top:24px;">
                        <button type="button" id="btnUnlock" class="btn btn-primary" style="width:100%; padding:12px; font-size:15px;" onclick="submitPin()">
                            Unlock & Decrypt Database
                        </button>
                    </div>

                    <div style="margin-top:16px;">
                        <button type="button" class="btn-ghost" style="font-size:12.5px; color:#64748b; background:none; border:none; cursor:pointer;" onclick="switchToRecoveryMode()">
                            Forgot PIN? Use Decryption Key
                        </button>
                    </div>
                </div>

                <!-- 3-ATTEMPTS LOCKOUT / DECRYPTION KEY RECOVERY MODE -->
                <div id="recoveryModeSection" style="display: <?= $isLocked ? 'block' : 'none' ?>;">
                    <div class="alert-danger" style="text-align:left; margin-bottom:16px;">
                        <strong>System Locked!</strong>
                        <div style="font-size:12.5px; margin-top:4px;">
                            3 incorrect PIN attempts were detected. As a security protection, please enter your <strong>Decryption Key</strong> to reset your password.
                        </div>
                    </div>

                    <div id="recoveryAlertBox" style="display:none; margin-bottom:14px;"></div>

                    <div class="form-group" style="text-align:left; margin-bottom:16px;">
                        <label for="recoveryKeyInput">Master Decryption Key</label>
                        <input type="text" id="recoveryKeyInput" class="form-control" placeholder="e.g. RK-XXXX-XXXX-XXXX-XXXX" style="font-family:var(--font-mono); font-weight:600;">
                    </div>

                    <button type="button" id="btnVerifyRecovery" class="btn btn-primary" style="width:100%; padding:12px;" onclick="submitRecoveryKey()">
                        Verify Decryption Key
                    </button>
                </div>

                <!-- RESET PIN FORM (SHOWN AFTER DECRYPTION KEY VERIFICATION) -->
                <div id="resetPinSection" style="display:none;">
                    <div class="alert-success" style="text-align:left; margin-bottom:16px;">
                        <strong>Key Verified!</strong>
                        <div style="font-size:12.5px; margin-top:2px;">Create a new PIN to unlock your encrypted estimate database.</div>
                    </div>

                    <div id="resetPinAlertBox" style="display:none; margin-bottom:14px;"></div>

                    <div class="form-group" style="text-align:left; margin-bottom:12px;">
                        <label for="newPinInput">New PIN (4-8 digits)</label>
                        <div class="password-wrapper">
                            <input type="password" id="newPinInput" class="form-control" placeholder="Enter new PIN" maxlength="8">
                            <button type="button" class="eye-toggle" onclick="togglePassword('newPinInput')">&#128065;</button>
                        </div>
                    </div>

                    <div class="form-group" style="text-align:left; margin-bottom:20px;">
                        <label for="confirmNewPinInput">Confirm New PIN</label>
                        <div class="password-wrapper">
                            <input type="password" id="confirmNewPinInput" class="form-control" placeholder="Re-enter new PIN" maxlength="8">
                            <button type="button" class="eye-toggle" onclick="togglePassword('confirmNewPinInput')">&#128065;</button>
                        </div>
                    </div>

                    <button type="button" class="btn btn-success" style="width:100%; padding:12px;" onclick="submitNewPin()">
                        Set New PIN & Unlock App
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- MAIN APPLICATION WRAPPER -->
    <div id="appContainer" style="display: <?= $isAuth ? 'block' : 'none' ?>;">
        <!-- Top App Navigation -->
        <header class="app-header no-print">
            <div class="app-header-inner">
                <div class="brand-wrapper">
                    <div class="brand-logo">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </div>
                    <div>
                        <div class="brand-title"><?= htmlspecialchars($config['shop_name'] ?? 'RAVI KANTA DOORS & HARDWARE') ?></div>
                        <div class="brand-subtitle">A5 Paper Estimate Print & Local Encrypted Database</div>
                    </div>
                </div>

                <div class="header-actions">
                    <span class="status-badge">
                        <span class="dot"></span>
                        Encrypted DB: AES-256
                    </span>

                    <button type="button" class="btn btn-secondary btn-sm" onclick="createNewEstimate()">
                        + New Estimate
                    </button>

                    <button type="button" class="btn btn-secondary btn-sm" onclick="loadSampleDataPrompt()">
                        Load Sample
                    </button>

                    <button type="button" class="btn btn-secondary btn-sm" onclick="openHistoryModal()">
                        History (<span id="savedCountBadge">0</span>)
                    </button>

                    <button type="button" class="btn btn-secondary btn-sm" onclick="openImportModal()">
                        Import JSON
                    </button>

                    <button type="button" class="btn btn-secondary btn-sm" onclick="exportCurrentJSON()">
                        Export JSON
                    </button>

                    <button type="button" class="btn btn-danger btn-sm" onclick="lockApp()">
                        Lock App
                    </button>
                </div>
            </div>
        </header>

        <!-- Main Workspace -->
        <main class="main-container no-print">

            <!-- Global Action Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <h1 style="font-size:24px; font-weight:800; letter-spacing:-0.02em;">ESTIMATE GENERATOR</h1>
                    <span id="activeOrderBadge" class="card-badge" style="font-size:13px; font-family:var(--font-mono);">RKD-24092026-168</span>
                </div>
                <div style="display:flex; gap:10px;">
                    <button type="button" class="btn btn-primary" onclick="saveActiveEstimate()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        Save Estimate
                    </button>
                    <button type="button" class="btn btn-success" onclick="previewAndPrintA5()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print A5 Format
                    </button>
                </div>
            </div>

            <!-- Party & Order Header Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title-group">
                        <span class="card-title">Party & Order Details</span>
                    </div>
                    <div style="font-size:12px; color:#64748b;">Header will print as <strong>"ESTIMATE"</strong> on A5 Sheet</div>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group" style="flex:1;">
                            <label for="orderNumber">Estimate / Order No.</label>
                            <input type="text" id="orderNumber" class="form-control" value="RKD-24092026-168">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label for="orderDate">Date</label>
                            <input type="date" id="orderDate" class="form-control" value="<?= date('Y-m-d') ?>">
                        </div>
                        <div class="form-group" style="flex:2;">
                            <label for="partyName">Party Name *</label>
                            <input type="text" id="partyName" class="form-control" placeholder="Customer / Party Name" value="RK-KISHAN" required>
                        </div>
                        <div class="form-group" style="flex:1.5;">
                            <label for="partyMobile">Party Mobile *</label>
                            <input type="text" id="partyMobile" class="form-control" placeholder="10-digit mobile" value="9019711881">
                        </div>
                    </div>
                    <div class="form-row" style="margin-bottom:0;">
                        <div class="form-group" style="flex:3;">
                            <label for="partyAddress">Delivery / Site Address</label>
                            <input type="text" id="partyAddress" class="form-control" placeholder="Address or Location notes">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label for="orderPriority">Priority</label>
                            <select id="orderPriority" class="form-control">
                                <option value="Normal">Normal</option>
                                <option value="Urgent">Urgent</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Doors Section Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title-group">
                        <span class="card-title">Door Specifications & SQFT Calculation</span>
                        <span id="doorsCountBadge" class="card-badge">0 Doors</span>
                        <span id="doorsSqftBadge" class="card-badge" style="background:#f1f5f9; color:#334155;">0.00 SQFT</span>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm" onclick="addDoorRow()">
                        + Add Door Item
                    </button>
                </div>
                <div class="card-body" style="padding:0;">
                    <div class="table-responsive">
                        <table class="data-table" id="doorsTable">
                            <thead>
                                <tr>
                                    <th style="width:40px;">#</th>
                                    <th>Door Type / Spec</th>
                                    <th>Flush Spec</th>
                                    <th style="width:90px;">Design</th>
                                    <th style="width:85px;">Thick</th>
                                    <th style="width:75px;">H (in)</th>
                                    <th style="width:75px;">W (in)</th>
                                    <th style="width:65px;">Qty</th>
                                    <th style="width:85px;" class="num-cell">SQFT</th>
                                    <th style="width:95px;" class="num-cell">Rate (₹/sqft)</th>
                                    <th style="width:110px;" class="num-cell">Amount (₹)</th>
                                    <th>Notes</th>
                                    <th style="width:80px; text-align:center;">Action</th>
                                </tr>
                            </thead>
                            <tbody id="doorsTableBody">
                                <!-- Dynamic rows generated via JS -->
                            </tbody>
                            <tfoot>
                                <tr style="background:#f8fafc; font-weight:700;">
                                    <td colspan="7" style="text-align:right;">Doors Subtotal:</td>
                                    <td id="doorsTotalQty" style="font-family:var(--font-mono);">0</td>
                                    <td id="doorsTotalSqft" class="num-cell" style="font-family:var(--font-mono);">0.00</td>
                                    <td></td>
                                    <td id="doorsTotalAmount" class="num-cell" style="font-family:var(--font-mono); color:var(--primary); font-size:15px;">₹ 0.00</td>
                                    <td colspan="2"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div style="padding:12px 20px; font-size:12.5px; color:#64748b; background:#fafafa; border-top:1px solid #e2e8f0;">
                        <strong>SQFT Formula:</strong> Height (in) &times; Width (in) &times; Qty &divide; 144. Example: 79" &times; 39" &times; 2 &divide; 144 = 42.79 SQFT.
                    </div>
                </div>
            </div>

            <!-- WPC Frames Section Card -->
            <div class="card" id="framesCardSection">
                <div class="card-header">
                    <div class="card-title-group">
                        <span class="card-title">WPC Frames & RFT Calculation</span>
                        <span id="framesCountBadge" class="card-badge">0 Frames</span>
                        <span id="framesRftBadge" class="card-badge" style="background:#f1f5f9; color:#334155;">0.00 RFT</span>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm" onclick="addFrameRow()">
                        + Add WPC Frame
                    </button>
                </div>
                <div class="card-body" style="padding:0;">
                    <div class="table-responsive">
                        <table class="data-table" id="framesTable">
                            <thead>
                                <tr>
                                    <th style="width:40px;">#</th>
                                    <th>Frame Type / Spec</th>
                                    <th style="width:110px;">Section Size</th>
                                    <th style="width:95px;">Length (ft)</th>
                                    <th style="width:75px;">Qty (nos)</th>
                                    <th style="width:90px;" class="num-cell">RFT</th>
                                    <th style="width:100px;" class="num-cell">Rate (₹/Rft)</th>
                                    <th style="width:120px;" class="num-cell">Amount (₹)</th>
                                    <th>Notes</th>
                                    <th style="width:80px; text-align:center;">Action</th>
                                </tr>
                            </thead>
                            <tbody id="framesTableBody">
                                <!-- Dynamic rows generated via JS -->
                            </tbody>
                            <tfoot>
                                <tr style="background:#f8fafc; font-weight:700;">
                                    <td colspan="4" style="text-align:right;">WPC Frames Subtotal:</td>
                                    <td id="framesTotalQty" style="font-family:var(--font-mono);">0</td>
                                    <td id="framesTotalRft" class="num-cell" style="font-family:var(--font-mono);">0.00</td>
                                    <td></td>
                                    <td id="framesTotalAmount" class="num-cell" style="font-family:var(--font-mono); color:var(--primary); font-size:15px;">₹ 0.00</td>
                                    <td colspan="2"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div style="padding:12px 20px; font-size:12.5px; color:#64748b; background:#fafafa; border-top:1px solid #e2e8f0;">
                        <strong>RFT Formula:</strong> Length (ft) &times; Qty (nos). Example: 7 feet &times; 14 nos = 98 RFT. Rate applies per RFT.
                    </div>
                </div>
            </div>

            <!-- Empty WPC Notification Banner (when party has no WPC frames) -->
            <div id="wpcEmptyBanner" class="card" style="display:none; padding:14px 20px; background:#f8fafc; border:1.5px dashed #cbd5e1; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:20px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:16px;">🪵</span>
                    <span style="font-size:13px; color:#475569;">
                        <strong>WPC Frames:</strong> None added for this party (doors only).
                    </span>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="enableAndAddWpcFrame()">
                    + Add WPC Frames to Estimate
                </button>
            </div>

            <!-- Summary, Other Adjustments & Cash Balance Section -->
            <div class="summary-container">
                <!-- Other Adjustments (Transport, Extra, Discount) -->
                <div class="summary-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <span class="card-title" style="font-size:15px;">Other Charges / Adjustments</span>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="addAdjustmentRow()">
                            + Add Charge / Discount
                        </button>
                    </div>
                    <p style="font-size:12.5px; color:#64748b; margin-bottom:12px;">
                        Add additional items like Loading, Transportation, Fitting, or apply discounts with <strong>+</strong> or <strong>-</strong>.
                    </p>

                    <div id="adjustmentsContainer" class="adjustments-list">
                        <!-- Dynamic Adjustments -->
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label for="estimateNotes">Order / Delivery Terms & Notes</label>
                        <textarea id="estimateNotes" class="form-control" rows="3" placeholder="Enter notes or terms to print on A5 estimate..."></textarea>
                    </div>
                </div>

                <!-- Grand Total & Cash Balance Calculation -->
                <div class="summary-card" style="background:#ffffff; border-color:#cbd5e1;">
                    <h3 style="font-size:16px; font-weight:800; margin-bottom:16px; color:#1e1b4b; border-bottom:1px solid #e2e8f0; padding-bottom:8px;">
                        ESTIMATE CALCULATION
                    </h3>

                    <div class="summary-row">
                        <span class="summary-label">Doors Subtotal:</span>
                        <span class="summary-val" id="sumDoorsAmt">₹ 0.00</span>
                    </div>

                    <div class="summary-row" id="sumFramesRow">
                        <span class="summary-label">WPC Frames Subtotal:</span>
                        <span class="summary-val" id="sumFramesAmt">₹ 0.00</span>
                    </div>

                    <div class="summary-row">
                        <span class="summary-label">Other Adjustments:</span>
                        <span class="summary-val" id="sumOtherAmt">₹ 0.00</span>
                    </div>

                    <div class="summary-row" style="border-top:1.5px solid #0f172a; padding-top:12px; margin-top:6px;">
                        <span class="summary-label" style="font-weight:700; color:#0f172a;">Total Estimate Amount:</span>
                        <span class="summary-val" id="sumNetTotal" style="font-size:18px; color:#4338ca;">₹ 0.00</span>
                    </div>

                    <!-- Bill Amount (Advance / Billed) Input -->
                    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-top:14px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <label for="billAmount" style="font-size:13px; font-weight:700; color:#334155;">
                                Bill Amount / Advance Paid:
                            </label>
                            <span style="font-size:11px; color:#64748b;">(Deducted from Total)</span>
                        </div>
                        <div style="position:relative;">
                            <span style="position:absolute; left:10px; top:8px; font-weight:700; color:#64748b;">₹</span>
                            <input type="number" id="billAmount" class="form-control num-cell" style="padding-left:26px; font-size:16px; font-weight:700; color:#0f172a;" value="0" step="any" oninput="calculateAll()">
                        </div>
                    </div>

                    <!-- Cash Balance Calculation Box -->
                    <div class="balance-highlight">
                        <div>
                            <div class="balance-title">Cash Balance Due</div>
                            <div style="font-size:11px; color:#c7d2fe;">Total - Bill Amount</div>
                        </div>
                        <div class="balance-amt" id="cashBalanceAmt">₹ 0.00</div>
                    </div>

                    <!-- Save & Print Buttons -->
                    <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">
                        <button type="button" class="btn btn-success" style="padding:12px; font-size:15px; font-weight:700;" onclick="previewAndPrintA5()">
                            Print A5 Estimate
                        </button>
                        <button type="button" class="btn btn-primary" style="padding:10px;" onclick="saveActiveEstimate()">
                            Save to Encrypted DB
                        </button>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- A5 PRINTABLE DOCUMENT AREA (Authentic Tally Bill Format) -->
    <div id="a5PrintArea" class="tally-bill-wrapper" style="display:none;">
        <!-- Top Title: ESTIMATE -->
        <div class="tally-top-title">ESTIMATE</div>

        <!-- Tally Structured Header Box (Party & Estimate Details) -->
        <table class="tally-meta-table">
            <tr>
                <td style="width: 58%;">
                    <div class="tally-label">Buyer / Party Name:</div>
                    <div class="tally-val" id="printPartyName" style="font-size:8.5pt; text-transform:uppercase;">RK-KISHAN</div>
                    <div id="printPartyAddressWrap" style="display:none; margin-top:2px;">
                        <span class="tally-label">Destination / Site:</span> <span id="printPartyAddress" style="font-weight:700;"></span>
                    </div>
                </td>
                <td style="width: 42%;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                        <span class="tally-label">Estimate No.:</span>
                        <span class="tally-val-mono" id="printOrderNo">RKD-24092026-168</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span class="tally-label">Dated:</span>
                        <span class="tally-val-mono" id="printDate"><?= date('d-M-Y') ?></span>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Doors Section Table (Tally Grid) -->
        <div id="printDoorsSection">
            <div class="tally-section-header">
                <span id="doorsSectionHeading">1. DOORS SPECIFICATIONS</span>
                <span id="printDoorsCountBadge">20 Doors | 291.80 SQFT</span>
            </div>
            <table class="tally-data-table" id="printDoorsTable">
                <thead>
                    <tr>
                        <th style="width:28px;" class="text-center">Sl</th>
                        <th>Description of Doors</th>
                        <th style="width:50px;" class="text-center">Design</th>
                        <th style="width:36px;" class="text-center">Thick</th>
                        <th style="width:52px;" class="text-center">Size (HxW)</th>
                        <th style="width:26px;" class="text-center">Qty</th>
                        <th style="width:44px;" class="text-right">Sq.Ft</th>
                        <th style="width:44px;" class="text-right">Rate</th>
                        <th style="width:58px;" class="text-right">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody id="printDoorsTbody">
                    <!-- Populated dynamically -->
                </tbody>
                <tbody class="tally-table-totals">
                    <tr class="tally-table-total-row">
                        <td colspan="5" class="text-right bold">Doors Total:</td>
                        <td id="printDoorsTotalQty" class="text-center font-mono bold">0</td>
                        <td id="printDoorsTotalSqft" class="text-right font-mono bold">0.00</td>
                        <td></td>
                        <td id="printDoorsTotalAmount" class="text-right font-mono bold">0.00</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- WPC Frames Section Table (Tally Grid) -->
        <div id="printFramesSection">
            <div class="tally-section-header">
                <span id="framesSectionHeading">2. WPC FRAMES SPECIFICATIONS</span>
                <span id="printFramesCountBadge">21 Frames | 119.00 RFT</span>
            </div>
            <table class="tally-data-table" id="printFramesTable">
                <thead>
                    <tr>
                        <th style="width:28px;" class="text-center">Sl</th>
                        <th>Description of WPC Frames</th>
                        <th style="width:44px;" class="text-center">Section</th>
                        <th style="width:36px;" class="text-center">Length</th>
                        <th style="width:26px;" class="text-center">Qty</th>
                        <th style="width:44px;" class="text-right">R.Ft</th>
                        <th style="width:44px;" class="text-right">Rate</th>
                        <th style="width:58px;" class="text-right">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody id="printFramesTbody">
                    <!-- Populated dynamically -->
                </tbody>
                <tbody class="tally-table-totals">
                    <tr class="tally-table-total-row">
                        <td colspan="4" class="text-right bold">Frames Total:</td>
                        <td id="printFramesTotalQty" class="text-center font-mono bold">0</td>
                        <td id="printFramesTotalRft" class="text-right font-mono bold">0.00</td>
                        <td></td>
                        <td id="printFramesTotalAmount" class="text-right font-mono bold">0.00</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Tally Bottom Grid: Amount in Words on Left, Totals on Right -->
        <div class="tally-bottom-grid">
            <div class="tally-words-box">
                <div>
                    <div class="tally-words-title">Amount Chargeable (in words):</div>
                    <div class="tally-words-text" id="printAmountInWords">INR Zero Only</div>
                </div>
                <div class="tally-eoe">E. &amp; O.E.</div>
            </div>

            <table class="tally-totals-table">
                <tr>
                    <td class="bold">Sub Total:</td>
                    <td class="text-right font-mono bold" id="printSubtotal">₹ 0.00</td>
                </tr>
                <tbody id="printAdjustmentsTbody">
                    <!-- Adjustment rows printed here -->
                </tbody>
                <tr class="tally-total-row">
                    <td>TOTAL ESTIMATE:</td>
                    <td class="text-right font-mono" id="printNetTotal">₹ 0.00</td>
                </tr>
                <tr>
                    <td>Less: Bill Amount:</td>
                    <td class="text-right font-mono bold" id="printBillAmount">₹ 0.00</td>
                </tr>
                <tr class="tally-balance-row">
                    <td>CASH BALANCE:</td>
                    <td class="text-right font-mono" id="printCashBalance">₹ 0.00</td>
                </tr>
            </table>
        </div>

        <!-- Dynamic Tally Multi-Page Counter (shown only if pages > 1) -->
        <div class="tally-page-footer" id="printPageCounter"></div>
    </div>

    <!-- PREVIEW A5 MODAL (BEFORE ACTUAL PRINTING) -->
    <div id="previewModal" class="modal-overlay">
        <div class="modal-content" style="max-width:860px;">
            <div class="modal-header">
                <div class="modal-title">A5 Paper Print Preview (148mm &times; 210mm)</div>
                <button type="button" class="modal-close" onclick="closePreviewModal()">&times;</button>
            </div>
            <div class="modal-body" style="background:#f1f5f9; padding:20px; max-height:75vh; overflow-y:auto;">
                <div class="a5-preview-frame" id="a5ModalPreviewArea">
                    <!-- Cloned A5 content shown here -->
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closePreviewModal()">Close</button>
                <button type="button" class="btn btn-primary" onclick="triggerNativePrint()">Print A5 Sheet Now</button>
            </div>
        </div>
    </div>

    <!-- SAVED ESTIMATES HISTORY MODAL -->
    <div id="historyModal" class="modal-overlay">
        <div class="modal-content" style="max-width:800px;">
            <div class="modal-header">
                <div class="modal-title">Saved Estimates (Encrypted Database)</div>
                <button type="button" class="modal-close" onclick="closeHistoryModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Order No.</th>
                                <th>Date</th>
                                <th>Party Name</th>
                                <th>Mobile</th>
                                <th class="num-cell">Total Amt</th>
                                <th class="num-cell">Balance</th>
                                <th style="text-align:center;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="historyTableBody">
                            <!-- Populated dynamically -->
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeHistoryModal()">Close</button>
            </div>
        </div>
    </div>

    <!-- IMPORT JSON MODAL -->
    <div id="importModal" class="modal-overlay">
        <div class="modal-content" style="max-width:600px;">
            <div class="modal-header">
                <div class="modal-title">Import Party JSON Data (Clean Render)</div>
                <button type="button" class="modal-close" onclick="closeImportModal()">&times;</button>
            </div>
            <div class="modal-body">
                <p style="font-size:13px; color:#475569; margin-bottom:12px; line-height:1.4;">
                    Paste or choose any party's JSON data. <strong>All old party data and WPC frames will be completely cleared</strong> and the new party will be rendered fresh.
                </p>
                <div style="margin-bottom:12px;">
                    <label style="font-size:12px; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Upload JSON File (Optional):</label>
                    <input type="file" id="jsonFileInput" accept=".json,application/json" onchange="loadJsonFromFile(event)" class="form-control" style="padding:6px;">
                </div>
                <div>
                    <label style="font-size:12px; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Or Paste JSON Content:</label>
                    <textarea id="importJsonText" class="form-control" rows="9" placeholder="Paste JSON here..." style="font-family:var(--font-mono); font-size:12px;"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeImportModal()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="submitImportJson()">Import &amp; Render Clean</button>
            </div>
        </div>
    </div>

    <script src="assets/js/app.js?v=<?= time() ?>"></script>
</body>
</html>
