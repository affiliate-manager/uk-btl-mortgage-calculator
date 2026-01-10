<?php
/**
 * UK Buy-to-Let Mortgage Calculator
 * Bank of England Rate Updater
 * 
 * This script fetches live data from the Bank of England IADB
 * and saves it to rates.json for the frontend calculator.
 * 
 * Set up a daily cron job to run this script:
 * 0 8 * * * php /path/to/update-rates.php
 * 
 * Sources:
 * - Bank of England Statistical Interactive Database (IADB)
 * - Series codes from: https://www.bankofengland.co.uk/boeapps/database/
 */

// Configuration
define('BOE_API_BASE', 'https://www.bankofengland.co.uk/boeapps/database/fromshowcolumns.asp');
define('OUTPUT_FILE', __DIR__ . '/rates.json');
define('LOG_FILE', __DIR__ . '/rates-update.log');

// Series codes for the data we need
$seriesCodes = [
    // Official Bank Rate (Base Rate)
    'IUDBEDR' => 'baseRate',
    
    // Mortgage rates - Quoted Household Interest Rates
    // 2-year fixed, 75% LTV
    'IUMBV34' => 'twoYearFixed75LTV',
    
    // 5-year fixed, 75% LTV  
    'IUMBV42' => 'fiveYearFixed75LTV',
    
    // 2-year fixed, 60% LTV
    'IUMBV67' => 'twoYearFixed60LTV',
    
    // 5-year fixed, 60% LTV
    'IUMBV75' => 'fiveYearFixed60LTV',
    
    // Standard Variable Rate (SVR)
    'IUMTLMV' => 'svr'
];

/**
 * Log message to file
 */
function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message\n";
    file_put_contents(LOG_FILE, $logEntry, FILE_APPEND);
    echo $logEntry;
}

/**
 * Fetch data from Bank of England IADB
 */
function fetchBOEData($seriesCode) {
    // Build the URL for the last 30 days of data
    $fromDate = date('d/M/Y', strtotime('-30 days'));
    $toDate = date('d/M/Y');
    
    $url = BOE_API_BASE . '?' . http_build_query([
        'SeriesCodes' => $seriesCode,
        'Datefrom' => $fromDate,
        'Dateto' => $toDate,
        'CSVF' => 'TN',  // Tabular, No titles - cleaner CSV
        'VPD' => 'Y',     // Include provisional data
        'VFD' => 'N'      // No footnotes
    ]);
    
    logMessage("Fetching: $seriesCode from BoE");
    
    // Initialize cURL
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_USERAGENT => 'UK-BTL-Calculator/1.0 (Lendlord)'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        logMessage("ERROR: cURL error for $seriesCode: $error");
        return null;
    }
    
    if ($httpCode !== 200) {
        logMessage("ERROR: HTTP $httpCode for $seriesCode");
        return null;
    }
    
    return $response;
}

/**
 * Parse CSV response from BoE
 */
function parseCSV($csv) {
    $lines = explode("\n", trim($csv));
    $data = [];
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) continue;
        
        // Split by comma
        $parts = str_getcsv($line);
        
        if (count($parts) >= 2) {
            $date = trim($parts[0]);
            $value = trim($parts[1]);
            
            // Skip header rows or non-numeric values
            if (is_numeric($value)) {
                $data[] = [
                    'date' => $date,
                    'value' => floatval($value)
                ];
            }
        }
    }
    
    return $data;
}

/**
 * Get the latest value from parsed data
 */
function getLatestValue($data) {
    if (empty($data)) {
        return null;
    }
    
    // Return the last (most recent) value
    $latest = end($data);
    return $latest['value'];
}

/**
 * Main update function
 */
function updateRates() {
    global $seriesCodes;
    
    logMessage("=== Starting rate update ===");
    
    $rates = [
        'lastUpdated' => date('Y-m-d\TH:i:s\Z'),
        'source' => 'Bank of England IADB',
        'mortgageRates' => []
    ];
    
    $success = true;
    
    foreach ($seriesCodes as $code => $name) {
        $csv = fetchBOEData($code);
        
        if ($csv === null) {
            logMessage("WARNING: Failed to fetch $name ($code)");
            $success = false;
            continue;
        }
        
        $data = parseCSV($csv);
        $value = getLatestValue($data);
        
        if ($value !== null) {
            if ($name === 'baseRate') {
                $rates['baseRate'] = $value;
                logMessage("SUCCESS: $name = $value%");
            } else {
                $rates['mortgageRates'][$name] = $value;
                logMessage("SUCCESS: $name = $value%");
            }
        } else {
            logMessage("WARNING: No valid data for $name ($code)");
        }
        
        // Small delay to be nice to the BoE server
        usleep(500000); // 0.5 seconds
    }
    
    // Only update the file if we got at least the base rate
    if (isset($rates['baseRate'])) {
        // Load existing data to preserve any values we couldn't fetch
        $existingData = [];
        if (file_exists(OUTPUT_FILE)) {
            $existingData = json_decode(file_get_contents(OUTPUT_FILE), true) ?: [];
        }
        
        // Merge with existing data (new data takes priority)
        if (!empty($existingData['mortgageRates'])) {
            $rates['mortgageRates'] = array_merge(
                $existingData['mortgageRates'],
                $rates['mortgageRates']
            );
        }
        
        // Add metadata
        $rates['nextMPCMeeting'] = getNextMPCMeeting();
        $rates['updateStatus'] = $success ? 'complete' : 'partial';
        
        // Save to file
        $json = json_encode($rates, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        file_put_contents(OUTPUT_FILE, $json);
        
        logMessage("Saved rates to " . OUTPUT_FILE);
    } else {
        logMessage("ERROR: Could not fetch base rate, keeping existing data");
    }
    
    logMessage("=== Update complete ===\n");
    
    return $success;
}

/**
 * Get the next MPC meeting date
 * MPC meets 8 times per year, roughly every 6 weeks
 */
function getNextMPCMeeting() {
    // 2026 MPC meeting dates (announced by BoE)
    $mpcDates = [
        '2026-02-06',
        '2026-03-20',
        '2026-05-08',
        '2026-06-19',
        '2026-08-07',
        '2026-09-18',
        '2026-11-05',
        '2026-12-18'
    ];
    
    $today = date('Y-m-d');
    
    foreach ($mpcDates as $date) {
        if ($date > $today) {
            return $date;
        }
    }
    
    // If we're past all 2026 dates, return first 2027 estimate
    return '2027-02-04';
}

/**
 * API endpoint - return current rates as JSON
 */
function serveRates() {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Cache-Control: public, max-age=3600'); // Cache for 1 hour
    
    if (file_exists(OUTPUT_FILE)) {
        echo file_get_contents(OUTPUT_FILE);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Rates data not available']);
    }
}

// Determine how script is being called
if (php_sapi_name() === 'cli') {
    // Running from command line (cron job)
    updateRates();
} elseif (isset($_GET['update']) && $_GET['update'] === 'true') {
    // Manual update trigger (protect this in production!)
    updateRates();
    serveRates();
} else {
    // Serve the current rates as JSON API
    serveRates();
}

