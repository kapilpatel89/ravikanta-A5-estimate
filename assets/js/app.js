/**
 * A5 Estimate System - Interactive Core Logic & Encrypted API Bridge
 */

// Global State
let activeEstimate = null;
let savedEstimatesList = [];
let memorizedParties = [];
let activePartyPricing = null;
let selectedModalPartyId = null;

let shopConfig = {
    name: 'RAVI KANTA DOORS & HARDWARE',
    phone: '9019711881',
    address: ''
};

// Recognized Door Categories (per user requirements)
const STANDARD_DOOR_CATEGORIES = [
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

// Recognized WPC Frame Sections
const STANDARD_FRAME_SECTIONS = ['3x2', '4x2', '4x2.5', '5x2.5'];

// Intelligent category detector
function detectDoorCategoryJs(doorType, flushSpec, notes) {
    const text = ((doorType || '') + ' ' + (flushSpec || '') + ' ' + (notes || '')).toLowerCase();
    if (text.includes('micro')) return 'Microcoating';
    if (text.includes('uv')) return 'UV Coating';
    if (text.includes('membrane')) return 'Membrane';
    if (text.includes('primer')) return 'Primer';
    if (text.includes('laminat')) return 'Laminate';
    if (text.includes('wpc')) return 'WPC';
    if (text.includes('veneer')) return 'Veneer';
    if (text.includes('teak')) return 'Teak Wood';
    if (text.includes('flush')) return 'Flush Door';
    return 'Laminate';
}

// Default sample data provided by the user
const SAMPLE_ESTIMATE_DATA = {
    "id": "RKD-24092026-168",
    "orderNumber": "RKD-24092026-168",
    "partyId": "party-1790140529619",
    "partyName": "RK-KISHAN",
    "partyMobile": "9019711881",
    "partyAddress": "",
    "orderPriority": "Normal",
    "orderDate": "2026-09-24",
    "doors": [

        {
            "id": "door-1",
            "doorType": "PRIMER  COATED  DOOR",
            "flushDoorType": "PINE FRAME -SC (INSIDE  PARTICAL)",
            "designNo": "WS-17",
            "thickness": "38MM",
            "height": 79,
            "width": 39,
            "quantity": 2,
            "rate": 125,
            "notes": "NO CHANGES"
        },
        {
            "id": "door-2",
            "doorType": "PRIMER  COATED  DOOR",
            "flushDoorType": "PINE FRAME -SC (INSIDE  PARTICAL)",
            "designNo": "WS-17",
            "thickness": "38MM",
            "height": 79,
            "width": 38,
            "quantity": 3,
            "rate": 125,
            "notes": "NO CHANGES"
        },
        {
            "id": "door-3",
            "doorType": "PRIMER  COATED  DOOR",
            "flushDoorType": "PINE  FRAME -SC (INSIDE  PARTICAL)",
            "designNo": "WS-17",
            "thickness": "38MM",
            "height": 79,
            "width": 32,
            "quantity": 2,
            "rate": 125,
            "notes": ""
        },
        {
            "id": "door-4",
            "doorType": "PRIMER  COATED  DOOR",
            "flushDoorType": "PINE FRAME -DC(INSIDE  HW)",
            "designNo": "WP-82",
            "thickness": "30 MM",
            "height": 81,
            "width": 32,
            "quantity": 6,
            "rate": 110,
            "notes": "NO CHANGES"
        },
        {
            "id": "door-5",
            "doorType": "30MM WPC GROVE",
            "flushDoorType": "30MM  WPC (IVORY)",
            "designNo": "WP-82",
            "thickness": "30 MM",
            "height": 78,
            "width": 27.5,
            "quantity": 5,
            "rate": 140,
            "notes": "GROW"
        },
        {
            "id": "door-6",
            "doorType": "30MM WPC GROVE",
            "flushDoorType": "30MM  WPC (IVORY)",
            "designNo": "WP-82",
            "thickness": "30 MM",
            "height": 78,
            "width": 29,
            "quantity": 2,
            "rate": 140,
            "notes": "GROW"
        }
    ],
    "wpcFrames": [
        {
            "id": "frame-1",
            "frameType": "WPC  FRAME (IVORY)-(A)",
            "section": "3x2",
            "lengthFeet": 7,
            "quantity": 14,
            "rate": 65,
            "notes": ""
        },
        {
            "id": "frame-2",
            "frameType": "WPC  FRAME (IVORY)-(B)",
            "section": "3x2",
            "lengthFeet": 3,
            "quantity": 7,
            "rate": 65,
            "notes": ""
        }
    ],
    "otherCharges": [
        {
            "id": "adj-1",
            "description": "Other Charges (Transport / Extra)",
            "type": "+",
            "amount": 500
        }
    ],
    "billAmount": 300,
    "notes": "Estimate valid for 15 days. Payment terms: 50% advance."
};

// Document Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
    checkAppStatus();

    // Enter key submit on PIN input
    const pinInput = document.getElementById('inputPin');
    if (pinInput) {
        pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitPin();
            }
        });
    }

    // Enter key on recovery input
    const recoveryInput = document.getElementById('recoveryKeyInput');
    if (recoveryInput) {
        recoveryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitRecoveryKey();
            }
        });
    }
});

/**
 * Check Authentication & App Status via API
 */
async function checkAppStatus() {
    try {
        const res = await fetch('api.php?action=status');
        const data = await res.json();

        if (data.shop_name) shopConfig.name = data.shop_name;
        if (data.shop_phone) shopConfig.phone = data.shop_phone;
        if (data.shop_address) shopConfig.address = data.shop_address;

        if (data.is_locked) {
            switchToRecoveryMode();
        } else if (data.attempts_left !== undefined) {
            updateAttemptsUI(data.attempts_left);
        }

        if (data.authenticated) {
            document.getElementById('lockScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            loadEstimates();
        }
    } catch (err) {
        console.error('Status check error:', err);
    }
}

/* ========================================================
   PIN & RECOVERY AUTHENTICATION LOGIC
   ======================================================== */

function appendPin(digit) {
    const input = document.getElementById('inputPin');
    if (input.value.length < 8) {
        input.value += digit;
    }
}

function clearPin() {
    document.getElementById('inputPin').value = '';
}

function backspacePin() {
    const input = document.getElementById('inputPin');
    input.value = input.value.slice(0, -1);
}

function togglePassword(id) {
    const el = document.getElementById(id);
    el.type = el.type === 'password' ? 'text' : 'password';
}

function updateAttemptsUI(attemptsLeft) {
    const badge = document.getElementById('attemptsIndicator');
    const text = document.getElementById('attemptsText');
    if (!badge || !text) return;

    text.innerText = `${attemptsLeft} attempt(s) remaining`;
    badge.className = 'attempts-badge ' + (attemptsLeft <= 1 ? 'danger' : (attemptsLeft === 2 ? 'warning' : 'ok'));
}

async function submitPin() {
    const pin = document.getElementById('inputPin').value.trim();
    const alertBox = document.getElementById('pinAlertBox');

    if (!pin) {
        showAlert(alertBox, 'Please enter your PIN.', 'danger');
        return;
    }

    try {
        const res = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', pin })
        });
        const data = await res.json();

        if (data.success) {
            // Unlock success
            document.getElementById('lockScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            clearPin();
            loadEstimates();
        } else {
            // Incorrect PIN
            if (data.attempts_left !== undefined) {
                updateAttemptsUI(data.attempts_left);
            }

            if (data.locked) {
                switchToRecoveryMode();
            } else {
                showAlert(alertBox, data.message || 'Incorrect PIN.', 'danger');
                clearPin();
            }
        }
    } catch (err) {
        showAlert(alertBox, 'Network error. Try again.', 'danger');
    }
}

function switchToRecoveryMode() {
    document.getElementById('pinModeSection').style.display = 'none';
    document.getElementById('recoveryModeSection').style.display = 'block';
    document.getElementById('resetPinSection').style.display = 'none';
}

function switchToPinMode() {
    document.getElementById('pinModeSection').style.display = 'block';
    document.getElementById('recoveryModeSection').style.display = 'none';
    document.getElementById('resetPinSection').style.display = 'none';
}

async function submitRecoveryKey() {
    const key = document.getElementById('recoveryKeyInput').value.trim();
    const alertBox = document.getElementById('recoveryAlertBox');

    if (!key) {
        showAlert(alertBox, 'Please enter the Decryption Key.', 'danger');
        return;
    }

    try {
        const res = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_recovery_key', key })
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('recoveryModeSection').style.display = 'none';
            document.getElementById('resetPinSection').style.display = 'block';
        } else {
            showAlert(alertBox, data.message || 'Invalid Decryption Key.', 'danger');
        }
    } catch (err) {
        showAlert(alertBox, 'Network error. Try again.', 'danger');
    }
}

