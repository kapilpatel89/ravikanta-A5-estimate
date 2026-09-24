<?php
require_once __DIR__ . '/crypto.php';

$isAlreadySetup = isSetupCompleted();
$error = '';
$success = false;
$decryptionKey = '';

// Generate a secure default decryption key
function generateSecureKey() {
    $bytes = random_bytes(12);
    $hex = strtoupper(bin2hex($bytes));
    return 'RK-' . substr($hex, 0, 4) . '-' . substr($hex, 4, 4) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'setup') {
        $pin = trim($_POST['pin'] ?? '');
        $confirmPin = trim($_POST['confirm_pin'] ?? '');
        $customKey = trim($_POST['decryption_key'] ?? '');
        $shopName = trim($_POST['shop_name'] ?? 'RAVI KANTA DOORS & HARDWARE');
        $shopPhone = trim($_POST['shop_phone'] ?? '9019711881');
        $shopAddress = trim($_POST['shop_address'] ?? '');
        $preloadSample = isset($_POST['preload_sample']);

        if (strlen($pin) < 4) {
            $error = 'PIN must be at least 4 digits.';
        } elseif ($pin !== $confirmPin) {
            $error = 'PIN and Confirm PIN do not match.';
        } elseif (empty($customKey)) {
            $error = 'Decryption Key cannot be empty.';
        } else {
            $decryptionKey = $customKey;
            
            // Build config array
            $config = [
                'shop_name' => $shopName,
                'shop_phone' => $shopPhone,
                'shop_address' => $shopAddress,
                'pin_hash' => password_hash($pin, PASSWORD_BCRYPT),
                'master_key_hash' => password_hash($decryptionKey, PASSWORD_BCRYPT),
                'master_key_enc' => encryptData($decryptionKey, $pin),
                'failed_attempts' => 0,
                'is_locked' => false,
                'setup_date' => date('Y-m-d H:i:s'),
                'last_pin_reset' => null
            ];

            saveConfig($config);

            // Preload sample estimate data if requested
            $initialEstimates = [];
            if ($preloadSample) {
                $sampleData = [
                    "id" => "RKD-24092026-168",
                    "orderNumber" => "RKD-24092026-168",
                    "partyId" => "party-1790140529619",
                    "partyName" => "RK-KISHAN",
                    "partyMobile" => "9019711881",
                    "partyAddress" => "",
                    "isFrameOnly" => false,
                    "hasWpcFrames" => true,
                    "height" => 79,
                    "width" => 39,
                    "dimensions" => "79\" × 39\"",
                    "totalDoors" => 20,
                    "currentDoors" => 20,
                    "doorsCount" => 20,
                    "totalFrames" => 21,
                    "framesCount" => 21,
                    "doors" => [
                        [
                            "id" => "door-1",
                            "doorIndex" => 1,
                            "currentDoor" => 1,
                            "currentDoors" => 2,
                            "totalDoors" => 20,
                            "quantity" => 2,
                            "height" => 79,
                            "width" => 39,
                            "dimensions" => "79\" × 39\"",
                            "thickness" => "38MM",
                            "designNo" => "WS-17",
                            "flushDoorType" => "PINE FRAME -SC (INSIDE PARTICAL)",
                            "doorType" => "PRIMER COATED DOOR",
                            "rate" => 125,
                            "notes" => "NO CHANGES"
                        ],
                        [
                            "id" => "door-1790244494923-e9ma",
                            "doorIndex" => 2,
                            "currentDoor" => 2,
                            "currentDoors" => 3,
                            "totalDoors" => 20,
                            "quantity" => 3,
                            "height" => 79,
                            "width" => 38,
                            "dimensions" => "79\" × 38\"",
                            "thickness" => "38MM",
                            "designNo" => "WS-17",
                            "flushDoorType" => "PINE FRAME -SC (INSIDE PARTICAL)",
                            "doorType" => "PRIMER COATED DOOR",
                            "rate" => 125,
                            "notes" => "NO CHANGES"
                        ],
                        [
                            "id" => "door-1790244529929-vi63",
                            "doorIndex" => 3,
                            "currentDoor" => 3,
                            "currentDoors" => 2,
                            "totalDoors" => 20,
                            "quantity" => 2,
                            "height" => 79,
                            "width" => 32,
                            "dimensions" => "79\" × 32\"",
                            "thickness" => "38MM",
                            "designNo" => "WS-17",
                            "flushDoorType" => "PINE FRAME -SC (INSIDE PARTICAL)",
                            "doorType" => "PRIMER COATED DOOR",
                            "rate" => 125,
                            "notes" => ""
                        ],
                        [
                            "id" => "door-1790244573729-ehvf",
                            "doorIndex" => 4,
                            "currentDoor" => 4,
                            "currentDoors" => 6,
                            "totalDoors" => 20,
                            "quantity" => 6,
                            "height" => 81,
                            "width" => 32,
                            "dimensions" => "81\" × 32\"",
                            "thickness" => "30 MM",
                            "designNo" => "WP-82",
                            "flushDoorType" => "PINE FRAME -DC(INSIDE HW)",
                            "doorType" => "PRIMER COATED DOOR",
                            "rate" => 110,
                            "notes" => "NO CHANGES"
                        ],
                        [
                            "id" => "door-1790244626569-csak",
                            "doorIndex" => 5,
                            "currentDoor" => 5,
                            "currentDoors" => 5,
                            "totalDoors" => 20,
                            "quantity" => 5,
                            "height" => 78,
                            "width" => 27.5,
                            "dimensions" => "78\" × 27.5\"",
                            "thickness" => "30 MM",
                            "designNo" => "WP-82",
                            "flushDoorType" => "30MM WPC (IVORY)",
                            "doorType" => "30MM WPC GROVE",
                            "rate" => 140,
                            "notes" => "GROW"
                        ],
                        [
                            "id" => "door-1790244700169-lt1t",
                            "doorIndex" => 6,
                            "currentDoor" => 6,
                            "currentDoors" => 2,
                            "totalDoors" => 20,
                            "quantity" => 2,
                            "height" => 78,
                            "width" => 29,
                            "dimensions" => "78\" × 29\"",
                            "thickness" => "30 MM",
                            "designNo" => "WP-82",
                            "flushDoorType" => "30MM WPC (IVORY)",
                            "doorType" => "30MM WPC GROVE",
                            "rate" => 140,
                            "notes" => "GROW"
                        ]
                    ],
                    "wpcFrames" => [
                        [
                            "id" => "frame-1790244761477-yyg3",
                            "frameIndex" => 1,
                            "quantity" => 14,
                            "section" => "3x2",
                            "lengthFeet" => "7",
                            "dimensions" => "3x2 × 7 ft",
                            "frameType" => "WPC FRAME (IVORY)-(A)",
                            "rate" => 65,
                            "notes" => ""
                        ],
                        [
                            "id" => "frame-1790244790194-kgt4",
                            "frameIndex" => 2,
                            "quantity" => 7,
                            "section" => "3x2",
                            "lengthFeet" => "3",
                            "dimensions" => "3x2 × 3 ft",
                            "frameType" => "WPC FRAME (IVORY)-(B)",
                            "rate" => 65,
                            "notes" => ""
                        ]
                    ],
                    "otherCharges" => [
                        [
                            "id" => "adj-1",
                            "description" => "Transport & Loading",
                            "type" => "+",
                            "amount" => 1200
                        ]
                    ],
                    "billAmount" => 25000,
                    "status" => "in_progress",
                    "orderDate" => "2026-09-24",
                    "priority" => "Normal",
                    "notes" => "Sample estimate initialized with actual doors & WPC frames data."
                ];
                $initialEstimates[] = $sampleData;
            }

            saveEstimates($initialEstimates, $decryptionKey);

            // Log user in automatically
            $_SESSION['authenticated'] = true;
            $_SESSION['master_key'] = $decryptionKey;
            $success = true;
        }
    }
}

