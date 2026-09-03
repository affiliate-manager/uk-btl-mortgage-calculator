# Deploy script for UK BTL Calculator
# This script uploads the latest files to the Cloudways server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  UK BTL Calculator - Deploy Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$server = "hzxxyzgjuq@134.122.99.23"
$remotePath = "public_html/uk-btl-calculator/"
$localPath = "C:\Users\user\.cursor\UK buy to let mortgage calculator"

Write-Host "Uploading files to server..." -ForegroundColor Yellow
Write-Host ""

# Upload index.html
Write-Host "[1/5] Uploading index.html..." -ForegroundColor Green
scp "$localPath\index.html" "${server}:${remotePath}"

# Upload calculator.js
Write-Host "[2/5] Uploading calculator.js..." -ForegroundColor Green
scp "$localPath\calculator.js" "${server}:${remotePath}"

# Upload styles.css
Write-Host "[3/5] Uploading styles.css..." -ForegroundColor Green
scp "$localPath\styles.css" "${server}:${remotePath}"

# Upload data-api.js (drives live rate values shown in the calculator)
Write-Host "[4/5] Uploading data-api.js..." -ForegroundColor Green
scp "$localPath\data-api.js" "${server}:${remotePath}"

# Upload dip-lead.php (Decision in Principle lead capture endpoint)
Write-Host "[5/5] Uploading dip-lead.php..." -ForegroundColor Green
scp "$localPath\dip-lead.php" "${server}:${remotePath}"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Upload Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to Cloudways Console" -ForegroundColor White
Write-Host "2. Manage Services -> Varnish -> Purge" -ForegroundColor White
Write-Host "3. Clear WP Rocket cache (if installed)" -ForegroundColor White
Write-Host "4. Test: https://lendlord.io/uk-btl-calculator/" -ForegroundColor White
Write-Host ""

