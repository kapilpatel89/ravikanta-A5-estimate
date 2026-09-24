<?php
require_once __DIR__ . '/crypto.php';

if (!isAuthenticated()) {
    header('Location: index.php');
    exit;
}

$masterKey = $_SESSION['master_key'];
$estimates = getEstimates($masterKey) ?: [];
$config = getConfig();

$id = $_GET['id'] ?? '';
$estimate = null;

if (!empty($id)) {
    foreach ($estimates as $item) {
        if ($item['id'] === $id || ($item['orderNumber'] ?? '') === $id) {
            $estimate = $item;
            break;
        }
    }
}

if (!$estimate && !empty($estimates)) {
    $estimate = $estimates[0]; // Most recent
}

if (!$estimate) {
    echo "No estimate found.";
    exit;
}

// Calculate values for A5 printout
$doorsQty = 0;
$doorsSqft = 0;
$doorsAmt = 0;

$doorsList = $estimate['doors'] ?? [];
foreach ($doorsList as &$door) {
    $h = (float)($door['height'] ?? 0);
    $w = (float)($door['width'] ?? 0);
    $q = (int)($door['quantity'] ?? 0);
    $r = (float)($door['rate'] ?? 0);
    $sq = ($h * $w * $q) / 144;
    $am = $sq * $r;

    $door['calc_sqft'] = $sq;
    $door['calc_amt'] = $am;

    $doorsQty += $q;
    $doorsSqft += $sq;
    $doorsAmt += $am;
}
unset($door);

$framesQty = 0;
$framesRft = 0;
$framesAmt = 0;

$framesList = $estimate['wpcFrames'] ?? [];
foreach ($framesList as &$frame) {
    $l = (float)($frame['lengthFeet'] ?? 0);
    $q = (int)($frame['quantity'] ?? 0);
    $r = (float)($frame['rate'] ?? 0);
    $rf = $l * $q;
    $am = $rf * $r;

    $frame['calc_rft'] = $rf;
    $frame['calc_amt'] = $am;

    $framesQty += $q;
    $framesRft += $rf;
    $framesAmt += $am;
}
unset($frame);

$otherTotal = 0;
$adjustments = $estimate['otherCharges'] ?? [];
foreach ($adjustments as $adj) {
    $amt = (float)($adj['amount'] ?? 0);
    if (($adj['type'] ?? '+') === '-') {
        $otherTotal -= $amt;
    } else {
        $otherTotal += $amt;
    }
}

$subtotal = $doorsAmt + $framesAmt;
$netTotal = $subtotal + $otherTotal;
$billAmount = (float)($estimate['billAmount'] ?? 0);
$cashBalance = $netTotal - $billAmount;

function numberToWordsIndian($amount) {
    if (empty($amount) || $amount == 0) return 'INR Zero Only';
    $amount = round(abs((float)$amount));
    $ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
             'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    $tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    $convertUnderThousand = function($n) use ($ones, $tens) {
        $str = '';
        if ($n >= 100) {
            $str .= $ones[(int)floor($n / 100)] . ' Hundred ';
            $n %= 100;
        }
        if ($n >= 20) {
            $str .= $tens[(int)floor($n / 10)] . ' ';
            $n %= 10;
        }
        if ($n > 0) {
            $str .= $ones[(int)$n] . ' ';
        }
        return trim($str);
    };

    $crore = floor($amount / 10000000);
    $amount %= 10000000;
    $lakh = floor($amount / 100000);
    $amount %= 100000;
    $thousand = floor($amount / 1000);
    $amount %= 1000;
    $remainder = $amount;

    $res = '';
    if ($crore > 0) $res .= $convertUnderThousand($crore) . ' Crore ';
    if ($lakh > 0) $res .= $convertUnderThousand($lakh) . ' Lakh ';
    if ($thousand > 0) $res .= $convertUnderThousand($thousand) . ' Thousand ';
    if ($remainder > 0) $res .= $convertUnderThousand($remainder);

    return 'INR ' . trim($res) . ' Only';
}

