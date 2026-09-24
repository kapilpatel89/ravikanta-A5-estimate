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