async function submitNewPin() {
    const newPin = document.getElementById('newPinInput').value.trim();
    const confirmPin = document.getElementById('confirmNewPinInput').value.trim();
    const alertBox = document.getElementById('resetPinAlertBox');

    if (newPin.length < 4) {
        showAlert(alertBox, 'PIN must be at least 4 digits.', 'danger');
        return;
    }
    if (newPin !== confirmPin) {
        showAlert(alertBox, 'PIN and Confirm PIN do not match.', 'danger');
        return;
    }

    try {
        const res = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset_pin', new_pin: newPin, confirm_pin: confirmPin })
        });
        const data = await res.json();

        if (data.success) {
            alert('PIN reset successful! You are now logged in.');
            document.getElementById('lockScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            switchToPinMode();
            loadEstimates();
        } else {
            showAlert(alertBox, data.message || 'Failed to reset PIN.', 'danger');
        }
    } catch (err) {
        showAlert(alertBox, 'Network error. Try again.', 'danger');
    }
}

async function lockApp() {
    try {
        await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'lock' })
        });
    } catch (e) {}

    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('lockScreen').style.display = 'flex';
    clearPin();
    switchToPinMode();
    checkAppStatus();
}

function showAlert(container, msg, type = 'danger') {
    container.style.display = 'block';
    container.className = type === 'danger' ? 'alert-danger' : 'alert-success';
    container.innerText = msg;
}

/* ========================================================
   PARTY MASTER & PARTY-WISE CUSTOM PRICING ENGINE
   ======================================================== */

async function loadParties() {
    try {
        const res = await fetch('api.php?action=get_parties');
        const data = await res.json();
        if (data.success && Array.isArray(data.parties)) {
            memorizedParties = data.parties;
            updatePartySuggestionsDatalist();
            if (activeEstimate && activeEstimate.partyName) {
                updateActivePartyContext(activeEstimate.partyName);
            }
        }
    } catch (err) {
        console.error('Failed to load parties:', err);
    }
}

function updatePartySuggestionsDatalist() {
    const dl = document.getElementById('partySuggestionsList');
    if (!dl) return;
    dl.innerHTML = '';
    memorizedParties.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.partyName;
        const dCount = Object.keys(p.doorRates || {}).length;
        const fCount = Object.keys(p.frameRates || {}).length;
        opt.label = `${p.partyMobile ? p.partyMobile + ' • ' : ''}${dCount} Door rates, ${fCount} Frame rates`;
        dl.appendChild(opt);
    });
}

function updateActivePartyContext(partyName) {
    const clean = (partyName || '').trim();
    if (!clean) {
        activePartyPricing = null;
        updatePartyBadge(null);
        return;
    }

    const matched = memorizedParties.find(p => p.partyName.toLowerCase() === clean.toLowerCase());
    if (matched) {
        activePartyPricing = matched;
        updatePartyBadge(matched);
    } else {
        activePartyPricing = {
            partyName: clean,
            partyMobile: document.getElementById('partyMobile') ? document.getElementById('partyMobile').value.trim() : '',
            partyAddress: document.getElementById('partyAddress') ? document.getElementById('partyAddress').value.trim() : '',
            doorRates: {},
            frameRates: {}
        };
        updatePartyBadge(null, clean);
    }
}

function updatePartyBadge(party, newPartyName = null) {
    const badgeEl = document.getElementById('activePartyRateBadge');
    if (!badgeEl) return;

    if (party) {
        const dCount = Object.keys(party.doorRates || {}).length;
        const fCount = Object.keys(party.frameRates || {}).length;
        badgeEl.style.display = 'inline-flex';
        badgeEl.className = 'party-rate-badge';
        badgeEl.innerHTML = `
            <span class="badge-tag">SAVED PARTY</span>
            <span>⭐ <strong>${escapeHtml(party.partyName)}</strong>: ${dCount} Door rates &amp; ${fCount} Frame rates memorized</span>
            <button type="button" class="btn-link" style="margin-left:4px; font-size:11px; text-decoration:underline; background:none; border:none; color:inherit; cursor:pointer;" onclick="openPartiesModal('${party.id}')">View Rates</button>
        `;
    } else if (newPartyName) {
        badgeEl.style.display = 'inline-flex';
        badgeEl.className = 'party-rate-badge new';
        badgeEl.innerHTML = `
            <span class="badge-tag" style="background:#16a34a;">NEW PARTY</span>
            <span>✨ <strong>${escapeHtml(newPartyName)}</strong> will be memorized with these rates on save</span>
        `;
    } else {
        badgeEl.style.display = 'none';
        badgeEl.innerHTML = '';
    }
}

function onPartyNameInput(val) {
    updateActivePartyContext(val);
}

function onPartyNameSelected(val) {
    const clean = (val || '').trim();
    if (!clean) return;

    const matched = memorizedParties.find(p => p.partyName.toLowerCase() === clean.toLowerCase());
    if (matched) {
        if (matched.partyMobile) {
            document.getElementById('partyMobile').value = matched.partyMobile;
            if (activeEstimate) activeEstimate.partyMobile = matched.partyMobile;
        }
        if (matched.partyAddress) {
            document.getElementById('partyAddress').value = matched.partyAddress;
            if (activeEstimate) activeEstimate.partyAddress = matched.partyAddress;
        }
        updateActivePartyContext(clean);

        // Auto-apply this party's memorized prices to active doors and frames
        let ratesUpdated = false;
        if (activeEstimate && activeEstimate.doors) {
            activeEstimate.doors.forEach(d => {
                const cat = d.category || detectDoorCategoryJs(d.doorType, d.flushDoorType, d.notes);
                d.category = cat;
                if (matched.doorRates && matched.doorRates[cat] !== undefined) {
                    d.rate = matched.doorRates[cat];
                    ratesUpdated = true;
                }
            });
        }
        if (activeEstimate && activeEstimate.wpcFrames) {
            activeEstimate.wpcFrames.forEach(f => {
                const sec = f.section || '3x2';
                if (matched.frameRates && matched.frameRates[sec] !== undefined) {
                    f.rate = matched.frameRates[sec];
                    ratesUpdated = true;
                }
            });
        }

        if (ratesUpdated) {
            renderDoorsTable();
            renderFramesTable();
            calculateAll();
            syncA5PrintArea();
        }
    } else {
        updateActivePartyContext(clean);
    }
}

function getPartyDoorRate(category) {
    if (!category) return 0;
    if (activePartyPricing && activePartyPricing.doorRates && activePartyPricing.doorRates[category] !== undefined) {
        return activePartyPricing.doorRates[category];
    }
    const defaults = {
        'Primer': 125,
        'Laminate': 250,
        'Membrane': 195,
        'Microcoating': 180,
        'WPC': 140,
        'UV Coating': 220,
        'Veneer': 320,
        'Flush Door': 110,
        'Teak Wood': 450
    };
    return defaults[category] || 0;
}

function getPartyFrameRate(section) {
    if (!section) return 65;
    if (activePartyPricing && activePartyPricing.frameRates && activePartyPricing.frameRates[section] !== undefined) {
        return activePartyPricing.frameRates[section];
    }
    const defaults = {
        '3x2': 65,
        '4x2': 125,
        '4x2.5': 145,
        '5x2.5': 180
    };
    return defaults[section] || 65;
}

function setPartyDoorRateInMemory(category, rate) {
    if (!category || rate <= 0) return;
    if (!activePartyPricing) {
        activePartyPricing = {
            partyName: document.getElementById('partyName').value.trim(),
            doorRates: {},
            frameRates: {}
        };
    }
    if (!activePartyPricing.doorRates) activePartyPricing.doorRates = {};
    activePartyPricing.doorRates[category] = parseFloat(rate) || 0;
}

function setPartyFrameRateInMemory(section, rate) {
    if (!section || rate <= 0) return;
    if (!activePartyPricing) {
        activePartyPricing = {
            partyName: document.getElementById('partyName').value.trim(),
            doorRates: {},
            frameRates: {}
        };
    }
    if (!activePartyPricing.frameRates) activePartyPricing.frameRates = {};
    activePartyPricing.frameRates[section] = parseFloat(rate) || 0;
}

/* ========================================================
   ESTIMATE DATA MANAGEMENT (DYNAMIC FORMS & CALCULATIONS)
   ======================================================== */

async function refreshSavedEstimatesList() {
    try {
        const res = await fetch('api.php?action=get_estimates');
        const data = await res.json();

        if (data.success) {
            savedEstimatesList = data.estimates || [];
            if (data.shop) {
                shopConfig = data.shop;
            }
            updateSavedCountBadge();
        }
    } catch (err) {
        console.error('Error refreshing estimates:', err);
    }
}

async function loadEstimates() {
    await Promise.all([
        refreshSavedEstimatesList(),
        loadParties()
    ]);
    // Load the most recent estimate or sample
    if (savedEstimatesList.length > 0) {
        loadEstimateIntoForm(savedEstimatesList[0]);
    } else {
        loadEstimateIntoForm(SAMPLE_ESTIMATE_DATA);
    }
}

function updateSavedCountBadge() {
    const badge = document.getElementById('savedCountBadge');
    if (badge) {
        badge.innerText = savedEstimatesList.length;
    }
}

function createNewEstimate() {
    const newId = 'RKD-' + formatDateCompact(new Date()) + '-' + Math.floor(100 + Math.random() * 900);
    const newEstimate = {
        id: newId,
        orderNumber: newId,
        partyName: '',
        partyMobile: '',
        partyAddress: '',
        orderPriority: 'Normal',
        orderDate: new Date().toISOString().split('T')[0],
        doors: [
            {
                id: 'door-' + Date.now(),
                category: 'Primer',
                doorType: 'PRIMER COATED DOOR',
                flushDoorType: 'PINE FRAME -SC (INSIDE PARTICAL)',
                designNo: 'WS-17',
                thickness: '38MM',
                height: 79,
                width: 39,
                quantity: 1,
                rate: getPartyDoorRate('Primer') || 125,
                notes: ''
            }
        ],
        wpcFrames: [], // Clean slate: no WPC by default for new party
        otherCharges: [],
        billAmount: 0,
        notes: ''
    };

    loadEstimateIntoForm(newEstimate);
}

