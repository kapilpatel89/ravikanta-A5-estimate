/**
 * A5 Estimate System - Interactive Core Logic & Encrypted API Bridge
 */

// Global State
let activeEstimate = null;
let savedEstimatesList = [];
let shopConfig = {
    name: 'RAVI KANTA DOORS & HARDWARE',
    phone: '9019711881',
    address: ''
};

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
    await refreshSavedEstimatesList();
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
                doorType: 'PRIMER COATED DOOR',
                flushDoorType: 'PINE FRAME -SC (INSIDE PARTICAL)',
                designNo: 'WS-17',
                thickness: '38MM',
                height: 79,
                width: 39,
                quantity: 1,
                rate: 125,
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

    // Doors: strict new array
    const rawDoors = est.doors || est.doorItems || est.door_items || est.items || [];
    const cleanDoors = Array.isArray(rawDoors) ? rawDoors.map((d, i) => ({
        id: d.id || ('door-' + (Date.now() + i)),
        doorType: d.doorType || d.type || d.description || 'DOOR',
        flushDoorType: d.flushDoorType || d.flush || d.flushSpec || '',
        designNo: d.designNo || d.design || '',
        thickness: d.thickness || d.thick || '',
        height: parseFloat(d.height !== undefined ? d.height : (d.h !== undefined ? d.h : 0)) || 0,
        width: parseFloat(d.width !== undefined ? d.width : (d.w !== undefined ? d.w : 0)) || 0,
        quantity: parseInt(d.quantity !== undefined ? d.quantity : (d.qty !== undefined ? d.qty : (d.nos !== undefined ? d.nos : 1))) || 0,
        rate: parseFloat(d.rate !== undefined ? d.rate : (d.price !== undefined ? d.price : 0)) || 0,
        notes: d.notes || d.remark || ''
    })) : [];

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
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:20px; color:#94a3b8;">No doors added. Click "+ Add Door Item" above.</td></tr>`;
        return;
    }

    activeEstimate.doors.forEach((door, index) => {
        const tr = document.createElement('tr');
        const h = parseFloat(door.height) || 0;
        const w = parseFloat(door.width) || 0;
        const qty = parseInt(door.quantity) || 0;
        const rate = parseFloat(door.rate) || 0;

        const sqft = ((h * w * qty) / 144);
        const amount = sqft * rate;

        tr.innerHTML = `
            <td style="font-weight:700; color:#64748b;">${index + 1}</td>
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
                <input type="number" step="any" class="form-control num-cell" value="${rate || ''}" placeholder="₹/sqft" oninput="updateDoorField(${index}, 'rate', this.value)">
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

function updateDoorField(index, field, value) {
    if (!activeEstimate.doors[index]) return;

    if (['height', 'width', 'quantity', 'rate'].includes(field)) {
        activeEstimate.doors[index][field] = parseFloat(value) || 0;
    } else {
        activeEstimate.doors[index][field] = value;
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

function addDoorRow() {
    if (!activeEstimate.doors) activeEstimate.doors = [];
    activeEstimate.doors.push({
        id: 'door-' + Date.now(),
        doorType: 'PRIMER COATED DOOR',
        flushDoorType: 'PINE FRAME -SC',
        designNo: 'WS-17',
        thickness: '38MM',
        height: 79,
        width: 38,
        quantity: 1,
        rate: 125,
        notes: ''
    });
    renderDoorsTable();
    calculateAll();
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
   Example: 7ft x 2 nos = 14 RFT; 3ft x 1 nos = 3 RFT
   Amount = RFT * Rate
   ======================================================== */

function enableAndAddWpcFrame() {
    if (!activeEstimate.wpcFrames) activeEstimate.wpcFrames = [];
    activeEstimate.wpcFrames.push({
        id: 'frame-' + Date.now(),
        frameType: 'WPC FRAME (IVORY)',
        section: '3x2',
        lengthFeet: 7,
        quantity: 2,
        rate: 65,
        notes: ''
    });
    renderFramesTable();
    calculateAll();
    syncA5PrintArea();
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
        const rate = parseFloat(frame.rate) || 0;

        const rft = len * qty;
        const amount = rft * rate;

        tr.innerHTML = `
            <td style="font-weight:700; color:#64748b;">${index + 1}</td>
            <td>
                <input type="text" class="form-control" value="${escapeHtml(frame.frameType || '')}" placeholder="e.g. WPC FRAME (IVORY)-(A)" oninput="updateFrameField(${index}, 'frameType', this.value)">
            </td>
            <td>
                <select class="form-control" onchange="updateFrameField(${index}, 'section', this.value)">
                    <option value="3x2" ${frame.section === '3x2' ? 'selected' : ''}>3 x 2</option>
                    <option value="4x2" ${frame.section === '4x2' ? 'selected' : ''}>4 x 2</option>
                    <option value="4x2.5" ${frame.section === '4x2.5' ? 'selected' : ''}>4 x 2.5</option>
                    <option value="5x2.5" ${frame.section === '5x2.5' ? 'selected' : ''}>5 x 2.5</option>
                    <option value="custom" ${!['3x2','4x2','4x2.5','5x2.5'].includes(frame.section) ? 'selected' : ''}>Custom</option>
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
                <input type="number" step="any" class="form-control num-cell" value="${rate || ''}" placeholder="₹/Rft" oninput="updateFrameField(${index}, 'rate', this.value)">
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

function addFrameRow() {
    if (!activeEstimate.wpcFrames) activeEstimate.wpcFrames = [];
    activeEstimate.wpcFrames.push({
        id: 'frame-' + Date.now(),
        frameType: 'WPC FRAME (IVORY)',
        section: '3x2',
        lengthFeet: 7,
        quantity: 2,
        rate: 65,
        notes: ''
    });
    renderFramesTable();
    calculateAll();
    syncA5PrintArea();
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
            alert('Estimate successfully saved and encrypted!');
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
            // Refresh saved history list in background without disturbing the active form
            await refreshSavedEstimatesList();
            alert('New party JSON imported successfully!\nAll old party data cleared and rendered completely fresh.');
        } else if (data.success) {
            closeImportModal();
            loadEstimateIntoForm(parsed);
            await refreshSavedEstimatesList();
            alert('JSON imported successfully!');
        } else {
            alert('Import failed: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        alert('Invalid JSON syntax: ' + err.message);
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