if (!$decryptionKey) {
    $decryptionKey = generateSecureKey();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Setup & Security Key Generator | A5 Estimate System</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        .setup-container {
            max-width: 680px;
            margin: 40px auto;
            padding: 0 20px;
        }
        .setup-card {
            background: #ffffff;
            border-radius: 18px;
            box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.8);
            overflow: hidden;
        }
        .setup-header {
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
            color: #ffffff;
            padding: 36px 32px;
            text-align: center;
            position: relative;
        }
        .setup-header h1 {
            font-size: 26px;
            font-weight: 800;
            margin: 0 0 8px 0;
            letter-spacing: -0.02em;
        }
        .setup-header p {
            font-size: 14px;
            color: #c7d2fe;
            margin: 0;
        }
        .setup-body {
            padding: 32px;
        }
        .key-box {
            background: #f8fafc;
            border: 2px dashed #cbd5e1;
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 8px;
        }
        .key-text {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 17px;
            color: #4338ca;
            word-break: break-all;
            letter-spacing: 1px;
        }
        .btn-copy {
            background: #e0e7ff;
            color: #3730a3;
            border: none;
            padding: 8px 14px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            font-size: 13px;
        }
        .btn-copy:hover {
            background: #c7d2fe;
        }
        .alert-warning {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 14px 16px;
            border-radius: 8px;
            color: #92400e;
            font-size: 13.5px;
            line-height: 1.5;
            margin-bottom: 24px;
        }
        .alert-danger {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 14px 16px;
            border-radius: 8px;
            color: #991b1b;
            font-size: 13.5px;
            margin-bottom: 24px;
        }
        .alert-success {
            background: #ecfdf5;
            border-left: 4px solid #10b981;
            padding: 20px;
            border-radius: 8px;
            color: #065f46;
            margin-bottom: 24px;
        }
    </style>