function loadSampleDataPrompt() {
    if (confirm('Load sample order data (RK-KISHAN - 20 Doors & 21 WPC Frames)?')) {
        loadEstimateIntoForm(JSON.parse(JSON.stringify(SAMPLE_ESTIMATE_DATA)));
    }
}

function loadEstimateIntoForm(est) {
    if (!est) return;

    // Build completely clean object - ZERO lingering data from previous party!
    const cleanOrderNumber = est.orderNumber || est.orderNo || est.estimateNo || est.id || ('RKD-' + formatDateCompact(new Date()) + '-' + Math.floor(100 + Math.random() * 900));
    const cleanPartyName = est.partyName || est.party || est.customerName || est.customer || est.buyer || est.name || '';
    const cleanPartyMobile = est.partyMobile || est.mobile || est.phone || est.contact || '';
    const cleanPartyAddress = est.partyAddress || est.address || est.siteAddress || est.location || '';
    const cleanOrderDate = est.orderDate || est.date || new Date().toISOString().split('T')[0];
    const cleanPriority = est.orderPriority || est.priority || 'Normal';
    const cleanNotes = est.notes || est.terms || '';
    const cleanBillAmount = parseFloat(est.billAmount !== undefined ? est.billAmount : (est.billAmt !== undefined ? est.billAmt : (est.advance !== undefined ? est.advance : 0))) || 0;

    // Doors: strict new array with categories
    const rawDoors = est.doors || est.doorItems || est.door_items || est.items || [];
    const cleanDoors = Array.isArray(rawDoors) ? rawDoors.map((d, i) => {
        const doorType = d.doorType || d.type || d.description || 'DOOR';
        const flushSpec = d.flushDoorType || d.flush || d.flushSpec || '';
        const notes = d.notes || d.remark || '';
        const category = d.category || detectDoorCategoryJs(doorType, flushSpec, notes);
        return {
            id: d.id || ('door-' + (Date.now() + i)),
            category: category,
            doorType: doorType,
            flushDoorType: flushSpec,
            designNo: d.designNo || d.design || '',
            thickness: d.thickness || d.thick || '',
            height: parseFloat(d.height !== undefined ? d.height : (d.h !== undefined ? d.h : 0)) || 0,
            width: parseFloat(d.width !== undefined ? d.width : (d.w !== undefined ? d.w : 0)) || 0,
            quantity: parseInt(d.quantity !== undefined ? d.quantity : (d.qty !== undefined ? d.qty : (d.nos !== undefined ? d.nos : 1))) || 0,
            rate: parseFloat(d.rate !== undefined ? d.rate : (d.price !== undefined ? d.price : 0)) || 0,
            notes: notes
        };
    }) : [];

    // WPC Frames: if not present in new party, completely empty array!
    const rawFrames = (est.hasWpcFrames === false) ? [] : (est.wpcFrames || est.frames || est.wpc_frames || est.wpc || []);
    const cleanFrames = Array.isArray(rawFrames) ? rawFrames.map((f, i) => ({
        id: f.id || ('frame-' + (Date.now() + i)),
        frameType: f.frameType || f.type || f.description || 'WPC FRAME (IVORY)',
        section: f.section || f.size || '3x2',
        lengthFeet: parseFloat(f.lengthFeet !== undefined ? f.lengthFeet : (f.length !== undefined ? f.length : (f.len !== undefined ? f.len : (f.feet !== undefined ? f.feet : 7)))) || 0,
        quantity: parseInt(f.quantity !== undefined ? f.quantity : (f.qty !== undefined ? f.qty : (f.nos !== undefined ? f.nos : 1))) || 0,
        rate: parseFloat(f.rate !== undefined ? f.rate : (f.price !== undefined ? f.price : 0)) || 0,
        notes: f.notes || f.remark || ''
    })) : [];

    // Other Charges
    const rawCharges = est.otherCharges || est.adjustments || est.charges || [];
    const cleanCharges = Array.isArray(rawCharges) ? rawCharges.map((c, i) => ({
        id: c.id || ('adj-' + (Date.now() + i)),
        description: c.description || c.desc || 'Other Charges',
        type: (c.type === '-' ? '-' : '+'),
        amount: parseFloat(c.amount !== undefined ? c.amount : 0) || 0
    })) : [];

    activeEstimate = {
        id: cleanOrderNumber,
        orderNumber: cleanOrderNumber,
        partyName: cleanPartyName,
        partyMobile: cleanPartyMobile,
        partyAddress: cleanPartyAddress,
        orderPriority: cleanPriority,
        orderDate: cleanOrderDate,
        notes: cleanNotes,
        billAmount: cleanBillAmount,
        doors: cleanDoors,
        wpcFrames: cleanFrames,
        otherCharges: cleanCharges
    };

    // Fill Header
    document.getElementById('orderNumber').value = activeEstimate.orderNumber;
    document.getElementById('orderDate').value = activeEstimate.orderDate;
    document.getElementById('partyName').value = activeEstimate.partyName;
    document.getElementById('partyMobile').value = activeEstimate.partyMobile;
    document.getElementById('partyAddress').value = activeEstimate.partyAddress;
    document.getElementById('orderPriority').value = activeEstimate.orderPriority;
    document.getElementById('estimateNotes').value = activeEstimate.notes;
    document.getElementById('billAmount').value = activeEstimate.billAmount;

    document.getElementById('activeOrderBadge').innerText = activeEstimate.orderNumber;

    // Update active party context & badge
    updateActivePartyContext(activeEstimate.partyName);


    // Render Doors Table
    renderDoorsTable();

    // Render WPC Frames Table & toggle card visibility
    renderFramesTable();

    // Render Adjustments
    renderAdjustments();

    // Calculate All
    calculateAll();

    // Sync A5 print preview
    syncA5PrintArea();
}

/* ========================================================
   DOORS DYNAMIC ROWS & CALCULATIONS
   Formula: SQFT = (H * W * Qty) / 144
   Amount = SQFT * Rate
   ======================================================== */