$amountInWords = numberToWordsIndian($cashBalance > 0 ? $cashBalance : $netTotal);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estimate <?= htmlspecialchars($estimate['orderNumber'] ?? $estimate['id']) ?> - A5 Print</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/print-a5.css?v=<?= time() ?>">
    <style>
        body {
            background-color: #525659;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
        }
        .a5-page-sheet {
            width: 148mm;
            min-height: 210mm;
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            box-sizing: border-box;
        }
        .floating-controls {
            position: fixed;
            top: 16px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        }
        .float-btn {
            background: #4338ca;
            color: #ffffff;
            border: none;
            padding: 10px 18px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .float-btn:hover {
            background: #3730a3;
        }
        .float-btn-secondary {
            background: #ffffff;
            color: #1e293b;
        }
        .float-btn-secondary:hover {
            background: #f1f5f9;
        }
        @media print {
            body {
                background: #ffffff !important;
                padding: 0 !important;
            }
            .a5-page-sheet {
                box-shadow: none !important;
                width: 100% !important;
                border: 1.5px solid #000000 !important;
            }
            .floating-controls {
                display: none !important;
            }
        }
    </style>
</head>
<body>

    <div class="floating-controls no-print">
        <a href="index.php" class="float-btn float-btn-secondary">&larr; Back to App</a>
        <button type="button" class="float-btn" onclick="window.print()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print A5 Sheet
        </button>
    </div>

    <!-- Authentic Tally Bill Layout -->
    <div class="a5-page-sheet tally-bill-wrapper" id="a5PrintSheet">
        <!-- Top Title: ESTIMATE -->
        <div class="tally-top-title">ESTIMATE</div>

        <!-- Tally Structured Header Box (Party & Estimate Details) -->
        <table class="tally-meta-table">
            <tr>
                <td style="width: 58%;">
                    <div class="tally-label">Buyer / Party Name:</div>
                    <div class="tally-val" style="font-size:8.5pt; text-transform:uppercase;"><?= htmlspecialchars($estimate['partyName'] ?: 'CASH CUSTOMER') ?></div>
                    <?php if (!empty($estimate['partyAddress'])): ?>
                        <div style="margin-top:2px;">
                            <span class="tally-label">Destination / Site:</span>
                            <span style="font-weight:700;"><?= htmlspecialchars($estimate['partyAddress']) ?></span>
                        </div>
                    <?php endif; ?>
                </td>
                <td style="width: 42%;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                        <span class="tally-label">Estimate No.:</span>
                        <span class="tally-val-mono"><?= htmlspecialchars($estimate['orderNumber'] ?? $estimate['id']) ?></span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span class="tally-label">Dated:</span>
                        <span class="tally-val-mono"><?= htmlspecialchars(date('d-M-Y', strtotime($estimate['orderDate'] ?? 'now'))) ?></span>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Doors Section Table (Tally Grid) -->
        <?php if (!empty($doorsList)): ?>
        <div>
            <div class="tally-section-header">
                <span><?= (!empty($framesList) ? '1. ' : '') ?>DOORS SPECIFICATIONS</span>
                <span><?= $doorsQty ?> Doors | <?= number_format($doorsSqft, 2) ?> SQFT</span>
            </div>
            <table class="tally-data-table">
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
                <tbody>
                    <?php foreach ($doorsList as $idx => $door): ?>
                        <tr>
                            <td class="text-center font-mono"><?= $idx + 1 ?></td>
                            <td>
                                <div class="tally-item-title"><?= htmlspecialchars($door['doorType'] ?? 'DOOR') ?></div>
                                <?php if (!empty($door['flushDoorType']) || !empty($door['notes'])): ?>
                                    <div class="tally-item-subtext">
                                        <?= htmlspecialchars($door['flushDoorType'] ?? '') ?>
                                        <?= !empty($door['notes']) ? '(' . htmlspecialchars($door['notes']) . ')' : '' ?>
                                    </div>
                                <?php endif; ?>
                            </td>
                            <td class="text-center font-mono"><?= htmlspecialchars($door['designNo'] ?? '-') ?></td>
                            <td class="text-center font-mono"><?= htmlspecialchars($door['thickness'] ?? '-') ?></td>
                            <td class="text-center font-mono"><?= htmlspecialchars($door['height']) ?>" &times; <?= htmlspecialchars($door['width']) ?>"</td>
                            <td class="text-center font-mono bold"><?= htmlspecialchars($door['quantity']) ?></td>
                            <td class="text-right font-mono"><?= number_format($door['calc_sqft'], 2) ?></td>
                            <td class="text-right font-mono"><?= !empty($door['rate']) ? number_format((float)$door['rate'], 2) : '-' ?></td>
                            <td class="text-right font-mono bold"><?= number_format($door['calc_amt'], 2) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
                <tbody class="tally-table-totals">
                    <tr class="tally-table-total-row">
                        <td colspan="5" class="text-right bold">Doors Total:</td>
                        <td class="text-center font-mono bold"><?= $doorsQty ?></td>
                        <td class="text-right font-mono bold"><?= number_format($doorsSqft, 2) ?></td>
                        <td></td>
                        <td class="text-right font-mono bold"><?= number_format($doorsAmt, 2) ?></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <?php endif; ?>

        <!-- WPC Frames Section Table (Tally Grid) -->
        <?php if (!empty($framesList)): ?>
        <div>
            <div class="tally-section-header">
                <span><?= (!empty($doorsList) ? '2. ' : '') ?>WPC FRAMES SPECIFICATIONS</span>
                <span><?= $framesQty ?> Frames | <?= number_format($framesRft, 2) ?> RFT</span>
            </div>
            <table class="tally-data-table">
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
                <tbody>
                    <?php foreach ($framesList as $idx => $frame): ?>
                        <tr>
                            <td class="text-center font-mono"><?= $idx + 1 ?></td>
                            <td>
                                <div style="font-weight:700;"><?= htmlspecialchars($frame['frameType'] ?? 'WPC FRAME') ?></div>
                                <?php if (!empty($frame['notes'])): ?>
                                    <div style="font-size:6.5pt; color:#4b5563;"><?= htmlspecialchars($frame['notes']) ?></div>
                                <?php endif; ?>
                            </td>
                            <td class="text-center font-mono bold"><?= htmlspecialchars($frame['section'] ?? '-') ?></td>
                            <td class="text-center font-mono"><?= htmlspecialchars($frame['lengthFeet']) ?> ft</td>
                            <td class="text-center font-mono bold"><?= htmlspecialchars($frame['quantity']) ?></td>
                            <td class="text-right font-mono"><?= number_format($frame['calc_rft'], 2) ?></td>
                            <td class="text-right font-mono"><?= !empty($frame['rate']) ? number_format((float)$frame['rate'], 2) : '-' ?></td>
                            <td class="text-right font-mono bold"><?= number_format($frame['calc_amt'], 2) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
                <tbody class="tally-table-totals">
                    <tr class="tally-table-total-row">
                        <td colspan="4" class="text-right bold">Frames Total:</td>
                        <td class="text-center font-mono bold"><?= $framesQty ?></td>
                        <td class="text-right font-mono bold"><?= number_format($framesRft, 2) ?></td>
                        <td></td>
                        <td class="text-right font-mono bold"><?= number_format($framesAmt, 2) ?></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <?php endif; ?>

        <!-- Tally Bottom Grid: Amount in Words on Left, Totals on Right -->
        <div class="tally-bottom-grid">
            <div class="tally-words-box">
                <div>
                    <div class="tally-words-title">Amount Chargeable (in words):</div>
                    <div class="tally-words-text"><?= htmlspecialchars($amountInWords) ?></div>
                </div>
                <div class="tally-eoe">E. &amp; O.E.</div>
            </div>

            <table class="tally-totals-table">
                <tr>
                    <td class="bold">Sub Total:</td>
                    <td class="text-right font-mono bold">₹ <?= number_format($subtotal, 2) ?></td>
                </tr>
                <?php foreach ($adjustments as $adj): 
                    $amt = (float)($adj['amount'] ?? 0);
                    if ($amt == 0) continue;
                    $type = $adj['type'] ?? '+';
                ?>
                    <tr>
                        <td><?= htmlspecialchars($adj['description'] ?: 'Adjustment') ?> (<?= $type ?>):</td>
                        <td class="text-right font-mono"><?= $type === '-' ? '- ' : '+ ' ?>₹ <?= number_format($amt, 2) ?></td>
                    </tr>
                <?php endforeach; ?>
                <tr class="tally-total-row">
                    <td>TOTAL ESTIMATE:</td>
                    <td class="text-right font-mono">₹ <?= number_format($netTotal, 2) ?></td>
                </tr>
                <tr>
                    <td>Less: Bill Amount:</td>
                    <td class="text-right font-mono bold">₹ <?= number_format($billAmount, 2) ?></td>
                </tr>
                <tr class="tally-balance-row">
                    <td>CASH BALANCE:</td>
                    <td class="text-right font-mono">₹ <?= number_format($cashBalance, 2) ?></td>
                </tr>
            </table>
        </div>

        <!-- Dynamic Tally Multi-Page Counter (shown only if pages > 1) -->
        <div class="tally-page-footer" id="printPageCounter"></div>
    </div>

    <script>
        // Check if content exceeds 1 page (A5 printable height approx 760px at 96dpi)
        window.addEventListener('load', () => {
            const sheet = document.getElementById('a5PrintSheet');
            if (sheet) {
                const height = sheet.scrollHeight;
                if (height > 765) {
                    const totalPages = Math.ceil(height / 750);
                    document.body.classList.add('multipage-active');
                    
                    const printCounter = document.getElementById('printPageCounter');
                    if (printCounter) {
                        printCounter.innerText = `Total Pages: ${totalPages}`;
                    }
                }
            }
        });
    </script>
</body>
</html>
