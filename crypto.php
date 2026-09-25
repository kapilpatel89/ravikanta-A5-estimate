<?php
/**
 * Security & Encryption Helper for Estimate A5 Application
 * Implements AES-256-CBC with HMAC-SHA256 authenticated encryption.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

define('DATA_DIR', __DIR__ . '/.data');
define('CONFIG_FILE', DATA_DIR . '/config.enc.json');
define('ESTIMATES_FILE', DATA_DIR . '/estimates.enc.json');
define('PARTIES_FILE', DATA_DIR . '/parties.enc.json');

// Standard recognized Door Categories (per user requirements)
function getStandardDoorCategories() {
    return [
        'Microcoating',
        'Membrane',
        'Primer',
        'Laminate',
        'WPC',
        'UV Coating',
        'Veneer',
        'Flush Door',
        'Teak Wood'
    ];
}

// Standard recognized WPC Frame Section Sizes
function getStandardFrameSections() {
    return ['3x2', '4x2', '4x2.5', '5x2.5'];
}

// Intelligent helper to detect door category from description/type strings
function detectDoorCategory($doorType = '', $flushSpec = '', $notes = '') {
    $text = strtolower(trim(($doorType ?? '') . ' ' . ($flushSpec ?? '') . ' ' . ($notes ?? '')));
    if (strpos($text, 'micro') !== false) return 'Microcoating';
    if (strpos($text, 'uv') !== false) return 'UV Coating';
    if (strpos($text, 'membrane') !== false) return 'Membrane';
    if (strpos($text, 'primer') !== false) return 'Primer';
    if (strpos($text, 'laminat') !== false) return 'Laminate';
    if (strpos($text, 'wpc') !== false) return 'WPC';
    if (strpos($text, 'veneer') !== false) return 'Veneer';
    if (strpos($text, 'teak') !== false) return 'Teak Wood';
    if (strpos($text, 'flush') !== false) return 'Flush Door';
    return 'Other';
}


// Ensure hidden data directory exists and is protected from direct web access
function ensureDataDirectory() {
    if (!is_dir(DATA_DIR)) {
        mkdir(DATA_DIR, 0750, true);
    }
    
    // Write .htaccess to block direct browser access
    $htaccess = DATA_DIR . '/.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "Order deny,allow\nDeny from all\n");
    }
    
    // Write index.html to block directory listing
    $indexHtml = DATA_DIR . '/index.html';
    if (!file_exists($indexHtml)) {
        file_put_contents($indexHtml, "<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>Directory Access Forbidden</h1></body></html>");
    }
}

/**
 * Encrypt plaintext using AES-256-CBC and append HMAC-SHA256
 */
function encryptData($plaintext, $key) {
    if (empty($key)) {
        throw new InvalidArgumentException("Encryption key cannot be empty.");
    }
    
    // Derive encryption and authentication keys using PBKDF2
    $salt = openssl_random_pseudo_bytes(16);
    $encKey = hash_pbkdf2('sha256', $key, $salt . 'enc', 10000, 32, true);
    $hmacKey = hash_pbkdf2('sha256', $key, $salt . 'mac', 10000, 32, true);
    
    $ivLength = openssl_cipher_iv_length('aes-256-cbc');
    $iv = openssl_random_pseudo_bytes($ivLength);
    
    $ciphertext = openssl_encrypt(
        $plaintext,
        'aes-256-cbc',
        $encKey,
        OPENSSL_RAW_DATA,
        $iv
    );
    
    if ($ciphertext === false) {
        throw new RuntimeException("Encryption failed.");
    }
    
    // Calculate HMAC over salt + iv + ciphertext
    $mac = hash_hmac('sha256', $salt . $iv . $ciphertext, $hmacKey, true);
    
    // Package into base64 payload
    return base64_encode($salt . $iv . $mac . $ciphertext);
}

/**
 * Decrypt payload using AES-256-CBC after verifying HMAC-SHA256
 */
function decryptData($payload, $key) {
    if (empty($key)) {
        throw new InvalidArgumentException("Decryption key cannot be empty.");
    }
    
    $decoded = base64_decode($payload, true);
    if ($decoded === false) {
        return false;
    }
    
    $salt = substr($decoded, 0, 16);
    $ivLength = openssl_cipher_iv_length('aes-256-cbc');
    $iv = substr($decoded, 16, $ivLength);
    $mac = substr($decoded, 16 + $ivLength, 32);
    $ciphertext = substr($decoded, 16 + $ivLength + 32);
    
    // Derive keys
    $encKey = hash_pbkdf2('sha256', $key, $salt . 'enc', 10000, 32, true);
    $hmacKey = hash_pbkdf2('sha256', $key, $salt . 'mac', 10000, 32, true);
    
    // Verify HMAC timing-safe
    $expectedMac = hash_hmac('sha256', $salt . $iv . $ciphertext, $hmacKey, true);
    if (!hash_equals($mac, $expectedMac)) {
        return false; // Tampered or wrong key
    }
    
    $decrypted = openssl_decrypt(
        $ciphertext,
        'aes-256-cbc',
        $encKey,
        OPENSSL_RAW_DATA,
        $iv
    );
    
    return $decrypted;
}