function renderDoorsTable() {
    const tbody = document.getElementById('doorsTableBody');
    tbody.innerHTML = '';

    if (!activeEstimate.doors || activeEstimate.doors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" style="text-align:center; padding:20px; color:#94a3b8;">No doors added. Click "+ Add Door Item" or quick category buttons above.</td></tr>`;
        return;
    }

    // Build unique categories list (standard + any active party custom categories)
    const partyCats = activePartyPricing && activePartyPricing.doorRates ? Object.keys(activePartyPricing.doorRates) : [];
    const allCategories = Array.from(new Set([...STANDARD_DOOR_CATEGORIES, ...partyCats])).filter(Boolean);

    activeEstimate.doors.forEach((door, index) => {
        const tr = document.createElement('tr');
        const h = parseFloat(door.height) || 0;
        const w = parseFloat(door.width) || 0;
        const qty = parseInt(door.quantity) || 0;
        let rate = parseFloat(door.rate) || 0;

        const curCat = door.category || detectDoorCategoryJs(door.doorType, door.flushDoorType, door.notes);
        door.category = curCat;

        // Auto-fill party-specific rate if zero
        if (rate === 0) {
            const pRate = getPartyDoorRate(curCat);
            if (pRate > 0) {
                door.rate = pRate;
                rate = pRate;
            }
        }

        const sqft = ((h * w * qty) / 144);
        const amount = sqft * rate;

        const categoryOptions = allCategories.map(c => `
            <option value="${escapeHtml(c)}" ${c.toLowerCase() === curCat.toLowerCase() ? 'selected' : ''}>${escapeHtml(c)}</option>
        `).join('');

        tr.innerHTML = `
            <td style="font-weight:700; color:#64748b;">${index + 1}</td>
            <td>
                <select class="form-control" style="font-weight:700; font-size:12px; padding:4px 6px; color:#1e1b4b; background:#f8fafc;" onchange="updateDoorCategory(${index}, this.value)">
                    ${categoryOptions}
                    ${!allCategories.map(x=>x.toLowerCase()).includes(curCat.toLowerCase()) ? `<option value="${escapeHtml(curCat)}" selected>${escapeHtml(curCat)}</option>` : ''}
                </select>
            </td>
            <td>
                <input type="text" class="form-control" value="${escapeHtml(door.doorType || '')}" placeholder="e.g. PRIMER COATED DOOR" oninput="updateDoorField(${index}, 'doorType', this.value)">
            </td>
            <td>
                <input type="text" class="form-control" value="${escapeHtml(door.flushDoorType || '')}" placeholder="Flush spec" oninput="updateDoorField(${index}, 'flushDoorType', this.value)">
            </td>
            <td>
                <input type="text" class="form-control" value="${escapeHtml(door.designNo || '')}" placeholder="Design" oninput="updateDoorField(${index}, 'designNo', this.value)">
            </td>
            <td>
                <input type="text" class="form-control" value="${escapeHtml(door.thickness || '')}" placeholder="38MM" oninput="updateDoorField(${index}, 'thickness', this.value)">
            </td>
            <td>
                <input type="number" step="any" class="form-control num-cell" value="${h || ''}" placeholder="H" oninput="updateDoorField(${index}, 'height', this.value)">
            </td>
            <td>
                <input type="number" step="any" class="form-control num-cell" value="${w || ''}" placeholder="W" oninput="updateDoorField(${index}, 'width', this.value)">
            </td>
            <td>
                <input type="number" min="1" class="form-control num-cell" value="${qty || ''}" placeholder="Qty" oninput="updateDoorField(${index}, 'quantity', this.value)">
            </td>
            <td class="num-cell" style="font-family:var(--font-mono); font-weight:700; color:#1e1b4b;" id="door_sqft_${index}">
                ${sqft.toFixed(2)}
            </td>
            <td>
                <input type="number" step="any" class="form-control num-cell" style="font-weight:700; color:#1e1b4b;" value="${door.rate || ''}" placeholder="₹/sqft" oninput="updateDoorField(${index}, 'rate', this.value)">
            </td>
            <td class="num-cell" style="font-family:var(--font-mono); font-weight:700; color:#4338ca;" id="door_amt_${index}">
                ₹ ${amount.toFixed(2)}
            </td>
            <td>
                <input type="text" class="form-control" value="${escapeHtml(door.notes || '')}" placeholder="Notes" oninput="updateDoorField(${index}, 'notes', this.value)">
            </td>
            <td style="text-align:center;">
                <div style="display:flex; justify-content:center; gap:4px;">
                    <button type="button" class="btn btn-secondary btn-icon" title="Duplicate Door" onclick="duplicateDoor(${index})">
                        📋
                    </button>
                    <button type="button" class="btn btn-danger btn-icon" title="Delete Door" onclick="deleteDoor(${index})">
                        &times;
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateDoorCategory(index, newCategory) {
    if (!activeEstimate.doors[index]) return;
    const oldCat = activeEstimate.doors[index].category || '';
    activeEstimate.doors[index].category = newCategory;

    // Update doorType label if appropriate
    const curType = (activeEstimate.doors[index].doorType || '').trim();
    if (!curType || (curType.toUpperCase().includes('DOOR') && oldCat && curType.toLowerCase().includes(oldCat.toLowerCase()))) {
        activeEstimate.doors[index].doorType = newCategory.toUpperCase() + ' DOOR';
    }

    // Auto-fill party-specific rate for this category!
    const partyRate = getPartyDoorRate(newCategory);
    if (partyRate > 0) {
        activeEstimate.doors[index].rate = partyRate;
    }

    renderDoorsTable();
    calculateAll();
    syncA5PrintArea();
}

function updateDoorField(index, field, value) {
    if (!activeEstimate.doors[index]) return;

    if (['height', 'width', 'quantity', 'rate'].includes(field)) {
        activeEstimate.doors[index][field] = parseFloat(value) || 0;
    } else {
        activeEstimate.doors[index][field] = value;
    }

    if (field === 'rate') {
        const cat = activeEstimate.doors[index].category;
        if (cat) {
            setPartyDoorRateInMemory(cat, activeEstimate.doors[index].rate);
        }
    }

    // Update dimensions string
    const h = activeEstimate.doors[index].height || 0;
    const w = activeEstimate.doors[index].width || 0;
    activeEstimate.doors[index].dimensions = `${h}" × ${w}"`;

    // Recalculate cell
    const qty = activeEstimate.doors[index].quantity || 0;
    const rate = activeEstimate.doors[index].rate || 0;
    const sqft = ((h * w * qty) / 144);
    const amount = sqft * rate;

    const sqftEl = document.getElementById(`door_sqft_${index}`);
    if (sqftEl) sqftEl.innerText = sqft.toFixed(2);

    const amtEl = document.getElementById(`door_amt_${index}`);
    if (amtEl) amtEl.innerText = '₹ ' + amount.toFixed(2);

    calculateAll();
}

function addDoorRow(prefilledCategory = null) {
    if (!activeEstimate.doors) activeEstimate.doors = [];
    const cat = prefilledCategory || 'Primer';
    const rate = getPartyDoorRate(cat) || 125;
    activeEstimate.doors.push({
        id: 'door-' + Date.now(),
        category: cat,
        doorType: cat.toUpperCase() + ' DOOR',
        flushDoorType: 'PINE FRAME -SC',
        designNo: 'WS-17',
        thickness: '38MM',
        height: 79,
        width: 38,
        quantity: 1,
        rate: rate,
        notes: ''
    });
    renderDoorsTable();
    calculateAll();
}

function quickAddDoorCategory(cat) {
    addDoorRow(cat);
}

function duplicateDoor(index) {
    const clone = JSON.parse(JSON.stringify(activeEstimate.doors[index]));
    clone.id = 'door-' + Date.now();
    activeEstimate.doors.splice(index + 1, 0, clone);
    renderDoorsTable();
    calculateAll();
}

function deleteDoor(index) {
    activeEstimate.doors.splice(index, 1);
    renderDoorsTable();
    calculateAll();
}

/* ========================================================
   WPC FRAMES DYNAMIC ROWS & CALCULATIONS
   Formula: RFT = Quantity * Length(feet)
   Amount = RFT * Rate
   ======================================================== */

function enableAndAddWpcFrame() {
    addFrameRow('3x2', 7);
}

function renderFramesTable() {
    const tbody = document.getElementById('framesTableBody');
    const framesCard = document.getElementById('framesCardSection');
    const emptyBanner = document.getElementById('wpcEmptyBanner');
    const sumFramesRow = document.getElementById('sumFramesRow');

    const hasFrames = activeEstimate.wpcFrames && activeEstimate.wpcFrames.length > 0;

    if (framesCard) {
        framesCard.style.display = hasFrames ? 'block' : 'none';
    }
    if (emptyBanner) {
        emptyBanner.style.display = hasFrames ? 'none' : 'flex';
    }
    if (sumFramesRow) {
        sumFramesRow.style.display = hasFrames ? 'flex' : 'none';
    }

    if (!tbody) return;
    tbody.innerHTML = '';

    if (!hasFrames) {
        return;
    }

    activeEstimate.wpcFrames.forEach((frame, index) => {
        const tr = document.createElement('tr');
        const len = parseFloat(frame.lengthFeet) || 0;
        const qty = parseInt(frame.quantity) || 0;
        let rate = parseFloat(frame.rate) || 0;
        const sec = frame.section || '3x2';

        // Auto-fill party frame rate if 0
        if (rate === 0) {
            const pRate = getPartyFrameRate(sec);
            if (pRate > 0) {
                frame.rate = pRate;
                rate = pRate;
            }
        }

        const rft = len * qty;
        const amount = rft * rate;

        tr.innerHTML = `
            <td style="font-weight:700; color:#64748b;">${index + 1}</td>
            <td>
                <input type="text" class="form-control" value="${escapeHtml(frame.frameType || '')}" placeholder="e.g. WPC FRAME (IVORY)" oninput="updateFrameField(${index}, 'frameType', this.value)">
            </td>
            <td>
                <select class="form-control" style="font-weight:700; color:#1e1b4b;" onchange="updateFrameField(${index}, 'section', this.value)">
                    <option value="3x2" ${sec === '3x2' ? 'selected' : ''}>3 x 2</option>
                    <option value="4x2" ${sec === '4x2' ? 'selected' : ''}>4 x 2</option>
                    <option value="4x2.5" ${sec === '4x2.5' ? 'selected' : ''}>4 x 2.5</option>
                    <option value="5x2.5" ${sec === '5x2.5' ? 'selected' : ''}>5 x 2.5</option>
                    <option value="custom" ${!['3x2','4x2','4x2.5','5x2.5'].includes(sec) ? 'selected' : ''}>Custom</option>
                </select>
            </td>
            <td>
                <input type="number" step="any" class="form-control num-cell" value="${len || ''}" placeholder="Length ft" oninput="updateFrameField(${index}, 'lengthFeet', this.value)">
            </td>
            <td>
                <input type="number" min="1" class="form-control num-cell" value="${qty || ''}" placeholder="Qty" oninput="updateFrameField(${index}, 'quantity', this.value)">
            </td>
            <td class="num-cell" style="font-family:var(--font-mono); font-weight:700; color:#1e1b4b;" id="frame_rft_${index}">
                ${rft.toFixed(2)}
            </td>
            <td>
                <input type="number" step="any" class="form-control num-cell" style="font-weight:700; color:#1e1b4b;" value="${frame.rate || ''}" placeholder="₹/Rft" oninput="updateFrameField(${index}, 'rate', this.value)">
            </td>
            <td class="num-cell" style="font-family:var(--font-mono); font-weight:700; color:#4338ca;" id="frame_amt_${index}">
                ₹ ${amount.toFixed(2)}
            </td>
            <td>
                <input type="text" class="form-control" value="${escapeHtml(frame.notes || '')}" placeholder="Notes" oninput="updateFrameField(${index}, 'notes', this.value)">
            </td>
            <td style="text-align:center;">
                <div style="display:flex; justify-content:center; gap:4px;">
                    <button type="button" class="btn btn-secondary btn-icon" title="Duplicate Frame" onclick="duplicateFrame(${index})">
                        📋
                    </button>
                    <button type="button" class="btn btn-danger btn-icon" title="Delete Frame" onclick="deleteFrame(${index})">
                        &times;
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateFrameField(index, field, value) {
    if (!activeEstimate.wpcFrames[index]) return;

    if (['lengthFeet', 'quantity', 'rate'].includes(field)) {
        activeEstimate.wpcFrames[index][field] = parseFloat(value) || 0;
    } else {
        activeEstimate.wpcFrames[index][field] = value;
    }

    if (field === 'section') {
        const partyRate = getPartyFrameRate(value);
        if (partyRate > 0) {
            activeEstimate.wpcFrames[index].rate = partyRate;
        }
        renderFramesTable();
    }

    if (field === 'rate') {
        const sec = activeEstimate.wpcFrames[index].section || '3x2';
        setPartyFrameRateInMemory(sec, activeEstimate.wpcFrames[index].rate);
    }

    const len = activeEstimate.wpcFrames[index].lengthFeet || 0;
    const qty = activeEstimate.wpcFrames[index].quantity || 0;
    const rate = activeEstimate.wpcFrames[index].rate || 0;
    const section = activeEstimate.wpcFrames[index].section || '';

    activeEstimate.wpcFrames[index].dimensions = `${section} × ${len} ft`;

    const rft = len * qty;
    const amount = rft * rate;

    const rftEl = document.getElementById(`frame_rft_${index}`);
    if (rftEl) rftEl.innerText = rft.toFixed(2);

    const amtEl = document.getElementById(`frame_amt_${index}`);
    if (amtEl) amtEl.innerText = '₹ ' + amount.toFixed(2);

    calculateAll();
}

function addFrameRow(prefilledSection = '3x2', prefilledLength = 7) {
    if (!activeEstimate.wpcFrames) activeEstimate.wpcFrames = [];
    const rate = getPartyFrameRate(prefilledSection) || 65;
    activeEstimate.wpcFrames.push({
        id: 'frame-' + Date.now(),
        frameType: `WPC FRAME (IVORY) - ${prefilledSection}`,
        section: prefilledSection,
        lengthFeet: prefilledLength,
        quantity: 2,
        rate: rate,
        notes: ''
    });
    renderFramesTable();
    calculateAll();
    syncA5PrintArea();
}

function quickAddFrameSection(section, length = 7) {
    addFrameRow(section, length);
}


function duplicateFrame(index) {
    const clone = JSON.parse(JSON.stringify(activeEstimate.wpcFrames[index]));
    clone.id = 'frame-' + Date.now();
    activeEstimate.wpcFrames.splice(index + 1, 0, clone);
    renderFramesTable();
    calculateAll();
    syncA5PrintArea();
}

function deleteFrame(index) {
    activeEstimate.wpcFrames.splice(index, 1);
    renderFramesTable();
    calculateAll();
    syncA5PrintArea();
}

/* ========================================================
   OTHER CHARGES / ADJUSTMENTS ( + or - )
   ======================================================== */

function renderAdjustments() {
    const container = document.getElementById('adjustmentsContainer');
    container.innerHTML = '';

    if (!activeEstimate.otherCharges || activeEstimate.otherCharges.length === 0) {
        container.innerHTML = `<div style="font-size:12px; color:#94a3b8; padding:8px 0;">No extra charges or discounts added.</div>`;
        return;
    }

    activeEstimate.otherCharges.forEach((adj, index) => {
        const item = document.createElement('div');
        item.className = 'adjustment-item';
        item.innerHTML = `
            <input type="text" class="form-control" style="flex:2;" value="${escapeHtml(adj.description || 'Other')}" placeholder="Description" oninput="updateAdjustment(${index}, 'description', this.value)">
            <select class="form-control" style="width:70px;" onchange="updateAdjustment(${index}, 'type', this.value)">
                <option value="+" ${adj.type === '+' ? 'selected' : ''}>+ (Add)</option>
                <option value="-" ${adj.type === '-' ? 'selected' : ''}>- (Less)</option>
            </select>
            <input type="number" step="any" class="form-control num-cell" style="width:110px;" value="${adj.amount || 0}" placeholder="Amount" oninput="updateAdjustment(${index}, 'amount', this.value)">
            <button type="button" class="btn btn-ghost btn-icon" style="color:#ef4444;" onclick="deleteAdjustment(${index})">&times;</button>
        `;
        container.appendChild(item);
    });
}

function addAdjustmentRow() {
    if (!activeEstimate.otherCharges) activeEstimate.otherCharges = [];
    activeEstimate.otherCharges.push({
        id: 'adj-' + Date.now(),
        description: 'Other Charges',
        type: '+',
        amount: 0
    });
    renderAdjustments();
    calculateAll();
}

function updateAdjustment(index, field, value) {
    if (!activeEstimate.otherCharges[index]) return;
    if (field === 'amount') {
        activeEstimate.otherCharges[index].amount = parseFloat(value) || 0;
    } else {
        activeEstimate.otherCharges[index][field] = value;
    }
    calculateAll();
}

function deleteAdjustment(index) {
    activeEstimate.otherCharges.splice(index, 1);
    renderAdjustments();
    calculateAll();
}

/* ========================================================
   GLOBAL CALCULATION ENGINE
   Doors Total + Frames Total + Adjustments (+/-) = Net Total
   Cash Balance = Net Total - Bill Amount
   ======================================================== */

function calculateAll() {
    if (!activeEstimate) return;

    // Doors calculations
    let doorsQty = 0;
    let doorsSqft = 0;
    let doorsAmt = 0;

    (activeEstimate.doors || []).forEach(door => {
        const h = parseFloat(door.height) || 0;
        const w = parseFloat(door.width) || 0;
        const q = parseInt(door.quantity) || 0;
        const r = parseFloat(door.rate) || 0;

        const sq = (h * w * q) / 144;
        const am = sq * r;

        doorsQty += q;
        doorsSqft += sq;
        doorsAmt += am;
    });

    document.getElementById('doorsTotalQty').innerText = doorsQty;
    document.getElementById('doorsTotalSqft').innerText = doorsSqft.toFixed(2);
    document.getElementById('doorsTotalAmount').innerText = '₹ ' + doorsAmt.toFixed(2);
    document.getElementById('doorsCountBadge').innerText = `${doorsQty} Doors`;
    document.getElementById('doorsSqftBadge').innerText = `${doorsSqft.toFixed(2)} SQFT`;

    // WPC Frames calculations
    let framesQty = 0;
    let framesRft = 0;
    let framesAmt = 0;

    (activeEstimate.wpcFrames || []).forEach(frame => {
        const l = parseFloat(frame.lengthFeet) || 0;
        const q = parseInt(frame.quantity) || 0;
        const r = parseFloat(frame.rate) || 0;

        const rf = l * q;
        const am = rf * r;

        framesQty += q;
        framesRft += rf;
        framesAmt += am;
    });

    document.getElementById('framesTotalQty').innerText = framesQty;
    document.getElementById('framesTotalRft').innerText = framesRft.toFixed(2);
    document.getElementById('framesTotalAmount').innerText = '₹ ' + framesAmt.toFixed(2);
    document.getElementById('framesCountBadge').innerText = `${framesQty} Frames`;
    document.getElementById('framesRftBadge').innerText = `${framesRft.toFixed(2)} RFT`;

    // Adjustments calculation
    let otherTotal = 0;
    (activeEstimate.otherCharges || []).forEach(adj => {
        const amt = parseFloat(adj.amount) || 0;
        if (adj.type === '-') {
            otherTotal -= amt;
        } else {
            otherTotal += amt;
        }
    });

    // Summary calculation
    const subtotal = doorsAmt + framesAmt;
    const netTotal = subtotal + otherTotal;

    const billAmtInput = parseFloat(document.getElementById('billAmount').value) || 0;
    activeEstimate.billAmount = billAmtInput;

    // Cash Balance: Net Total - Bill Amount
    // Example from user: Total 500, Bill 300 => 500 - 300 = 200 Cash Balance
    const cashBalance = netTotal - billAmtInput;

    // Update UI elements
    document.getElementById('sumDoorsAmt').innerText = '₹ ' + doorsAmt.toFixed(2);
    document.getElementById('sumFramesAmt').innerText = '₹ ' + framesAmt.toFixed(2);
    document.getElementById('sumOtherAmt').innerText = (otherTotal >= 0 ? '+ ₹ ' : '- ₹ ') + Math.abs(otherTotal).toFixed(2);
    document.getElementById('sumNetTotal').innerText = '₹ ' + netTotal.toFixed(2);
    document.getElementById('cashBalanceAmt').innerText = '₹ ' + cashBalance.toFixed(2);

    // Sync state values
    activeEstimate.totalDoors = doorsQty;
    activeEstimate.doorsSqft = doorsSqft;
    activeEstimate.totalFrames = framesQty;
    activeEstimate.framesRft = framesRft;
    activeEstimate.subtotal = subtotal;
    activeEstimate.netTotal = netTotal;
    activeEstimate.cashBalance = cashBalance;
}

/* ========================================================
   SAVE ESTIMATE TO ENCRYPTED DATABASE
   ======================================================== */

async function saveActiveEstimate() {
    if (!activeEstimate) return;

    // Read form values
    activeEstimate.orderNumber = document.getElementById('orderNumber').value.trim() || activeEstimate.id;
    activeEstimate.id = activeEstimate.orderNumber;
    activeEstimate.orderDate = document.getElementById('orderDate').value;
    activeEstimate.partyName = document.getElementById('partyName').value.trim();
    activeEstimate.partyMobile = document.getElementById('partyMobile').value.trim();
    activeEstimate.partyAddress = document.getElementById('partyAddress').value.trim();
    activeEstimate.orderPriority = document.getElementById('orderPriority').value;
    activeEstimate.notes = document.getElementById('estimateNotes').value.trim();
    activeEstimate.billAmount = parseFloat(document.getElementById('billAmount').value) || 0;

    if (!activeEstimate.partyName) {
        alert('Please enter Party Name before saving.');
        document.getElementById('partyName').focus();
        return;
    }

    calculateAll();

    try {
        const res = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'save_estimate',
                estimate: activeEstimate
            })
        });
        const data = await res.json();

        if (data.success) {
            if (data.party) {
                activePartyPricing = data.party;
                const pIdx = memorizedParties.findIndex(p => p.id === data.party.id || p.partyName.toLowerCase() === data.party.partyName.toLowerCase());
                if (pIdx !== -1) {
                    memorizedParties[pIdx] = data.party;
                } else {
                    memorizedParties.unshift(data.party);
                }
                updatePartySuggestionsDatalist();
                updatePartyBadge(data.party);
            }
            alert('Estimate successfully saved and encrypted!\nParty custom rates memorized.');
            loadEstimates();
        } else {
            alert('Failed to save: ' + (data.message || 'Unknown error'));
        }

    } catch (err) {
        alert('Network error while saving estimate.');
    }
}