</head>
<body class="bg-slate">
    <div class="setup-container">
        <div class="setup-card">
            <div class="setup-header">
                <div style="display:inline-flex; align-items:center; justify-content:center; width:52px; height:52px; background:rgba(255,255,255,0.12); border-radius:14px; margin-bottom:14px;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <h1>A5 Estimate Setup & Security</h1>
                <p>Configure PIN Password & Generate Decryption Key for Local Encrypted Storage</p>
            </div>

            <div class="setup-body">
                <?php if ($success): ?>
                    <div class="alert-success">
                        <h3 style="margin-top:0; font-size:18px; font-weight:700;">System Initialized & Encrypted!</h3>
                        <p style="margin:8px 0 16px 0; line-height:1.5;">
                            Your local JSON database is now encrypted at rest. Please save your Master Decryption Key securely before proceeding:
                        </p>
                        <div class="key-box" style="background:#ffffff; border-color:#10b981; margin-bottom:16px;">
                            <span class="key-text" id="finalKey"><?= htmlspecialchars($decryptionKey) ?></span>
                            <button type="button" class="btn-copy" onclick="copyKeyText('finalKey')">Copy Key</button>
                        </div>
                        <div style="display:flex; gap:12px; margin-top:20px;">
                            <a href="index.php" class="btn btn-primary" style="flex:1; text-align:center; padding:12px; font-size:15px; text-decoration:none;">
                                Launch Estimate App
                            </a>
                            <button type="button" class="btn btn-secondary" onclick="downloadBackupKey('<?= htmlspecialchars($decryptionKey) ?>')">
                                Save Key as .txt
                            </button>
                        </div>
                    </div>
                <?php else: ?>

                    <?php if ($isAlreadySetup): ?>
                        <div class="alert-warning" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                            <div>
                                <strong>System Already Initialized!</strong>
                                <div style="font-size:12.5px; margin-top:2px;">An encrypted database already exists. Re-running setup will replace existing keys and database.</div>
                            </div>
                            <a href="index.php" class="btn btn-sm btn-primary" style="text-decoration:none; white-space:nowrap;">Go to App &rarr;</a>
                        </div>
                    <?php endif; ?>

                    <?php if (!empty($error)): ?>
                        <div class="alert-danger"><?= htmlspecialchars($error) ?></div>
                    <?php endif; ?>

                    <form method="POST" id="setupForm">
                        <input type="hidden" name="action" value="setup">

                        <div class="form-section-title">Shop / Business Header</div>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label for="shop_name">Shop / Business Name</label>
                                <input type="text" id="shop_name" name="shop_name" class="form-control" value="RAVI KANTA DOORS & HARDWARE" required>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label for="shop_phone">Contact Mobile</label>
                                <input type="text" id="shop_phone" name="shop_phone" class="form-control" value="9019711881">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="shop_address">Shop Address (Optional for A5 Header)</label>
                            <input type="text" id="shop_address" name="shop_address" class="form-control" placeholder="City / Market Address">
                        </div>

                        <div class="form-section-title" style="margin-top:28px;">PIN Password Protection</div>
                        <div class="alert-warning" style="margin-bottom:16px;">
                            <strong>Security Rule:</strong> If an incorrect PIN is entered <strong>3 consecutive times</strong>, the system locks completely. Unlocking will require the <strong>Decryption Key</strong> generated below.
                        </div>

                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label for="pin">Create New PIN (4-8 digits)</label>
                                <div class="password-wrapper">
                                    <input type="password" id="pin" name="pin" class="form-control" placeholder="e.g. 1234" maxlength="8" pattern="[0-9a-zA-Z]{4,8}" required>
                                    <button type="button" class="eye-toggle" onclick="togglePassword('pin')">&#128065;</button>
                                </div>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label for="confirm_pin">Confirm PIN</label>
                                <div class="password-wrapper">
                                    <input type="password" id="confirm_pin" name="confirm_pin" class="form-control" placeholder="Re-enter PIN" maxlength="8" required>
                                    <button type="button" class="eye-toggle" onclick="togglePassword('confirm_pin')">&#128065;</button>
                                </div>
                            </div>
                        </div>

                        <div class="form-section-title" style="margin-top:28px;">Master Decryption Key (Recovery Key)</div>
                        <p style="font-size:13px; color:#64748b; margin-top:-6px; margin-bottom:10px;">
                            This key encrypts your local database and is the <strong>only way</strong> to reset your PIN if you enter it wrong 3 times.
                        </p>

                        <div class="key-box">
                            <input type="text" id="decryption_key" name="decryption_key" value="<?= htmlspecialchars($decryptionKey) ?>" class="key-text" style="background:transparent; border:none; width:100%; outline:none;" readonly>
                            <div style="display:flex; gap:6px;">
                                <button type="button" class="btn-copy" onclick="copyKeyText('decryption_key')">Copy</button>
                                <button type="button" class="btn-copy" style="background:#f1f5f9; color:#475569;" onclick="regenerateKey()">New</button>
                            </div>
                        </div>

                        <div style="margin-top:20px; background:#f1f5f9; border-radius:10px; padding:14px 16px;">
                            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-weight:600; color:#334155; font-size:14px;">
                                <input type="checkbox" name="preload_sample" value="1" checked style="width:18px; height:18px; accent-color:#4338ca;">
                                Pre-load sample estimate (RK-KISHAN: 20 Doors & 21 WPC Frames)
                            </label>
                            <div style="font-size:12.5px; color:#64748b; margin-left:28px; margin-top:3px;">
                                Includes your sample order data ready for instant dynamic editing, calculation, and A5 printing.
                            </div>
                        </div>

                        <div style="margin-top:28px;">
                            <button type="submit" class="btn btn-primary" style="width:100%; padding:14px; font-size:16px;">
                                Save & Initialize Encrypted Storage
                            </button>
                        </div>
                    </form>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <script>
        function togglePassword(id) {
            const input = document.getElementById(id);
            if (input.type === 'password') {
                input.type = 'text';
            } else {
                input.type = 'password';
            }
        }

        function copyKeyText(elementId) {
            const el = document.getElementById(elementId);
            const val = el.value || el.innerText;
            navigator.clipboard.writeText(val).then(() => {
                alert('Decryption Key copied to clipboard! Keep it in a safe place.');
            }).catch(() => {
                prompt('Copy your Decryption Key:', val);
            });
        }

        function regenerateKey() {
            const chars = '0123456789ABCDEF';
            let segs = [];
            for (let s = 0; s < 5; s++) {
                let part = '';
                for (let i = 0; i < 4; i++) {
                    part += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                segs.push(part);
            }
            document.getElementById('decryption_key').value = 'RK-' + segs.join('-');
        }

        function downloadBackupKey(key) {
            const text = "=== RAVI KANTA ESTIMATE SYSTEM - RECOVERY KEY ===\n\n" +
                         "Master Decryption Key: " + key + "\n" +
                         "Generated Date: " + new Date().toISOString() + "\n\n" +
                         "KEEP THIS FILE SAFE!\n" +
                         "If you forget your PIN or enter it wrong 3 times,\n" +
                         "this key is REQUIRED to unlock and reset your PIN.\n";
            const blob = new Blob([text], { type: 'text/plain' });
            const anchor = document.createElement('a');
            anchor.download = 'Estimate_Decryption_Key_Backup.txt';
            anchor.href = window.URL.createObjectURL(blob);
            anchor.click();
        }
    </script>
</body>
</html>
