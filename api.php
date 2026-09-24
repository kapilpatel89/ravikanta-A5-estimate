<?php
/**
 * REST API Endpoint for A5 Estimate WebApp
 * Handles Authentication, PIN Lockout, Decryption Key Recovery, and Encrypted Storage CRUD.
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/crypto.php';

$response = [
    'success' => false,
    'message' => 'Invalid request'
];

$method = $_SERVER['REQUEST_METHOD'];

// Helper to read JSON request body or POST data
function getRequestData() {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $json = json_decode($raw, true);
        if (is_array($json)) {
            return $json;
        }
    }
    return $_POST;
}

$data = getRequestData();
$action = $data['action'] ?? $_GET['action'] ?? '';

// Check initial status without requiring authentication
if ($action === 'status') {
    $setupDone = isSetupCompleted();
    $config = getConfig();
    $isLocked = !empty($config['is_locked']);
    $failedAttempts = isset($config['failed_attempts']) ? (int)$config['failed_attempts'] : 0;
    $attemptsLeft = max(0, 3 - $failedAttempts);
    $isAuth = isAuthenticated();

    echo json_encode([
        'success' => true,
        'setup_completed' => $setupDone,
        'authenticated' => $isAuth,
        'is_locked' => $isLocked,
        'attempts_left' => $attemptsLeft,
        'shop_name' => $config['shop_name'] ?? 'RAVI KANTA DOORS & HARDWARE',
        'shop_phone' => $config['shop_phone'] ?? '9019711881',
        'shop_address' => $config['shop_address'] ?? ''
    ]);
    exit;
}

// PIN Login
if ($action === 'login') {
    $pin = trim($data['pin'] ?? '');
    if (empty($pin)) {
        echo json_encode(['success' => false, 'message' => 'Please enter your PIN.']);
        exit;
    }

    $result = verifyPin($pin);
    echo json_encode($result);
    exit;
}

// Verify Master Decryption Key (Recovery)
if ($action === 'verify_recovery_key') {
    $key = trim($data['key'] ?? '');
    if (empty($key)) {
        echo json_encode(['success' => false, 'message' => 'Please enter the Decryption Key.']);
        exit;
    }

    $result = verifyDecryptionKey($key);
    echo json_encode($result);
    exit;
}

// Reset PIN with verified key
if ($action === 'reset_pin') {
    $newPin = trim($data['new_pin'] ?? '');
    $confirmPin = trim($data['confirm_pin'] ?? '');

    $result = resetPinWithKey($newPin, $confirmPin);
    echo json_encode($result);
    exit;
}

// Logout / Lock
if ($action === 'lock' || $action === 'logout') {
    lockSession();
    echo json_encode(['success' => true, 'message' => 'Session locked successfully.']);
    exit;
}

// --- ALL ACTIONS BELOW REQUIRE ACTIVE AUTHENTICATION ---
if (!isAuthenticated()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'message' => 'Authentication required. Please unlock with PIN.'
    ]);
    exit;
}

$masterKey = $_SESSION['master_key'];

// Get all estimates
if ($action === 'get_estimates') {
    $estimates = getEstimates($masterKey);
    $config = getConfig();

    echo json_encode([
        'success' => true,
        'estimates' => $estimates ?: [],
        'shop' => [
            'name' => $config['shop_name'] ?? 'RAVI KANTA DOORS & HARDWARE',
            'phone' => $config['shop_phone'] ?? '9019711881',
            'address' => $config['shop_address'] ?? ''
        ]
    ]);
    exit;
}

// Save or Update Estimate
if ($action === 'save_estimate') {
    $estimate = $data['estimate'] ?? null;
    if (!$estimate || !is_array($estimate)) {
        echo json_encode(['success' => false, 'message' => 'Invalid estimate data.']);
        exit;
    }

    // Ensure ID and Order Number exist
    if (empty($estimate['id'])) {
        $estimate['id'] = 'RKD-' . date('dmY') . '-' . rand(100, 999);
    }
    if (empty($estimate['orderNumber'])) {
        $estimate['orderNumber'] = $estimate['id'];
    }
    if (empty($estimate['orderDate'])) {
        $estimate['orderDate'] = date('Y-m-d');
    }
    $estimate['updated_at'] = date('Y-m-d H:i:s');

    $estimates = getEstimates($masterKey) ?: [];
    
    // Check if updating existing
    $found = false;
    foreach ($estimates as $idx => $item) {
        if ($item['id'] === $estimate['id']) {
            $estimates[$idx] = $estimate;
            $found = true;
            break;
        }
    }

    if (!$found) {
        array_unshift($estimates, $estimate);
    }

    $saved = saveEstimates($estimates, $masterKey);
    if ($saved) {
        echo json_encode([
            'success' => true,
            'message' => 'Estimate saved and encrypted successfully.',
            'estimate' => $estimate
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to save encrypted estimate.']);
    }
    exit;
}

// Delete Estimate
if ($action === 'delete_estimate') {
    $id = $data['id'] ?? '';
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'Estimate ID is required.']);
        exit;
    }

    $estimates = getEstimates($masterKey) ?: [];
    $filtered = array_values(array_filter($estimates, function($item) use ($id) {
        return $item['id'] !== $id;
    }));

    $saved = saveEstimates($filtered, $masterKey);
    if ($saved) {
        echo json_encode(['success' => true, 'message' => 'Estimate deleted successfully.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update database.']);
    }
    exit;
}

// Import JSON
if ($action === 'import_json') {
    $imported = $data['import_data'] ?? null;
    if (is_string($imported)) {
        $imported = json_decode($imported, true);
    }

    if (!$imported) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input.']);
        exit;
    }

    $estimates = getEstimates($masterKey) ?: [];

    // Helper to produce a completely clean, isolated party estimate
    $sanitizeParty = function($item) {
        if (!is_array($item)) return null;
        $orderId = !empty($item['orderNumber']) ? $item['orderNumber'] : (!empty($item['orderNo']) ? $item['orderNo'] : (!empty($item['estimateNo']) ? $item['estimateNo'] : (!empty($item['id']) ? $item['id'] : 'RKD-' . date('dmY') . '-' . rand(100, 999))));
        
        $partyName = trim($item['partyName'] ?? $item['party'] ?? $item['customerName'] ?? $item['customer'] ?? $item['buyer'] ?? $item['name'] ?? '');
        $partyMobile = trim($item['partyMobile'] ?? $item['mobile'] ?? $item['phone'] ?? $item['contact'] ?? '');
        $partyAddress = trim($item['partyAddress'] ?? $item['address'] ?? $item['siteAddress'] ?? $item['location'] ?? '');
        $orderPriority = $item['orderPriority'] ?? $item['priority'] ?? 'Normal';
        $orderDate = $item['orderDate'] ?? $item['date'] ?? date('Y-m-d');
        $notes = $item['notes'] ?? $item['terms'] ?? '';
        $billAmount = isset($item['billAmount']) ? (float)$item['billAmount'] : (isset($item['billAmt']) ? (float)$item['billAmt'] : (isset($item['advance']) ? (float)$item['advance'] : 0));

        // Doors sanitization
        $rawDoors = $item['doors'] ?? $item['doorItems'] ?? $item['door_items'] ?? $item['items'] ?? [];
        $cleanDoors = [];
        if (is_array($rawDoors)) {
            foreach ($rawDoors as $idx => $d) {
                if (!is_array($d)) continue;
                $cleanDoors[] = [
                    'id' => $d['id'] ?? ('door-' . (time() + $idx)),
                    'doorType' => trim($d['doorType'] ?? $d['type'] ?? $d['description'] ?? 'DOOR'),
                    'flushDoorType' => trim($d['flushDoorType'] ?? $d['flush'] ?? $d['flushSpec'] ?? ''),
                    'designNo' => trim($d['designNo'] ?? $d['design'] ?? ''),
                    'thickness' => trim($d['thickness'] ?? $d['thick'] ?? ''),
                    'height' => (float)($d['height'] ?? $d['h'] ?? 0),
                    'width' => (float)($d['width'] ?? $d['w'] ?? 0),
                    'quantity' => (int)($d['quantity'] ?? $d['qty'] ?? $d['nos'] ?? 1),
                    'rate' => (float)($d['rate'] ?? $d['price'] ?? 0),
                    'notes' => trim($d['notes'] ?? $d['remark'] ?? '')
                ];
            }
        }

        // WPC Frames sanitization - completely empty array if not in imported JSON
        $hasWpcExplicit = isset($item['hasWpcFrames']) ? (bool)$item['hasWpcFrames'] : null;
        $rawFrames = ($hasWpcExplicit === false) ? [] : ($item['wpcFrames'] ?? $item['frames'] ?? $item['wpc_frames'] ?? $item['wpc'] ?? []);
        $cleanFrames = [];
        if (is_array($rawFrames)) {
            foreach ($rawFrames as $idx => $f) {
                if (!is_array($f)) continue;
                $cleanFrames[] = [
                    'id' => $f['id'] ?? ('frame-' . (time() + $idx)),
                    'frameType' => trim($f['frameType'] ?? $f['type'] ?? $f['description'] ?? 'WPC FRAME (IVORY)'),
                    'section' => trim($f['section'] ?? $f['size'] ?? '3x2'),
                    'lengthFeet' => (float)($f['lengthFeet'] ?? $f['length'] ?? $f['len'] ?? $f['feet'] ?? 7),
                    'quantity' => (int)($f['quantity'] ?? $f['qty'] ?? $f['nos'] ?? 1),
                    'rate' => (float)($f['rate'] ?? $f['price'] ?? 0),
                    'notes' => trim($f['notes'] ?? $f['remark'] ?? '')
                ];
            }
        }

        // Other Charges
        $rawCharges = $item['otherCharges'] ?? $item['adjustments'] ?? $item['charges'] ?? [];
        $cleanCharges = [];
        if (is_array($rawCharges)) {
            foreach ($rawCharges as $idx => $c) {
                if (!is_array($c)) continue;
                $cleanCharges[] = [
                    'id' => $c['id'] ?? ('adj-' . (time() + $idx)),
                    'description' => trim($c['description'] ?? $c['desc'] ?? 'Other Charges'),
                    'type' => (($c['type'] ?? '+') === '-' ? '-' : '+'),
                    'amount' => (float)($c['amount'] ?? 0)
                ];
            }
        }

        return [
            'id' => $orderId,
            'orderNumber' => $orderId,
            'partyId' => $item['partyId'] ?? ('party-' . time()),
            'partyName' => $partyName,
            'partyMobile' => $partyMobile,
            'partyAddress' => $partyAddress,
            'orderPriority' => $orderPriority,
            'orderDate' => $orderDate,
            'isFrameOnly' => empty($cleanDoors) && !empty($cleanFrames),
            'hasWpcFrames' => count($cleanFrames) > 0,
            // Fresh arrays - zero residue from previous party
            'doors' => $cleanDoors,
            'wpcFrames' => $cleanFrames,
            'otherCharges' => $cleanCharges,
            'billAmount' => $billAmount,
            'notes' => $notes,
            'updated_at' => date('Y-m-d H:i:s')
        ];
    };

    $activeNewParty = null;
    if (isset($imported['id']) || isset($imported['partyName']) || isset($imported['party']) || isset($imported['customer']) || isset($imported['doors']) || isset($imported['wpcFrames']) || isset($imported['items'])) {
        $clean = $sanitizeParty($imported);
        if ($clean) {
            array_unshift($estimates, $clean);
            $activeNewParty = $clean;
        }
    } elseif (is_array($imported)) {
        foreach ($imported as $item) {
            $clean = $sanitizeParty($item);
            if ($clean) {
                array_unshift($estimates, $clean);
                if (!$activeNewParty) $activeNewParty = $clean;
            }
        }
    }

    saveEstimates($estimates, $masterKey);
    echo json_encode([
        'success' => true,
        'message' => 'New party data imported successfully. Old data cleared and new party rendered fresh.',
        'estimate' => $activeNewParty
    ]);
    exit;
}

// Update Shop Settings
if ($action === 'update_settings') {
    $config = getConfig();
    $config['shop_name'] = trim($data['shop_name'] ?? $config['shop_name']);
    $config['shop_phone'] = trim($data['shop_phone'] ?? $config['shop_phone']);
    $config['shop_address'] = trim($data['shop_address'] ?? $config['shop_address']);
    saveConfig($config);
    echo json_encode(['success' => true, 'message' => 'Shop settings updated.']);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Unhandled API action: ' . htmlspecialchars($action)]);