/* ========================================================
   A5 PRINT FORMAT PREPARATION & TRIGGER
   ======================================================== */

/* ========================================================
   INDIAN NUMBER TO WORDS HELPER (TALLY FORMAT)
   ======================================================== */

function numberToIndianWords(amount) {
    if (isNaN(amount) || amount === 0) return 'INR Zero Only';
    amount = Math.round(Math.abs(amount));
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertUnderThousand(n) {
        let str = '';
        if (n >= 100) {
            str += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            str += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n > 0) {
            str += ones[n] + ' ';
        }
        return str.trim();
    }

    let crore = Math.floor(amount / 10000000);
    amount %= 10000000;
    let lakh = Math.floor(amount / 100000);
    amount %= 100000;
    let thousand = Math.floor(amount / 1000);
    amount %= 1000;
    let remainder = amount;

    let res = '';
    if (crore > 0) res += convertUnderThousand(crore) + ' Crore ';
    if (lakh > 0) res += convertUnderThousand(lakh) + ' Lakh ';
    if (thousand > 0) res += convertUnderThousand(thousand) + ' Thousand ';
    if (remainder > 0) res += convertUnderThousand(remainder);

    return 'INR ' + res.trim() + ' Only';
}

function formatDateTally(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = ('0' + date.getDate()).slice(-2);
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
}

