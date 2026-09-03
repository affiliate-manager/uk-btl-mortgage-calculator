<?php
/**
 * Decision in Principle - Lead Capture
 *
 * Receives leads from the Simmy DIP component on the calculator page,
 * appends them to dip-leads.csv and (optionally) emails a notification
 * so every lead lands with Simmy's team.
 */

// Set to Simmy's / the team's inbox to get an email per lead ('' = disabled)
define('DIP_NOTIFY_EMAIL', '');
define('DIP_LEADS_FILE', __DIR__ . '/dip-leads.csv');

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'POST only']);
    exit;
}

$raw = file_get_contents('php://input');
$lead = json_decode($raw, true);

if (!is_array($lead) || empty($lead['email']) || !filter_var($lead['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid lead payload']);
    exit;
}

$row = [
    date('Y-m-d H:i:s'),
    $lead['email'],
    (float)($lead['propertyValue'] ?? 0),
    (float)($lead['deposit'] ?? 0),
    (float)($lead['monthlyRent'] ?? 0),
    preg_replace('/[^a-z\-]/', '', (string)($lead['ownership'] ?? '')),
    preg_replace('/[^a-z0-9]/', '', (string)($lead['term'] ?? '')),
    (float)($lead['maxLoan'] ?? 0),
    (float)($lead['requestedLoan'] ?? 0),
    ($lead['decision'] ?? '') === 'pass' ? 'pass' : 'review',
];

$isNew = !file_exists(DIP_LEADS_FILE);
$fh = fopen(DIP_LEADS_FILE, 'a');
if ($fh === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not store lead']);
    exit;
}

flock($fh, LOCK_EX);
if ($isNew) {
    fputcsv($fh, ['timestamp', 'email', 'property_value', 'deposit', 'monthly_rent',
                  'ownership', 'term', 'max_loan', 'requested_loan', 'decision']);
}
fputcsv($fh, $row);
flock($fh, LOCK_UN);
fclose($fh);

if (DIP_NOTIFY_EMAIL !== '') {
    $subject = 'New DIP lead: ' . $lead['email'] . ' (' . $row[9] . ')';
    $body = "New Decision in Principle lead from the BTL calculator:\n\n"
          . 'Email: ' . $row[1] . "\n"
          . 'Property value: £' . number_format($row[2]) . "\n"
          . 'Deposit: £' . number_format($row[3]) . "\n"
          . 'Monthly rent: £' . number_format($row[4]) . "\n"
          . 'Ownership: ' . $row[5] . "\n"
          . 'Term: ' . $row[6] . "\n"
          . 'Max loan (indicative): £' . number_format($row[7]) . "\n"
          . 'Loan needed: £' . number_format($row[8]) . "\n"
          . 'Decision: ' . $row[9] . "\n";
    @mail(DIP_NOTIFY_EMAIL, $subject, $body);
}

echo json_encode(['success' => true]);