/**
 * Check if initial setup is completed
 */
function isSetupCompleted() {
    ensureDataDirectory();
    return file_exists(CONFIG_FILE);
}

/**
 * Read configuration
 */
function getConfig() {
    if (!isSetupCompleted()) {
        return null;
    }
    $content = file_get_contents(CONFIG_FILE);
    if (!$content) return null;
    return json_decode($content, true);
}

/**
 * Save configuration
 */
function saveConfig($config) {
    ensureDataDirectory();
    return file_put_contents(CONFIG_FILE, json_encode($config, JSON_PRETTY_PRINT)) !== false;
}

/**
 * Get Decrypted Estimates
 */
function getEstimates($masterKey) {
    ensureDataDirectory();
    if (!file_exists(ESTIMATES_FILE)) {
        return [];
    }
    $encData = file_get_contents(ESTIMATES_FILE);
    if (empty($encData)) {
        return [];
    }
    $json = decryptData($encData, $masterKey);
    if ($json === false) {
        return null; // Decryption failure
    }
    return json_decode($json, true) ?: [];
}

/**
 * Save Encrypted Estimates
 */
function saveEstimates($estimates, $masterKey) {
    ensureDataDirectory();
    $json = json_encode($estimates, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $enc = encryptData($json, $masterKey);
    return file_put_contents(ESTIMATES_FILE, $enc) !== false;
}

/**
 * Get Decrypted Parties Master List
 */
function getParties($masterKey) {
    ensureDataDirectory();
    if (!file_exists(PARTIES_FILE)) {
        return seedPartiesFromEstimates($masterKey);
    }
    $encData = file_get_contents(PARTIES_FILE);
    if (empty($encData)) {
        return seedPartiesFromEstimates($masterKey);
    }
    $json = decryptData($encData, $masterKey);
    if ($json === false) {
        return [];
    }
    $parties = json_decode($json, true);
    return is_array($parties) ? $parties : [];
}

/**
 * Save Encrypted Parties Master List
 */
function saveParties($parties, $masterKey) {
    ensureDataDirectory();
    $json = json_encode($parties, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $enc = encryptData($json, $masterKey);
    return file_put_contents(PARTIES_FILE, $enc) !== false;
}

/**
 * Auto-Seed Party Directory and Rates from Historical Estimates & Default Sample
 */
function seedPartiesFromEstimates($masterKey) {
    $parties = [];
    $estimates = getEstimates($masterKey) ?: [];

    // Ensure RK-KISHAN baseline exists with realistic sample rates
    $rkKishan = [
        'id' => 'party-rk-kishan',
        'partyName' => 'RK-KISHAN',
        'partyMobile' => '9019711881',
        'partyAddress' => '',
        'doorRates' => [
            'Microcoating' => 180,
            'Membrane' => 195,
            'Primer' => 125,
            'Laminate' => 250,
            'WPC' => 140,
            'UV Coating' => 220,
            'Veneer' => 320,
            'Flush Door' => 110,
            'Teak Wood' => 450
        ],
        'frameRates' => [
            '3x2' => 65,
            '4x2' => 125,
            '4x2.5' => 145,
            '5x2.5' => 180
        ],
        'notes' => 'Primary verified party with custom price card',
        'lastOrderDate' => '2026-09-24',
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
    $parties[] = $rkKishan;

    // Scan any existing estimates to extract other parties and their actual rates
    foreach ($estimates as $est) {
        $name = trim($est['partyName'] ?? '');
        if (empty($name)) continue;

        // Find or create
        $foundIdx = -1;
        foreach ($parties as $idx => $p) {
            if (strcasecmp($p['partyName'], $name) === 0) {
                $foundIdx = $idx;
                break;
            }
        }

        if ($foundIdx === -1) {
            $parties[] = [
                'id' => 'party-' . substr(md5($name), 0, 10),
                'partyName' => $name,
                'partyMobile' => trim($est['partyMobile'] ?? ''),
                'partyAddress' => trim($est['partyAddress'] ?? ''),
                'doorRates' => [],
                'frameRates' => [],
                'notes' => '',
                'lastOrderDate' => $est['orderDate'] ?? date('Y-m-d'),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
            $foundIdx = count($parties) - 1;
        }

        // Update mobile/address if empty
        if (!empty($est['partyMobile']) && empty($parties[$foundIdx]['partyMobile'])) {
            $parties[$foundIdx]['partyMobile'] = trim($est['partyMobile']);
        }
        if (!empty($est['partyAddress']) && empty($parties[$foundIdx]['partyAddress'])) {
            $parties[$foundIdx]['partyAddress'] = trim($est['partyAddress']);
        }

        // Collect door rates
        foreach (($est['doors'] ?? []) as $d) {
            $cat = detectDoorCategory($d['doorType'] ?? '', $d['flushDoorType'] ?? '', $d['notes'] ?? '');
            $rate = (float)($d['rate'] ?? 0);
            if ($rate > 0) {
                $parties[$foundIdx]['doorRates'][$cat] = $rate;
            }
        }

        // Collect frame rates
        foreach (($est['wpcFrames'] ?? []) as $f) {
            $sec = trim($f['section'] ?? '3x2');
            $rate = (float)($f['rate'] ?? 0);
            if ($rate > 0 && !empty($sec)) {
                $parties[$foundIdx]['frameRates'][$sec] = $rate;
            }
        }

        if (!empty($est['orderDate'])) {
            $parties[$foundIdx]['lastOrderDate'] = $est['orderDate'];
        }
    }

    saveParties($parties, $masterKey);
    return $parties;
}

/**
 * Upsert Party Profile and Custom Price Sheet
 */
function upsertPartyRecord($partyData, $masterKey) {
    $parties = getParties($masterKey);
    $name = trim($partyData['partyName'] ?? '');
    if (empty($name)) {
        return false;
    }

    $foundIdx = -1;
    foreach ($parties as $idx => $p) {
        if (strcasecmp($p['partyName'], $name) === 0) {
            $foundIdx = $idx;
            break;
        }
    }

    $now = date('Y-m-d H:i:s');
    if ($foundIdx !== -1) {
        // Update existing party
        if (!empty($partyData['partyMobile'])) {
            $parties[$foundIdx]['partyMobile'] = trim($partyData['partyMobile']);
        }
        if (isset($partyData['partyAddress'])) {
            $parties[$foundIdx]['partyAddress'] = trim($partyData['partyAddress']);
        }
        if (isset($partyData['notes'])) {
            $parties[$foundIdx]['notes'] = trim($partyData['notes']);
        }
        if (!empty($partyData['orderDate'])) {
            $parties[$foundIdx]['lastOrderDate'] = $partyData['orderDate'];
        }

        // Merge door rates
        if (!empty($partyData['doorRates']) && is_array($partyData['doorRates'])) {
            foreach ($partyData['doorRates'] as $cat => $rate) {
                $r = (float)$rate;
                if ($r > 0) {
                    $parties[$foundIdx]['doorRates'][$cat] = $r;
                }
            }
        }

        // Merge frame rates
        if (!empty($partyData['frameRates']) && is_array($partyData['frameRates'])) {
            foreach ($partyData['frameRates'] as $sec => $rate) {
                $r = (float)$rate;
                if ($r > 0) {
                    $parties[$foundIdx]['frameRates'][$sec] = $r;
                }
            }
        }

        $parties[$foundIdx]['updated_at'] = $now;
        $activeParty = $parties[$foundIdx];
    } else {
        // Create new party
        $newParty = [
            'id' => $partyData['id'] ?? ('party-' . time() . '-' . rand(100, 999)),
            'partyName' => $name,
            'partyMobile' => trim($partyData['partyMobile'] ?? ''),
            'partyAddress' => trim($partyData['partyAddress'] ?? ''),
            'doorRates' => is_array($partyData['doorRates'] ?? null) ? $partyData['doorRates'] : [],
            'frameRates' => is_array($partyData['frameRates'] ?? null) ? $partyData['frameRates'] : [],
            'notes' => trim($partyData['notes'] ?? ''),
            'lastOrderDate' => $partyData['orderDate'] ?? date('Y-m-d'),
            'created_at' => $now,
            'updated_at' => $now
        ];
        array_unshift($parties, $newParty);
        $activeParty = $newParty;
    }

    saveParties($parties, $masterKey);
    return $activeParty;
}


/**
 * Verify PIN password
 * Returns associative array:
 * ['success' => bool, 'locked' => bool, 'attempts_left' => int, 'message' => string]
 */
function verifyPin($inputPin) {
    $config = getConfig();
    if (!$config) {
        return ['success' => false, 'locked' => false, 'attempts_left' => 0, 'message' => 'System not setup yet.'];
    }

    if (!empty($config['is_locked'])) {
        return [
            'success' => false,
            'locked' => true,
            'attempts_left' => 0,
            'message' => 'PIN is locked due to 3 consecutive wrong attempts. Please enter Decryption Key to reset password.'
        ];
    }

    $failedAttempts = isset($config['failed_attempts']) ? (int)$config['failed_attempts'] : 0;

    if (password_verify($inputPin, $config['pin_hash'])) {
        // Success: Reset failed attempts
        $config['failed_attempts'] = 0;
        $config['is_locked'] = false;
        saveConfig($config);

        // Store session authentication
        $_SESSION['authenticated'] = true;
        $_SESSION['auth_time'] = time();

        // Retrieve master key using stored key encrypted with PIN or stored securely
        // We use master_key_enc which was encrypted with PIN during setup
        $masterKey = decryptData($config['master_key_enc'], $inputPin);
        if ($masterKey !== false) {
            $_SESSION['master_key'] = $masterKey;
        }

        return ['success' => true, 'locked' => false, 'attempts_left' => 3, 'message' => 'PIN verified successfully.'];
    } else {
        $failedAttempts++;
        $config['failed_attempts'] = $failedAttempts;
        $locked = false;

        if ($failedAttempts >= 3) {
            $config['is_locked'] = true;
            $locked = true;
        }
        saveConfig($config);

        $attemptsLeft = max(0, 3 - $failedAttempts);
        return [
            'success' => false,
            'locked' => $locked,
            'attempts_left' => $attemptsLeft,
            'message' => $locked
                ? 'PIN entry locked! 3 consecutive failed attempts. Decryption Key required.'
                : "Incorrect PIN. {$attemptsLeft} attempt(s) remaining."
        ];
    }
}

/**
 * Verify Decryption / Master Key
 */
function verifyDecryptionKey($inputKey) {
    $config = getConfig();
    if (!$config) {
        return ['success' => false, 'message' => 'Config not found.'];
    }

    $cleanKey = trim($inputKey);
    if (empty($cleanKey)) {
        return ['success' => false, 'message' => 'Decryption Key cannot be empty.'];
    }

    // Verify key against the stored key hash
    if (password_verify($cleanKey, $config['master_key_hash'])) {
        // Issue a temporary reset token in session
        $_SESSION['reset_authorized'] = true;
        $_SESSION['temp_master_key'] = $cleanKey;
        return ['success' => true, 'message' => 'Decryption Key verified. You can now reset your PIN.'];
    }

    return ['success' => false, 'message' => 'Invalid Decryption Key. Please check your backup and try again.'];
}

/**
 * Reset PIN using the verified Decryption Key
 */
function resetPinWithKey($newPin, $confirmedPin) {
    if (empty($_SESSION['reset_authorized']) || empty($_SESSION['temp_master_key'])) {
        return ['success' => false, 'message' => 'Reset authorization expired. Please verify Decryption Key again.'];
    }

    if (strlen($newPin) < 4) {
        return ['success' => false, 'message' => 'PIN must be at least 4 digits.'];
    }

    if ($newPin !== $confirmedPin) {
        return ['success' => false, 'message' => 'New PIN and Confirm PIN do not match.'];
    }

    $config = getConfig();
    $masterKey = $_SESSION['temp_master_key'];

    // Update config
    $config['pin_hash'] = password_hash($newPin, PASSWORD_BCRYPT);
    $config['master_key_enc'] = encryptData($masterKey, $newPin);
    $config['failed_attempts'] = 0;
    $config['is_locked'] = false;
    $config['last_pin_reset'] = date('Y-m-d H:i:s');

    saveConfig($config);

    // Auto-login with the newly set PIN
    $_SESSION['authenticated'] = true;
    $_SESSION['master_key'] = $masterKey;
    unset($_SESSION['reset_authorized']);
    unset($_SESSION['temp_master_key']);

    return ['success' => true, 'message' => 'PIN reset successfully! You are now logged in.'];
}

/**
 * Check if current session is authenticated
 */
function isAuthenticated() {
    return !empty($_SESSION['authenticated']) && !empty($_SESSION['master_key']);
}

/**
 * Lock session / Logout
 */
function lockSession() {
    $_SESSION['authenticated'] = false;
    unset($_SESSION['master_key']);
    session_destroy();
}