/* ========================================================
   A5 PRINT FORMAT PREPARATION (AUTHENTIC TALLY BILL)
   ======================================================== */

function syncA5PrintArea() {
    calculateAll();

    // Tally Header Box (No Mobile on top line as requested!)
    const orderNo = document.getElementById('orderNumber').value || activeEstimate.id;
    const orderDate = formatDateTally(document.getElementById('orderDate').value);
    const partyName = document.getElementById('partyName').value || 'CASH CUSTOMER';
    const partyAddress = document.getElementById('partyAddress').value.trim();

    const elOrderNo = document.getElementById('printOrderNo');
    if (elOrderNo) elOrderNo.innerText = orderNo;

    const elDate = document.getElementById('printDate');
    if (elDate) elDate.innerText = orderDate;

    const elParty = document.getElementById('printPartyName');
    if (elParty) elParty.innerText = partyName;

    const addrWrap = document.getElementById('printPartyAddressWrap');
    const elAddr = document.getElementById('printPartyAddress');
    if (partyAddress) {
        if (addrWrap) addrWrap.style.display = 'block';
        if (elAddr) elAddr.innerText = partyAddress;
    } else if (addrWrap) {
        addrWrap.style.display = 'none';
    }

    const hasDoors = activeEstimate.doors && activeEstimate.doors.length > 0;
    const hasFrames = activeEstimate.wpcFrames && activeEstimate.wpcFrames.length > 0;

    // Doors Section
    const printDoorsSec = document.getElementById('printDoorsSection');
    const doorsHeading = document.getElementById('doorsSectionHeading');
    if (printDoorsSec) {
        printDoorsSec.style.display = hasDoors ? 'block' : 'none';
    }
    if (doorsHeading) {
        doorsHeading.innerText = (hasDoors && hasFrames) ? '1. DOORS SPECIFICATIONS' : 'DOORS SPECIFICATIONS';
    }

    // Doors Table (Tally Grid Format)
    const doorsTbody = document.getElementById('printDoorsTbody');
    doorsTbody.innerHTML = '';
    let dQty = 0, dSqft = 0, dAmt = 0;

    if (hasDoors) {
        (activeEstimate.doors || []).forEach((door, idx) => {
            const h = parseFloat(door.height) || 0;
            const w = parseFloat(door.width) || 0;
            const q = parseInt(door.quantity) || 0;
            const r = parseFloat(door.rate) || 0;
            const sq = (h * w * q) / 144;
            const am = sq * r;

            dQty += q;
            dSqft += sq;
            dAmt += am;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-center font-mono">${idx + 1}</td>
                <td>
                    <div class="tally-item-title">${escapeHtml(door.doorType || 'DOOR')}</div>
                    ${(door.flushDoorType || door.notes) ? `
                        <div class="tally-item-subtext">
                            ${escapeHtml(door.flushDoorType || '')}${door.notes ? ' (' + escapeHtml(door.notes) + ')' : ''}
                        </div>
                    ` : ''}
                </td>
                <td class="text-center font-mono">${escapeHtml(door.designNo || '-')}</td>
                <td class="text-center font-mono">${escapeHtml(door.thickness || '-')}</td>
                <td class="text-center font-mono">${h}"&times;${w}"</td>
                <td class="text-center font-mono bold">${q}</td>
                <td class="text-right font-mono">${sq.toFixed(2)}</td>
                <td class="text-right font-mono">${r > 0 ? r.toFixed(2) : '-'}</td>
                <td class="text-right font-mono bold">${am.toFixed(2)}</td>
            `;
            doorsTbody.appendChild(tr);
        });
    }

    document.getElementById('printDoorsTotalQty').innerText = dQty;
    document.getElementById('printDoorsTotalSqft').innerText = dSqft.toFixed(2);
    document.getElementById('printDoorsTotalAmount').innerText = dAmt.toFixed(2);
    document.getElementById('printDoorsCountBadge').innerText = `${dQty} Doors | ${dSqft.toFixed(2)} SQFT`;

    // Frames Section (Clean removal if party has no WPC frames)
    const printFramesSec = document.getElementById('printFramesSection');
    const framesHeading = document.getElementById('framesSectionHeading');
    if (printFramesSec) {
        printFramesSec.style.display = hasFrames ? 'block' : 'none';
    }
    if (framesHeading) {
        framesHeading.innerText = (hasDoors && hasFrames) ? '2. WPC FRAMES SPECIFICATIONS' : 'WPC FRAMES SPECIFICATIONS';
    }

    const framesTbody = document.getElementById('printFramesTbody');
    framesTbody.innerHTML = '';
    let fQty = 0, fRft = 0, fAmt = 0;

    if (hasFrames) {
        (activeEstimate.wpcFrames || []).forEach((frame, idx) => {
            const l = parseFloat(frame.lengthFeet) || 0;
            const q = parseInt(frame.quantity) || 0;
            const r = parseFloat(frame.rate) || 0;
            const rf = l * q;
            const am = rf * r;

            fQty += q;
            fRft += rf;
            fAmt += am;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-center font-mono">${idx + 1}</td>
                <td>
                    <div class="tally-item-title">${escapeHtml(frame.frameType || 'WPC FRAME')}</div>
                    ${frame.notes ? '<div class="tally-item-subtext">' + escapeHtml(frame.notes) + '</div>' : ''}
                </td>
                <td class="text-center font-mono bold">${escapeHtml(frame.section || '-')}</td>
                <td class="text-center font-mono">${l} ft</td>
                <td class="text-center font-mono bold">${q}</td>
                <td class="text-right font-mono">${rf.toFixed(2)}</td>
                <td class="text-right font-mono">${r > 0 ? r.toFixed(2) : '-'}</td>
                <td class="text-right font-mono bold">${am.toFixed(2)}</td>
            `;
            framesTbody.appendChild(tr);
        });
    }

    document.getElementById('printFramesTotalQty').innerText = fQty;
    document.getElementById('printFramesTotalRft').innerText = fRft.toFixed(2);
    document.getElementById('printFramesTotalAmount').innerText = fAmt.toFixed(2);
    document.getElementById('printFramesCountBadge').innerText = `${fQty} Frames | ${fRft.toFixed(2)} RFT`;

    // Adjustments in Tally Table
    const adjTbody = document.getElementById('printAdjustmentsTbody');
    adjTbody.innerHTML = '';
    let otherTotal = 0;

    (activeEstimate.otherCharges || []).forEach(adj => {
        const amt = parseFloat(adj.amount) || 0;
        if (amt === 0) return;

        if (adj.type === '-') {
            otherTotal -= amt;
        } else {
            otherTotal += amt;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(adj.description || 'Adjustment')} (${adj.type}):</td>
            <td class="text-right font-mono">${adj.type === '-' ? '- ' : '+ '}₹ ${amt.toFixed(2)}</td>
        `;
        adjTbody.appendChild(tr);
    });

    const subtotal = dAmt + fAmt;
    const netTotal = subtotal + otherTotal;
    const billAmt = parseFloat(document.getElementById('billAmount').value) || 0;
    const cashBalance = netTotal - billAmt;

    document.getElementById('printSubtotal').innerText = '₹ ' + subtotal.toFixed(2);
    document.getElementById('printNetTotal').innerText = '₹ ' + netTotal.toFixed(2);
    document.getElementById('printBillAmount').innerText = '₹ ' + billAmt.toFixed(2);
    document.getElementById('printCashBalance').innerText = '₹ ' + cashBalance.toFixed(2);

    // Tally Amount in Words (based on Cash Balance if balance remains, else Net Total)
    const activeChargeAmount = cashBalance > 0 ? cashBalance : netTotal;
    const wordsEl = document.getElementById('printAmountInWords');
    if (wordsEl) {
        wordsEl.innerText = numberToIndianWords(activeChargeAmount);
    }

    // Accurate Multi-page detection: check if content exceeds 1 A5 page (~765px printable height at 96dpi)
    const printArea = document.getElementById('a5PrintArea');
    printArea.style.display = 'block'; // momentarily display to calculate height accurately
    const printHeight = printArea.scrollHeight;
    printArea.style.display = 'none';

    const printPageCounter = document.getElementById('printPageCounter');

    if (printHeight > 765) {
        const totalPages = Math.ceil(printHeight / 750);
        document.body.classList.add('multipage-active');
        if (printPageCounter) {
            printPageCounter.innerText = `Total Pages: ${totalPages}`;
        }
    } else {
        // Fits on 1 page cleanly: omit page counter
        document.body.classList.remove('multipage-active');
        if (printPageCounter) {
            printPageCounter.innerText = '';
        }
    }
}

function previewAndPrintA5() {
    syncA5PrintArea();

    // Copy print area HTML into modal preview
    const previewContainer = document.getElementById('a5ModalPreviewArea');
    previewContainer.innerHTML = document.getElementById('a5PrintArea').innerHTML;

    document.getElementById('previewModal').classList.add('active');
}

function closePreviewModal() {
    document.getElementById('previewModal').classList.remove('active');
}

function triggerNativePrint() {
    syncA5PrintArea();
    closePreviewModal();
    window.print();
}

/* ========================================================
   SAVED HISTORY & IMPORT / EXPORT
   ======================================================== */

function openHistoryModal() {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';

    if (savedEstimatesList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#94a3b8;">No saved estimates found in encrypted storage.</td></tr>`;
    } else {
        savedEstimatesList.forEach(est => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:700; font-family:var(--font-mono);">${escapeHtml(est.orderNumber || est.id)}</td>
                <td>${escapeHtml(est.orderDate || '-')}</td>
                <td style="font-weight:600;">${escapeHtml(est.partyName || '-')}</td>
                <td>${escapeHtml(est.partyMobile || '-')}</td>
                <td class="num-cell">₹ ${(est.netTotal || 0).toFixed(2)}</td>
                <td class="num-cell" style="font-weight:700; color:#4338ca;">₹ ${(est.cashBalance || 0).toFixed(2)}</td>
                <td style="text-align:center;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="loadFromHistory('${est.id}')">Load</button>
                    <button type="button" class="btn btn-danger btn-sm" onclick="deleteFromHistory('${est.id}')">&times;</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('historyModal').classList.add('active');
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
}

function loadFromHistory(id) {
    const found = savedEstimatesList.find(x => x.id === id);
    if (found) {
        loadEstimateIntoForm(found);
        closeHistoryModal();
    }
}

async function deleteFromHistory(id) {
    if (!confirm('Are you sure you want to delete this estimate from the encrypted database?')) {
        return;
    }

    try {
        const res = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_estimate', id })
        });
        const data = await res.json();
        if (data.success) {
            loadEstimates();
            openHistoryModal();
        } else {
            alert('Failed to delete: ' + (data.message || ''));
        }
    } catch (e) {
        alert('Network error.');
    }
}

function exportCurrentJSON() {
    if (!activeEstimate) return;
    calculateAll();
    const jsonStr = JSON.stringify(activeEstimate, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Estimate_${activeEstimate.orderNumber || activeEstimate.id}.json`;
    a.click();
}

function loadJsonFromFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('importJsonText').value = e.target.result;
    };
    reader.readAsText(file);
}

function openImportModal() {
    document.getElementById('importJsonText').value = '';
    const fileInput = document.getElementById('jsonFileInput');
    if (fileInput) fileInput.value = '';
    document.getElementById('importModal').classList.add('active');
}

function closeImportModal() {
    document.getElementById('importModal').classList.remove('active');
}

async function submitImportJson() {
    const raw = document.getElementById('importJsonText').value.trim();
    if (!raw) {
        alert('Please paste valid JSON or select a JSON file.');
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        const res = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'import_json', import_data: parsed })
        });
        const data = await res.json();

        if (data.success && data.estimate) {
            closeImportModal();
            // Completely clear old party data and render the new party fresh!
            loadEstimateIntoForm(data.estimate);
            // Refresh saved history list and parties list in background
            await Promise.all([
                refreshSavedEstimatesList(),
                loadParties()
            ]);
            alert('New party JSON imported successfully!\nAll old party data cleared, new party rendered fresh, and party rates memorized.');
        } else if (data.success) {
            closeImportModal();
            loadEstimateIntoForm(parsed);
            await Promise.all([
                refreshSavedEstimatesList(),
                loadParties()
            ]);
            alert('JSON imported successfully and party rates memorized!');
        } else {
            alert('Import failed: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        alert('Invalid JSON syntax: ' + err.message);
    }
}

/* ========================================================
   PARTY MASTER & PRICE CARDS MODAL MANAGEMENT
   ======================================================== */

async function openPartiesModal(targetPartyId = null) {
    await loadParties();
    const countBadge = document.getElementById('partiesCountBadge');
    if (countBadge) countBadge.innerText = memorizedParties.length;
    renderPartySidebar();

    let target = null;
    if (targetPartyId) {
        target = memorizedParties.find(p => p.id === targetPartyId || p.partyName.toLowerCase() === targetPartyId.toLowerCase());
    }
    if (!target && activeEstimate && activeEstimate.partyName) {
        target = memorizedParties.find(p => p.partyName.toLowerCase() === activeEstimate.partyName.toLowerCase());
    }
    if (!target && memorizedParties.length > 0) {
        target = memorizedParties[0];
    }

    if (target) {
        selectPartyInModal(target.id);
    } else {
        createNewPartyForm();
    }

    document.getElementById('partiesModal').classList.add('active');
}

function closePartiesModal() {
    document.getElementById('partiesModal').classList.remove('active');
}

function renderPartySidebar(filtered = null) {
    const list = filtered || memorizedParties;
    const container = document.getElementById('partyListContainer');
    if (!container) return;
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = `<div style="font-size:12px; color:#94a3b8; padding:12px; text-align:center;">No parties found.</div>`;
        return;
    }

    list.forEach(party => {
        const item = document.createElement('div');
        item.className = 'party-card-item' + (party.id === selectedModalPartyId ? ' active' : '');
        const dCount = Object.keys(party.doorRates || {}).length;
        const fCount = Object.keys(party.frameRates || {}).length;

        item.innerHTML = `
            <div class="party-card-name">
                <span>${escapeHtml(party.partyName)}</span>
                <span style="font-size:10.5px; background:#e0e7ff; color:#3730a3; padding:1px 5px; border-radius:4px; font-weight:700;">${dCount + fCount} rates</span>
            </div>
            <div class="party-card-meta">
                ${party.partyMobile ? `📞 ${escapeHtml(party.partyMobile)}` : 'No mobile'}
            </div>
            ${party.partyAddress ? `<div class="party-card-meta" style="font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📍 ${escapeHtml(party.partyAddress)}</div>` : ''}
        `;
        item.onclick = () => selectPartyInModal(party.id);
        container.appendChild(item);
    });
}

function filterPartiesList(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
        renderPartySidebar();
        return;
    }
    const filtered = memorizedParties.filter(p => 
        p.partyName.toLowerCase().includes(q) || 
        (p.partyMobile && p.partyMobile.includes(q)) || 
        (p.partyAddress && p.partyAddress.toLowerCase().includes(q))
    );
    renderPartySidebar(filtered);
}

function selectPartyInModal(partyId) {
    selectedModalPartyId = partyId;
    const party = memorizedParties.find(p => p.id === partyId);
    if (!party) return;

    renderPartySidebar();

    document.getElementById('editorPartyTitle').innerText = party.partyName;
    document.getElementById('editorPartySub').innerText = `Last updated: ${party.updated_at || party.lastOrderDate || 'Recently'}`;
    document.getElementById('editPartyName').value = party.partyName;
    document.getElementById('editPartyMobile').value = party.partyMobile || '';
    document.getElementById('editPartyAddress').value = party.partyAddress || '';
    document.getElementById('editPartyNotes').value = party.notes || '';
    document.getElementById('btnDeleteParty').style.display = 'inline-block';

    renderDoorRatesGrid(party.doorRates || {});
    renderFrameRatesGrid(party.frameRates || {});
}

function createNewPartyForm() {
    selectedModalPartyId = null;
    renderPartySidebar();

    document.getElementById('editorPartyTitle').innerText = 'Create New Party';
    document.getElementById('editorPartySub').innerText = 'Setup party details and define custom pricing rates';
    document.getElementById('editPartyName').value = '';
    document.getElementById('editPartyMobile').value = '';
    document.getElementById('editPartyAddress').value = '';
    document.getElementById('editPartyNotes').value = '';
    document.getElementById('btnDeleteParty').style.display = 'none';

    // Baseline rates for a new party
    const baseDoorRates = {
        'Primer': 125,
        'Laminate': 250,
        'Membrane': 195,
        'Microcoating': 180,
        'WPC': 140,
        'UV Coating': 220,
        'Veneer': 320,
        'Flush Door': 110,
        'Teak Wood': 450
    };
    const baseFrameRates = {
        '3x2': 65,
        '4x2': 125,
        '4x2.5': 145,
        '5x2.5': 180
    };
    renderDoorRatesGrid(baseDoorRates);
    renderFrameRatesGrid(baseFrameRates);
}

function renderDoorRatesGrid(rates) {
    const grid = document.getElementById('doorRatesGrid');
    grid.innerHTML = '';

    const allCategories = Array.from(new Set([...STANDARD_DOOR_CATEGORIES, ...Object.keys(rates)])).filter(Boolean);

    allCategories.forEach(cat => {
        const val = rates[cat] !== undefined ? rates[cat] : '';
        const card = document.createElement('div');
        card.className = 'rate-box-card';
        card.innerHTML = `
            <div class="rate-box-label">
                <span>${escapeHtml(cat)}</span>
                <span style="font-weight:400; color:#64748b;">₹/sqft</span>
            </div>
            <input type="number" step="any" class="form-control num-cell rate-box-input modal-door-rate-input" data-category="${escapeHtml(cat)}" value="${val}" placeholder="0.00">
        `;
        grid.appendChild(card);
    });
}

function renderFrameRatesGrid(rates) {
    const grid = document.getElementById('frameRatesGrid');
    grid.innerHTML = '';

    const allSections = Array.from(new Set([...STANDARD_FRAME_SECTIONS, ...Object.keys(rates)])).filter(Boolean);

    allSections.forEach(sec => {
        const val = rates[sec] !== undefined ? rates[sec] : '';
        const card = document.createElement('div');
        card.className = 'rate-box-card';
        card.innerHTML = `
            <div class="rate-box-label">
                <span>${escapeHtml(sec)}</span>
                <span style="font-weight:400; color:#64748b;">₹/Rft</span>
            </div>
            <input type="number" step="any" class="form-control num-cell rate-box-input modal-frame-rate-input" data-section="${escapeHtml(sec)}" value="${val}" placeholder="0.00">
        `;
        grid.appendChild(card);
    });
}

function addCustomDoorCategoryRate() {
    const nameInput = document.getElementById('newDoorCategoryName');
    const rateInput = document.getElementById('newDoorCategoryRate');
    const name = nameInput.value.trim();
    const rate = parseFloat(rateInput.value) || 0;

    if (!name) {
        alert('Please enter a door category name.');
        return;
    }

    const grid = document.getElementById('doorRatesGrid');
    const existing = grid.querySelector(`[data-category="${name}"]`);
    if (existing) {
        existing.value = rate;
        existing.focus();
    } else {
        const card = document.createElement('div');
        card.className = 'rate-box-card';
        card.innerHTML = `
            <div class="rate-box-label">
                <span>${escapeHtml(name)}</span>
                <span style="font-weight:400; color:#64748b;">₹/sqft</span>
            </div>
            <input type="number" step="any" class="form-control num-cell rate-box-input modal-door-rate-input" data-category="${escapeHtml(name)}" value="${rate}" placeholder="0.00">
        `;
        grid.appendChild(card);
    }

    nameInput.value = '';
    rateInput.value = '';
}

function addCustomFrameSectionRate() {
    const nameInput = document.getElementById('newFrameSectionName');
    const rateInput = document.getElementById('newFrameSectionRate');
    const sec = nameInput.value.trim();
    const rate = parseFloat(rateInput.value) || 0;

    if (!sec) {
        alert('Please enter a frame section size (e.g. 6x2.5).');
        return;
    }

    const grid = document.getElementById('frameRatesGrid');
    const existing = grid.querySelector(`[data-section="${sec}"]`);
    if (existing) {
        existing.value = rate;
        existing.focus();
    } else {
        const card = document.createElement('div');
        card.className = 'rate-box-card';
        card.innerHTML = `
            <div class="rate-box-label">
                <span>${escapeHtml(sec)}</span>
                <span style="font-weight:400; color:#64748b;">₹/Rft</span>
            </div>
            <input type="number" step="any" class="form-control num-cell rate-box-input modal-frame-rate-input" data-section="${escapeHtml(sec)}" value="${rate}" placeholder="0.00">
        `;
        grid.appendChild(card);
    }

    nameInput.value = '';
    rateInput.value = '';
}

async function savePartyFromModal() {
    const name = document.getElementById('editPartyName').value.trim();
    if (!name) {
        alert('Party Name is required.');
        document.getElementById('editPartyName').focus();
        return;
    }

    const mobile = document.getElementById('editPartyMobile').value.trim();
    const address = document.getElementById('editPartyAddress').value.trim();
    const notes = document.getElementById('editPartyNotes').value.trim();

    // Collect door rates
    const doorRates = {};
    document.querySelectorAll('.modal-door-rate-input').forEach(inp => {
        const cat = inp.getAttribute('data-category');
        const val = parseFloat(inp.value);
        if (cat && !isNaN(val) && val > 0) {
            doorRates[cat] = val;
        }
    });

    // Collect frame rates
    const frameRates = {};
    document.querySelectorAll('.modal-frame-rate-input').forEach(inp => {
        const sec = inp.getAttribute('data-section');
        const val = parseFloat(inp.value);
        if (sec && !isNaN(val) && val > 0) {
            frameRates[sec] = val;
        }
    });

    const partyPayload = {
        id: selectedModalPartyId || undefined,
        partyName: name,
        partyMobile: mobile,
        partyAddress: address,
        notes: notes,
        doorRates: doorRates,
        frameRates: frameRates
    };

    try {
        const res = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save_party', party: partyPayload })
        });
        const data = await res.json();
        if (data.success) {
            memorizedParties = data.parties || memorizedParties;
            selectedModalPartyId = data.party.id;
            updatePartySuggestionsDatalist();
            renderPartySidebar();

            // If active estimate is for this party, update active context
            if (activeEstimate && activeEstimate.partyName && activeEstimate.partyName.toLowerCase() === name.toLowerCase()) {
                activePartyPricing = data.party;
                updatePartyBadge(data.party);
            }

            alert(`Party "${name}" & custom price sheet saved successfully!`);
        } else {
            alert('Failed to save party: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        alert('Network error while saving party.');
    }
}

function applyPartyToActiveEstimate() {
    const name = document.getElementById('editPartyName').value.trim();
    if (!name) {
        alert('Party Name is empty.');
        return;
    }

    document.getElementById('partyName').value = name;
    const mobile = document.getElementById('editPartyMobile').value.trim();
    if (mobile) document.getElementById('partyMobile').value = mobile;
    const address = document.getElementById('editPartyAddress').value.trim();
    if (address) document.getElementById('partyAddress').value = address;

    onPartyNameSelected(name);
    closePartiesModal();
}

async function deletePartyFromModal() {
    if (!selectedModalPartyId) return;
    const party = memorizedParties.find(p => p.id === selectedModalPartyId);
    if (!party) return;

    if (!confirm(`Are you sure you want to delete "${party.partyName}" from the Party Directory?`)) {
        return;
    }

    try {
        const res = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_party', id: party.id })
        });
        const data = await res.json();
        if (data.success) {
            memorizedParties = data.parties || [];
            updatePartySuggestionsDatalist();
            if (memorizedParties.length > 0) {
                selectPartyInModal(memorizedParties[0].id);
            } else {
                createNewPartyForm();
            }
        } else {
            alert('Failed to delete: ' + (data.message || ''));
        }
    } catch (e) {
        alert('Network error.');
    }
}

/* ========================================================
   UTILITY HELPERS
   ======================================================== */


function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDateCompact(date) {
    const d = ('0' + date.getDate()).slice(-2);
    const m = ('0' + (date.getMonth() + 1)).slice(-2);
    const y = date.getFullYear();
    return `${d}${m}${y}`;
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
}
