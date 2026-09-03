/**
 * UK Buy-to-Let Mortgage Calculator
 * Lendlord - calculator.js
 * 
 * Comprehensive BTL calculator with PRA-compliant stress testing,
 * SDLT calculation, yield analysis, and Section 24 tax impact.
 */

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initToggleButtons();
    initSliders();
    initNavigation();
    initDataFromAPI();
    
    // Run initial calculations
    calculateAffordability();
    calculatePayments();
    calculateYield();
    calculateSDLT();
    calculateFullAnalysis();
    
    // Listen for live rate updates
    window.addEventListener('ratesUpdated', function(e) {
        console.log('🔄 Rates updated, refreshing calculations...');
        initDataFromAPI();
        calculateAffordability();
        calculatePayments();
        calculateFullAnalysis();
    });
});

/**
 * Initialize data from the DataAPI module
 */
function initDataFromAPI() {
    if (typeof DataAPI === 'undefined') {
        console.warn('DataAPI not loaded, using default values');
        return;
    }
    
    // Update hero section with live rates
    const baseRateData = DataAPI.getBaseRate();
    updateElement('base-rate', baseRateData.rate.toFixed(2) + '%');
    updateElement('base-rate-date', 'Updated: ' + formatDate(baseRateData.lastUpdated));
    
    // Update average BTL rate
    const btlRateData = DataAPI.getMortgageRate('5year', 75);
    updateElement('avg-btl-rate', btlRateData.rate.toFixed(2) + '%');
    
    // Update interest rate inputs with market averages (only on first load)
    if (!window.ratesInitialized) {
        const rateInputs = ['aff-interest-rate', 'pay-interest-rate', 'roi-rate'];
        rateInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input && !input.dataset.userModified) {
                input.value = btlRateData.rate.toFixed(2);
            }
        });
        window.ratesInitialized = true;
    }
    
    // Update data sources date
    const sources = DataAPI.getDataSourcesInfo();
    updateElement('last-data-update', formatDate(sources.boe.lastUpdated));
    
    // Show data source status
    const dataSource = DataAPI.BOE_DATA?.dataSource || 'unknown';
    const statusIcon = dataSource === 'live' ? '🟢' : dataSource === 'cached' ? '🟡' : '🔴';
    console.log(`${statusIcon} Calculator initialized with ${dataSource} data`);
    console.log('   Base Rate:', baseRateData.rate + '%');
    console.log('   5yr BTL Rate:', btlRateData.rate + '%');
}

/**
 * Format date string
 */
function formatDate(dateStr) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const [year, month] = dateStr.split('-');
    return months[parseInt(month) - 1] + ' ' + year;
}

// ============================================
// RENT ESTIMATOR
// ============================================

function estimateRent() {
    const postcode = document.getElementById('est-postcode')?.value || '';
    const bedrooms = document.getElementById('est-bedrooms')?.value || '2';
    
    if (!postcode.trim()) {
        alert('Please enter a postcode');
        return;
    }
    
    if (typeof DataAPI === 'undefined') {
        alert('Data API not available');
        return;
    }
    
    // Get rental estimate from ONS data
    const bedroomValue = bedrooms === 'room' || bedrooms === 'studio' ? bedrooms : parseInt(bedrooms);
    const estimate = DataAPI.getRentalEstimate(postcode, bedroomValue);
    
    // Update UI
    updateElement('est-lower', '£' + estimate.lower.toLocaleString());
    updateElement('est-median', '£' + estimate.median.toLocaleString());
    updateElement('est-upper', '£' + estimate.upper.toLocaleString());
    updateElement('est-region', 'Region: ' + estimate.region);
    updateElement('est-source', 'Source: ' + estimate.source + ' (' + estimate.lastUpdated + ')');
    
    // Show results
    const resultsDiv = document.getElementById('rent-estimate-results');
    if (resultsDiv) {
        resultsDiv.style.display = 'block';
    }
    
    // Store median for use in calculator
    window.estimatedRent = estimate.median;
}

function useEstimatedRent() {
    if (window.estimatedRent) {
        // Update affordability calculator input
        const affRentInput = document.getElementById('aff-rental-income');
        if (affRentInput) {
            affRentInput.value = window.estimatedRent;
            calculateAffordability();
        }
        
        // Update yield calculator input
        const yieldRentInput = document.getElementById('yield-monthly-rent');
        if (yieldRentInput) {
            yieldRentInput.value = window.estimatedRent;
            calculateYield();
        }
        
        // Update full analysis input
        const roiRentInput = document.getElementById('roi-rent');
        if (roiRentInput) {
            roiRentInput.value = window.estimatedRent;
            calculateFullAnalysis();
        }
        
        // Scroll to affordability section
        document.getElementById('affordability')?.scrollIntoView({ behavior: 'smooth' });
    }
}

// ============================================
// UI INTERACTIONS
// ============================================

function initToggleButtons() {
    document.querySelectorAll('.toggle-group').forEach(group => {
        const buttons = group.querySelectorAll('.toggle-btn');
        const hiddenInput = group.nextElementSibling?.tagName === 'INPUT' ? 
            group.nextElementSibling : 
            group.parentElement.querySelector('input[type="hidden"]');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', function() {
                buttons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                if (hiddenInput) {
                    hiddenInput.value = this.dataset.value;
                }
                
                // Handle special cases
                handleToggleChange(hiddenInput?.id, this.dataset.value);
            });
        });
    });
}

function handleToggleChange(inputId, value) {
    // Show/hide tax band for individual vs limited company
    if (inputId === 'aff-borrower-type') {
        const taxBandGroup = document.getElementById('tax-band-group');
        if (taxBandGroup) {
            taxBandGroup.style.display = value === 'limited' ? 'none' : 'block';
        }
        calculateAffordability();
    }
    
    if (inputId === 'aff-product-term') {
        calculateAffordability();
    }
    
    if (inputId === 'pay-add-fee') {
        calculatePayments();
    }
    
    if (inputId === 'sdlt-additional' || inputId === 'sdlt-nonresident') {
        calculateSDLT();
    }
    
    if (inputId === 'roi-ownership') {
        const taxBandGroup = document.getElementById('roi-tax-band-group');
        const taxImpactSection = document.getElementById('tax-impact-section');
        if (taxBandGroup) {
            taxBandGroup.style.display = value === 'limited' ? 'none' : 'block';
        }
        if (taxImpactSection) {
            taxImpactSection.style.display = value === 'limited' ? 'none' : 'block';
        }
        calculateFullAnalysis();
    }
}

function initSliders() {
    const termSlider = document.getElementById('pay-term-slider');
    const termInput = document.getElementById('pay-term');
    
    if (termSlider && termInput) {
        termSlider.addEventListener('input', function() {
            termInput.value = this.value;
            calculatePayments();
        });
        
        termInput.addEventListener('input', function() {
            termSlider.value = this.value;
            calculatePayments();
        });
    }
    
    // Add input listeners to all number inputs
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', debounce(function() {
            const section = this.closest('.calculator-section');
            if (section) {
                const sectionId = section.id;
                switch(sectionId) {
                    case 'affordability': calculateAffordability(); break;
                    case 'payments': calculatePayments(); break;
                    case 'yield': calculateYield(); break;
                    case 'sdlt': calculateSDLT(); break;
                    case 'analysis': calculateFullAnalysis(); break;
                }
            }
        }, 300));
    });
    
    // Add select listeners
    document.querySelectorAll('select').forEach(select => {
        select.addEventListener('change', function() {
            const section = this.closest('.calculator-section');
            if (section) {
                const sectionId = section.id;
                switch(sectionId) {
                    case 'affordability': calculateAffordability(); break;
                    case 'sdlt': calculateSDLT(); break;
                    case 'analysis': calculateFullAnalysis(); break;
                }
            }
        });
    });
}

function initNavigation() {
    const navItems = document.querySelectorAll('.calc-nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const target = this.dataset.target;
            const section = document.getElementById(target);
            
            if (section) {
                navItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    
    // Update nav on scroll
    window.addEventListener('scroll', debounce(function() {
        const sections = document.querySelectorAll('.calculator-section');
        let currentSection = '';
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 200 && rect.bottom >= 200) {
                currentSection = section.id;
            }
        });
        
        if (currentSection) {
            navItems.forEach(item => {
                item.classList.toggle('active', item.dataset.target === currentSection);
            });
        }
    }, 100));
}

function toggleExpand(btn) {
    const content = btn.nextElementSibling;
    btn.classList.toggle('active');
    content.classList.toggle('show');
    
    if (content.classList.contains('show')) {
        btn.querySelector('span').textContent = '− Hide Annual Costs';
    } else {
        btn.querySelector('span').textContent = '+ Add Annual Costs for Net Yield';
    }
}

// ============================================
// AFFORDABILITY CALCULATOR
// ============================================

function calculateAffordability() {
    // Get inputs
    const monthlyRent = parseFloat(document.getElementById('aff-rental-income')?.value) || 0;
    const borrowerType = document.getElementById('aff-borrower-type')?.value || 'individual';
    const taxBand = document.getElementById('aff-tax-band')?.value || 'basic';
    const productTerm = document.getElementById('aff-product-term')?.value || '5year';
    const interestRate = parseFloat(document.getElementById('aff-interest-rate')?.value) || 4.5;
    const propertyType = document.getElementById('aff-property-type')?.value || 'standard';
    
    // Use DataAPI if available for accurate calculations
    if (typeof DataAPI !== 'undefined') {
        const result = DataAPI.calculateMaxLoan(
            monthlyRent, 
            borrowerType, 
            taxBand, 
            propertyType, 
            productTerm, 
            interestRate
        );
        
        // Update UI with API results
        updateElement('aff-max-loan', formatCurrency(result.maxLoan));
        updateElement('aff-icr', result.icrPercentage);
        updateElement('aff-stress-rate', result.stressRateFormatted);
        updateElement('aff-annual-rent', formatCurrency(result.annualRent));
        updateElement('aff-required-cover', formatCurrency(result.requiredAnnualCover));
        updateElement('icr-explain', result.icrPercentage);
        
        return;
    }
    
    // Fallback calculation if DataAPI not available
    const annualRent = monthlyRent * 12;
    
    // Determine ICR based on borrower type and tax band
    let icr;
    let icrLabel;
    
    if (borrowerType === 'limited') {
        icr = 1.25;
        icrLabel = '125%';
    } else {
        switch(taxBand) {
            case 'basic':
                icr = 1.25;
                icrLabel = '125%';
                break;
            case 'higher':
            case 'additional':
                icr = 1.45;
                icrLabel = '145%';
                break;
            default:
                icr = 1.25;
                icrLabel = '125%';
        }
    }
    
    // Adjust ICR for property type
    if (propertyType === 'hmo-small') {
        icr = Math.max(icr, 1.45);
        icrLabel = Math.max(parseFloat(icrLabel), 145) + '%';
    } else if (propertyType === 'hmo-large' || propertyType === 'mufb') {
        icr = Math.max(icr, 1.60);
        icrLabel = Math.max(parseFloat(icrLabel), 160) + '%';
    }
    
    // Determine stress rate based on product term
    let stressRate;
    let stressRateLabel;
    
    if (productTerm === '5year') {
        // 5-year fixed: use pay rate
        stressRate = interestRate / 100;
        stressRateLabel = interestRate.toFixed(2) + '%';
    } else {
        // 2-year fixed: use higher of pay rate + 2% or 5.5%
        stressRate = Math.max(interestRate / 100 + 0.02, 0.055);
        stressRateLabel = (stressRate * 100).toFixed(2) + '%';
    }
    
    // Calculate maximum loan
    // Formula: Max Loan = Annual Rent / (Stress Rate × ICR)
    const maxLoan = annualRent / (stressRate * icr);
    const requiredCover = annualRent * icr;
    
    // Update UI
    updateElement('aff-max-loan', formatCurrency(maxLoan));
    updateElement('aff-icr', icrLabel);
    updateElement('aff-stress-rate', stressRateLabel);
    updateElement('aff-annual-rent', formatCurrency(annualRent));
    updateElement('aff-required-cover', formatCurrency(requiredCover));
    updateElement('icr-explain', icrLabel);
}

// ============================================
// MONTHLY PAYMENTS CALCULATOR
// ============================================

function calculatePayments() {
    // Get inputs
    let loanAmount = parseFloat(document.getElementById('pay-loan-amount')?.value) || 200000;
    const interestRate = parseFloat(document.getElementById('pay-interest-rate')?.value) || 4.5;
    const term = parseInt(document.getElementById('pay-term')?.value) || 25;
    const arrangementFee = parseFloat(document.getElementById('pay-arrangement-fee')?.value) || 999;
    const addFee = document.getElementById('pay-add-fee')?.value === 'yes';
    
    // Add fee to loan if selected
    if (addFee) {
        loanAmount += arrangementFee;
    }
    
    const monthlyRate = (interestRate / 100) / 12;
    const numberOfPayments = term * 12;
    
    // Interest-only calculation
    const interestOnlyMonthly = loanAmount * monthlyRate;
    const interestOnlyTotalInterest = interestOnlyMonthly * numberOfPayments;
    
    // Capital & Interest (Repayment) calculation
    // PMT formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    let repaymentMonthly;
    if (monthlyRate === 0) {
        repaymentMonthly = loanAmount / numberOfPayments;
    } else {
        repaymentMonthly = loanAmount * 
            (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
            (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    }
    
    const repaymentTotal = repaymentMonthly * numberOfPayments;
    const repaymentTotalInterest = repaymentTotal - loanAmount;
    
    // Monthly savings with interest-only
    const monthlyDiff = repaymentMonthly - interestOnlyMonthly;
    
    // Update UI
    updateElement('pay-interest-only', formatCurrency(interestOnlyMonthly));
    updateElement('pay-io-total-interest', formatCurrency(interestOnlyTotalInterest));
    updateElement('pay-io-balance', formatCurrency(loanAmount));
    
    updateElement('pay-repayment', formatCurrency(repaymentMonthly));
    updateElement('pay-rep-total-interest', formatCurrency(repaymentTotalInterest));
    updateElement('pay-rep-total', formatCurrency(repaymentTotal));
    
    updateElement('pay-monthly-diff', formatCurrency(monthlyDiff));
    
    // Generate repayment schedule
    generateRepaymentSchedule(loanAmount, monthlyRate, numberOfPayments, repaymentMonthly, term);
}

/**
 * Toggle repayment schedule visibility
 */
function toggleSchedule(btn) {
    const content = document.getElementById('schedule-content');
    btn.classList.toggle('active');
    content.classList.toggle('show');
    
    const span = btn.querySelector('span');
    if (content.classList.contains('show')) {
        span.textContent = 'Hide Repayment Schedule';
    } else {
        span.textContent = 'View Repayment Schedule';
    }
    
    // Re-create icons after toggle
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Store schedule data globally for view switching
 */
let scheduleData = {
    loanAmount: 0,
    monthlyRate: 0,
    monthlyPayment: 0,
    termYears: 0,
    yearlyData: [],
    monthlyData: []
};

/**
 * Generate repayment schedule data
 */
function generateRepaymentSchedule(loanAmount, monthlyRate, numberOfPayments, monthlyPayment, termYears) {
    // Store parameters for view switching
    scheduleData.loanAmount = loanAmount;
    scheduleData.monthlyRate = monthlyRate;
    scheduleData.monthlyPayment = monthlyPayment;
    scheduleData.termYears = termYears;
    scheduleData.yearlyData = [];
    scheduleData.monthlyData = [];
    
    let balance = loanAmount;
    let totalInterest = 0;
    let totalPaid = 0;
    
    // Generate data for all years and months
    for (let year = 1; year <= termYears; year++) {
        let yearlyPrincipal = 0;
        let yearlyInterest = 0;
        let yearlyPayment = 0;
        let monthsInYear = [];
        
        for (let month = 1; month <= 12; month++) {
            if (balance <= 0) break;
            
            const interestPayment = balance * monthlyRate;
            const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
            
            monthsInYear.push({
                month: month,
                payment: monthlyPayment,
                principal: principalPayment,
                interest: interestPayment,
                balance: Math.max(0, balance - principalPayment)
            });
            
            yearlyInterest += interestPayment;
            yearlyPrincipal += principalPayment;
            yearlyPayment += monthlyPayment;
            
            balance -= principalPayment;
            if (balance < 0) balance = 0;
        }
        
        totalInterest += yearlyInterest;
        totalPaid += yearlyPayment;
        
        scheduleData.yearlyData.push({
            year: year,
            payment: yearlyPayment,
            principal: yearlyPrincipal,
            interest: yearlyInterest,
            balance: balance
        });
        
        scheduleData.monthlyData.push(monthsInYear);
    }
    
    // Update summary
    updateElement('schedule-total-interest', formatCurrency(totalInterest));
    updateElement('schedule-total-paid', formatCurrency(totalPaid));
    
    // Populate year selector
    populateYearSelector(termYears);
    
    // Show yearly view by default
    renderYearlySchedule();
    
    // Hide year selector by default (only shown for monthly view)
    const yearSelect = document.getElementById('schedule-year-select');
    if (yearSelect) yearSelect.style.display = 'none';
}

/**
 * Populate year dropdown for monthly view
 */
function populateYearSelector(termYears) {
    const select = document.getElementById('schedule-year-select');
    if (!select) return;
    
    let html = '';
    for (let year = 1; year <= termYears; year++) {
        html += `<option value="${year}">Year ${year}</option>`;
    }
    select.innerHTML = html;
}

/**
 * Switch between yearly and monthly view
 */
function switchScheduleView(view) {
    const buttons = document.querySelectorAll('.schedule-view-btn');
    const yearSelect = document.getElementById('schedule-year-select');
    const periodHeader = document.getElementById('schedule-period-header');
    
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    if (view === 'monthly') {
        yearSelect.style.display = 'block';
        if (periodHeader) periodHeader.textContent = 'Month';
        showMonthlyForYear(yearSelect.value || 1);
    } else {
        yearSelect.style.display = 'none';
        if (periodHeader) periodHeader.textContent = 'Year';
        renderYearlySchedule();
    }
    
    // Re-create icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Render yearly schedule view
 */
function renderYearlySchedule() {
    const tbody = document.getElementById('schedule-tbody');
    if (!tbody || !scheduleData.yearlyData.length) return;
    
    let html = '';
    scheduleData.yearlyData.forEach(data => {
        html += `
            <tr>
                <td>Year ${data.year}</td>
                <td>${formatCurrency(data.payment)}</td>
                <td class="principal">${formatCurrency(data.principal)}</td>
                <td class="interest">${formatCurrency(data.interest)}</td>
                <td class="balance">${formatCurrency(data.balance)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * Show monthly breakdown for a specific year
 */
function showMonthlyForYear(year) {
    const tbody = document.getElementById('schedule-tbody');
    const yearIndex = parseInt(year) - 1;
    
    if (!tbody || !scheduleData.monthlyData[yearIndex]) return;
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = scheduleData.monthlyData[yearIndex];
    
    let html = '';
    months.forEach(data => {
        html += `
            <tr>
                <td>${monthNames[data.month - 1]}</td>
                <td>${formatCurrency(data.payment)}</td>
                <td class="principal">${formatCurrency(data.principal)}</td>
                <td class="interest">${formatCurrency(data.interest)}</td>
                <td class="balance">${formatCurrency(data.balance)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ============================================
// RENTAL YIELD CALCULATOR
// ============================================

function calculateYield() {
    // Get inputs
    const propertyPrice = parseFloat(document.getElementById('yield-property-price')?.value) || 250000;
    const monthlyRent = parseFloat(document.getElementById('yield-monthly-rent')?.value) || 1200;
    
    // Cost inputs
    const mortgageCost = parseFloat(document.getElementById('yield-mortgage-cost')?.value) || 0;
    const managementFees = parseFloat(document.getElementById('yield-management')?.value) || 0;
    const insurance = parseFloat(document.getElementById('yield-insurance')?.value) || 0;
    const maintenance = parseFloat(document.getElementById('yield-maintenance')?.value) || 0;
    const voidWeeks = parseFloat(document.getElementById('yield-void')?.value) || 0;
    const otherCosts = parseFloat(document.getElementById('yield-other')?.value) || 0;
    
    const annualRent = monthlyRent * 12;
    const voidLoss = (monthlyRent * voidWeeks) / 4.33; // Convert weeks to monthly equivalent
    
    const totalAnnualCosts = mortgageCost + managementFees + insurance + maintenance + voidLoss + otherCosts;
    
    // Gross yield
    const grossYield = (annualRent / propertyPrice) * 100;
    
    // Net yield (after costs)
    const netIncome = annualRent - totalAnnualCosts;
    const netYield = (netIncome / propertyPrice) * 100;
    
    // Monthly cashflow
    const monthlyCashflow = netIncome / 12;
    
    // Update UI
    updateElement('yield-gross', grossYield.toFixed(2) + '%');
    updateElement('yield-net', netYield.toFixed(2) + '%');
    updateElement('yield-annual-income', formatCurrency(annualRent));
    updateElement('yield-total-costs', formatCurrency(totalAnnualCosts));
    updateElement('yield-net-profit', formatCurrency(netIncome));
    updateElement('yield-monthly-cashflow', formatCurrency(monthlyCashflow));
    
    // Update gauges
    updateGauge('gross-gauge-fill', grossYield, 12);
    updateGauge('net-gauge-fill', Math.max(0, netYield), 12);
    
    // Update benchmark marker
    const marker = document.getElementById('yield-marker');
    if (marker) {
        // Position based on gross yield: 0-4% = 0-25%, 4-6% = 25-50%, 6-8% = 50-75%, 8%+ = 75-100%
        let position;
        if (grossYield < 4) {
            position = (grossYield / 4) * 25;
        } else if (grossYield < 6) {
            position = 25 + ((grossYield - 4) / 2) * 25;
        } else if (grossYield < 8) {
            position = 50 + ((grossYield - 6) / 2) * 25;
        } else {
            position = Math.min(75 + ((grossYield - 8) / 4) * 25, 98);
        }
        marker.style.left = position + '%';
    }
}

function updateGauge(elementId, value, maxValue) {
    const element = document.getElementById(elementId);
    if (element) {
        // The arc length is 126 (calculated from the SVG path)
        const percentage = Math.min(value / maxValue, 1);
        const offset = 126 - (126 * percentage);
        element.style.strokeDashoffset = offset;
    }
}

// ============================================
// STAMP DUTY CALCULATOR
// ============================================

function calculateSDLT() {
    const price = parseFloat(document.getElementById('sdlt-price')?.value) || 250000;
    const country = document.getElementById('sdlt-country')?.value || 'england';
    const isAdditional = document.getElementById('sdlt-additional')?.value === 'yes';
    const isNonResident = document.getElementById('sdlt-nonresident')?.value === 'yes';
    
    let result;
    
    switch(country) {
        case 'scotland':
            result = calculateLBTT(price, isAdditional);
            break;
        case 'wales':
            result = calculateLTT(price, isAdditional);
            break;
        default:
            result = calculateEnglandSDLT(price, isAdditional, isNonResident);
    }
    
    // Update UI
    updateElement('sdlt-total', formatCurrency(result.total));
    updateElement('sdlt-effective-rate', (result.total / price * 100).toFixed(2) + '%');
    
    // Update breakdown table
    const breakdownTable = document.getElementById('sdlt-breakdown-table');
    if (breakdownTable) {
        let html = '';
        result.breakdown.forEach(row => {
            html += `
                <div class="breakdown-row">
                    <span>${row.band}</span>
                    <span>${row.rate}</span>
                    <span>${formatCurrency(row.tax)}</span>
                </div>
            `;
        });
        html += `
            <div class="breakdown-row total">
                <span>Total</span>
                <span></span>
                <span>${formatCurrency(result.total)}</span>
            </div>
        `;
        breakdownTable.innerHTML = html;
    }
    
    // Update surcharge summary
    const surchargeSummary = document.getElementById('surcharge-summary');
    if (surchargeSummary) {
        let html = '';
        const country = document.getElementById('sdlt-country')?.value || 'england';
        const surchargeRate = country === 'scotland' ? '6%' : country === 'wales' ? '4%' : '5%';
        
        if (result.additionalSurcharge > 0) {
            html += `
                <div class="surcharge-item">
                    <span>Additional Property Surcharge (${surchargeRate})</span>
                    <span>+${formatCurrency(result.additionalSurcharge)}</span>
                </div>
            `;
        }
        if (result.nonResidentSurcharge > 0) {
            html += `
                <div class="surcharge-item">
                    <span>Non-Resident Surcharge (2%)</span>
                    <span>+${formatCurrency(result.nonResidentSurcharge)}</span>
                </div>
            `;
        }
        surchargeSummary.innerHTML = html;
        surchargeSummary.style.display = html ? 'block' : 'none';
    }
}

function calculateEnglandSDLT(price, isAdditional, isNonResident) {
    // SDLT bands for England & Northern Ireland (from April 2025)
    // Source: https://www.gov.uk/stamp-duty-land-tax
    // Note: Threshold reduced from £250k to £125k in April 2025
    const bands = [
        { threshold: 0, rate: 0 },
        { threshold: 125000, rate: 2 },      // £0 - £125k = 0%, £125k-£250k = 2%
        { threshold: 250000, rate: 5 },      // £250k - £925k = 5%
        { threshold: 925000, rate: 10 },     // £925k - £1.5m = 10%
        { threshold: 1500000, rate: 12 }     // Over £1.5m = 12%
    ];
    
    // Additional property surcharge INCREASED to 5% (from 3%) in October 2024
    const additionalRate = isAdditional ? 5 : 0;
    const nonResidentRate = isNonResident ? 2 : 0;
    const extraRate = additionalRate + nonResidentRate;
    
    let totalTax = 0;
    const breakdown = [];
    
    for (let i = 0; i < bands.length; i++) {
        const currentThreshold = bands[i].threshold;
        const nextThreshold = bands[i + 1]?.threshold || Infinity;
        const rate = bands[i].rate + extraRate;
        
        if (price > currentThreshold) {
            const taxableAmount = Math.min(price, nextThreshold) - currentThreshold;
            const tax = taxableAmount * (rate / 100);
            totalTax += tax;
            
            if (taxableAmount > 0) {
                breakdown.push({
                    band: `£${formatNumber(currentThreshold)} - £${nextThreshold === Infinity ? price.toLocaleString() : formatNumber(nextThreshold)}`,
                    rate: rate + '%',
                    tax: tax
                });
            }
        }
    }
    
    return {
        total: totalTax,
        breakdown: breakdown,
        additionalSurcharge: isAdditional ? price * 0.03 : 0,
        nonResidentSurcharge: isNonResident ? price * 0.02 : 0
    };
}

function calculateLBTT(price, isAdditional) {
    // Scotland LBTT bands (Land and Buildings Transaction Tax)
    // Source: https://www.revenue.scot/land-buildings-transaction-tax
    const bands = [
        { threshold: 0, rate: 0 },
        { threshold: 145000, rate: 2 },
        { threshold: 250000, rate: 5 },
        { threshold: 325000, rate: 10 },
        { threshold: 750000, rate: 12 }
    ];
    
    // Scotland Additional Dwelling Supplement (ADS) is 6%
    const additionalRate = isAdditional ? 6 : 0;
    
    let totalTax = 0;
    const breakdown = [];
    
    // Additional Dwelling Supplement is on full price
    const ads = isAdditional ? price * 0.06 : 0;
    
    for (let i = 0; i < bands.length; i++) {
        const currentThreshold = bands[i].threshold;
        const nextThreshold = bands[i + 1]?.threshold || Infinity;
        const rate = bands[i].rate;
        
        if (price > currentThreshold) {
            const taxableAmount = Math.min(price, nextThreshold) - currentThreshold;
            const tax = taxableAmount * (rate / 100);
            totalTax += tax;
            
            if (taxableAmount > 0) {
                breakdown.push({
                    band: `£${formatNumber(currentThreshold)} - £${nextThreshold === Infinity ? price.toLocaleString() : formatNumber(nextThreshold)}`,
                    rate: rate + '%',
                    tax: tax
                });
            }
        }
    }
    
    if (ads > 0) {
        breakdown.push({
            band: 'Additional Dwelling Supplement',
            rate: '6%',
            tax: ads
        });
    }
    
    return {
        total: totalTax + ads,
        breakdown: breakdown,
        additionalSurcharge: ads,
        nonResidentSurcharge: 0
    };
}

function calculateLTT(price, isAdditional) {
    // Wales LTT bands (Land Transaction Tax)
    // Source: https://www.gov.wales/land-transaction-tax-rates
    const bands = [
        { threshold: 0, rate: 0 },
        { threshold: 225000, rate: 6 },
        { threshold: 400000, rate: 7.5 },
        { threshold: 750000, rate: 10 },
        { threshold: 1500000, rate: 12 }
    ];
    
    // Wales higher rates for additional properties is 4%
    const additionalRate = isAdditional ? 4 : 0;
    
    let totalTax = 0;
    const breakdown = [];
    
    for (let i = 0; i < bands.length; i++) {
        const currentThreshold = bands[i].threshold;
        const nextThreshold = bands[i + 1]?.threshold || Infinity;
        let rate = bands[i].rate;
        
        // For additional properties, add 4% to each band
        if (isAdditional) {
            rate += 4;
        }
        
        if (price > currentThreshold) {
            const taxableAmount = Math.min(price, nextThreshold) - currentThreshold;
            const tax = taxableAmount * (rate / 100);
            totalTax += tax;
            
            if (taxableAmount > 0) {
                breakdown.push({
                    band: `£${formatNumber(currentThreshold)} - £${nextThreshold === Infinity ? price.toLocaleString() : formatNumber(nextThreshold)}`,
                    rate: rate + '%',
                    tax: tax
                });
            }
        }
    }
    
    return {
        total: totalTax,
        breakdown: breakdown,
        additionalSurcharge: isAdditional ? totalTax * (4 / (bands[0].rate + 4)) : 0, // Approximate
        nonResidentSurcharge: 0
    };
}

// ============================================
// FULL INVESTMENT ANALYSIS
// ============================================

function calculateFullAnalysis() {
    // Property details
    const purchasePrice = parseFloat(document.getElementById('roi-price')?.value) || 250000;
    const monthlyRent = parseFloat(document.getElementById('roi-rent')?.value) || 1200;
    
    // Mortgage details
    const ltv = parseFloat(document.getElementById('roi-ltv')?.value) || 75;
    const interestRate = parseFloat(document.getElementById('roi-rate')?.value) || 4.5;
    
    // Purchase costs
    const legalFees = parseFloat(document.getElementById('roi-legal')?.value) || 1500;
    const surveyFees = parseFloat(document.getElementById('roi-survey')?.value) || 500;
    const refurb = parseFloat(document.getElementById('roi-refurb')?.value) || 0;
    
    // Tax & ownership
    const ownership = document.getElementById('roi-ownership')?.value || 'individual';
    const taxBand = document.getElementById('roi-tax-band')?.value || 'higher';
    
    // Calculate mortgage
    const loanAmount = purchasePrice * (ltv / 100);
    const deposit = purchasePrice - loanAmount;
    
    // Calculate SDLT (assuming additional property in England)
    const sdltResult = calculateEnglandSDLT(purchasePrice, true, false);
    const stampDuty = sdltResult.total;
    
    // Total capital required
    const totalCapital = deposit + stampDuty + legalFees + surveyFees + refurb;
    
    // Annual figures
    const annualRent = monthlyRent * 12;
    const annualMortgageInterest = loanAmount * (interestRate / 100);
    const monthlyMortgage = annualMortgageInterest / 12;
    
    // Estimated annual costs (management 10%, maintenance 1%, insurance, voids 2 weeks)
    const managementCost = annualRent * 0.10;
    const maintenanceCost = purchasePrice * 0.01;
    const insuranceCost = 350;
    const voidCost = monthlyRent * 0.5; // ~2 weeks
    const totalOperatingCosts = managementCost + maintenanceCost + insuranceCost + voidCost;
    
    // Net operating income
    const noi = annualRent - totalOperatingCosts;
    
    // Cashflow (NOI - Mortgage Interest)
    const annualCashflow = noi - annualMortgageInterest;
    const monthlyCashflow = annualCashflow / 12;
    
    // Gross yield
    const grossYield = (annualRent / purchasePrice) * 100;
    
    // Cash-on-cash return
    const cashOnCash = (annualCashflow / totalCapital) * 100;
    
    // Section 24 Tax Calculation (for individuals)
    let taxOld = 0;
    let taxNew = 0;
    let taxDifference = 0;
    
    if (ownership === 'individual') {
        const taxRates = {
            'basic': 0.20,
            'higher': 0.40,
            'additional': 0.45
        };
        const taxRate = taxRates[taxBand] || 0.40;
        
        // Old rules (pre-2020): Deduct interest before tax
        const taxableIncomeOld = Math.max(0, annualRent - totalOperatingCosts - annualMortgageInterest);
        taxOld = taxableIncomeOld * taxRate;
        
        // New rules (Section 24): Tax on full profit, 20% credit on interest
        const taxableIncomeNew = Math.max(0, annualRent - totalOperatingCosts);
        const taxBeforeCredit = taxableIncomeNew * taxRate;
        const taxCredit = annualMortgageInterest * 0.20;
        taxNew = Math.max(0, taxBeforeCredit - taxCredit);
        
        taxDifference = taxNew - taxOld;
    }
    
    // Update UI - Summary cards
    updateElement('roi-total-capital', formatCurrency(totalCapital));
    updateElement('roi-cash-on-cash', cashOnCash.toFixed(2) + '%');
    updateElement('roi-monthly-profit', formatCurrency(monthlyCashflow));
    updateElement('roi-gross-yield', grossYield.toFixed(2) + '%');
    
    // Capital breakdown
    const capitalBreakdown = document.getElementById('capital-breakdown');
    if (capitalBreakdown) {
        capitalBreakdown.innerHTML = `
            <div class="detail-row">
                <span>Deposit (${100 - ltv}%)</span>
                <span>${formatCurrency(deposit)}</span>
            </div>
            <div class="detail-row">
                <span>Stamp Duty (SDLT)</span>
                <span>${formatCurrency(stampDuty)}</span>
            </div>
            <div class="detail-row">
                <span>Legal Fees</span>
                <span>${formatCurrency(legalFees)}</span>
            </div>
            <div class="detail-row">
                <span>Survey/Valuation</span>
                <span>${formatCurrency(surveyFees)}</span>
            </div>
            ${refurb > 0 ? `
            <div class="detail-row">
                <span>Refurbishment</span>
                <span>${formatCurrency(refurb)}</span>
            </div>
            ` : ''}
            <div class="detail-row">
                <span>Total Capital Required</span>
                <span>${formatCurrency(totalCapital)}</span>
            </div>
        `;
    }
    
    // Cashflow breakdown
    const cashflowBreakdown = document.getElementById('cashflow-breakdown');
    if (cashflowBreakdown) {
        const cashflowClass = monthlyCashflow >= 0 ? 'positive' : 'negative';
        cashflowBreakdown.innerHTML = `
            <div class="detail-row">
                <span>Monthly Rent</span>
                <span>+${formatCurrency(monthlyRent)}</span>
            </div>
            <div class="detail-row negative">
                <span>Mortgage Interest</span>
                <span>-${formatCurrency(monthlyMortgage)}</span>
            </div>
            <div class="detail-row negative">
                <span>Management (10%)</span>
                <span>-${formatCurrency(managementCost / 12)}</span>
            </div>
            <div class="detail-row negative">
                <span>Maintenance</span>
                <span>-${formatCurrency(maintenanceCost / 12)}</span>
            </div>
            <div class="detail-row negative">
                <span>Insurance</span>
                <span>-${formatCurrency(insuranceCost / 12)}</span>
            </div>
            <div class="detail-row ${cashflowClass}">
                <span>Net Monthly Cashflow</span>
                <span>${monthlyCashflow >= 0 ? '+' : ''}${formatCurrency(monthlyCashflow)}</span>
            </div>
        `;
    }
    
    // Tax impact (only for individuals)
    if (ownership === 'individual') {
        updateElement('tax-old', formatCurrency(taxOld));
        updateElement('tax-new', formatCurrency(taxNew));
        
        const taxDifferenceEl = document.getElementById('tax-difference');
        if (taxDifferenceEl) {
            if (taxDifference > 0) {
                taxDifferenceEl.innerHTML = `
                    <strong>Section 24 costs you an extra ${formatCurrency(taxDifference)}/year</strong>
                    <br><small>Consider a Limited Company structure for future purchases</small>
                `;
                taxDifferenceEl.style.display = 'block';
            } else {
                taxDifferenceEl.style.display = 'none';
            }
        }
    }
    
    // Verdict
    const verdictBox = document.getElementById('verdict-box');
    const verdictText = document.getElementById('verdict-text');
    
    if (verdictBox && verdictText) {
        let verdict = '';
        let verdictClass = 'success';
        
        if (monthlyCashflow >= 200 && grossYield >= 6 && cashOnCash >= 8) {
            verdict = `Excellent investment! Strong positive cashflow of ${formatCurrency(monthlyCashflow)}/month with ${cashOnCash.toFixed(1)}% cash-on-cash return.`;
            verdictClass = 'success';
        } else if (monthlyCashflow >= 0 && grossYield >= 5) {
            verdict = `Good investment. Positive cashflow with ${grossYield.toFixed(1)}% gross yield. Consider negotiating price or increasing rent for better returns.`;
            verdictClass = 'success';
        } else if (monthlyCashflow >= -100) {
            verdict = `Marginal investment. Slight negative cashflow but may be viable for capital growth. Ensure you have reserves to cover shortfall.`;
            verdictClass = 'warning';
            verdictBox.classList.remove('success');
            verdictBox.classList.add('warning');
        } else {
            verdict = `Caution advised. Negative cashflow of ${formatCurrency(Math.abs(monthlyCashflow))}/month. This deal may not stack up unless you're targeting capital growth in a prime location.`;
            verdictClass = 'warning';
        }
        
        verdictBox.className = `info-box ${verdictClass}`;
        // Update icon using Lucide
        const iconElement = document.getElementById('verdict-icon');
        if (iconElement && typeof lucide !== 'undefined') {
            iconElement.setAttribute('data-lucide', verdictClass === 'success' ? 'check-circle' : 'alert-triangle');
            lucide.createIcons();
        }
        verdictText.textContent = verdict;
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(value) {
    if (isNaN(value) || !isFinite(value)) return '£0';
    
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1000000) {
        return sign + '£' + (absValue / 1000000).toFixed(2) + 'M';
    }
    
    return sign + '£' + absValue.toLocaleString('en-GB', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatNumber(value) {
    return value.toLocaleString('en-GB');
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// DECISION IN PRINCIPLE (SIMMY) - 3-STEP FLOW
// ============================================

const DIP_BROKER_URL = 'https://app.lendlord.io/online-mortgage-broker?country=uk&utm_source=btl_mortgage_calculator&utm_campaign=dip_simmy';
const DIP_LEAD_ENDPOINT = 'dip-lead.php';

document.addEventListener('DOMContentLoaded', initDIPFlow);

function initDIPFlow() {
    const card = document.getElementById('dip-card');
    if (!card) return;

    card.querySelectorAll('[data-dip-goto]').forEach(btn => {
        btn.addEventListener('click', () => dipGoToStep(btn.dataset.dipGoto));
    });

    const submitBtn = document.getElementById('dip-submit');
    submitBtn.addEventListener('click', submitDIP);

    document.getElementById('dip-email').addEventListener('keydown', e => {
        if (e.key === 'Enter') submitDIP();
    });
}

function dipGoToStep(step) {
    const card = document.getElementById('dip-card');

    // Light validation before moving forward
    if (step === '2') {
        const value = parseFloat(document.getElementById('dip-value').value) || 0;
        const deposit = parseFloat(document.getElementById('dip-deposit').value) || 0;
        if (value <= 0 || deposit <= 0 || deposit >= value) return;
    }
    if (step === '3') {
        const rent = parseFloat(document.getElementById('dip-rent').value) || 0;
        if (rent <= 0) return;
    }

    card.querySelectorAll('.dip-step').forEach(el => {
        el.classList.toggle('active', el.dataset.dipStep === step);
    });

    const dots = card.querySelectorAll('.dip-dot');
    const stepIndex = step === 'result' ? 2 : parseInt(step) - 1;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === stepIndex));
}

/**
 * Compute the indicative decision using the same PRA ICR model
 * as the affordability calculator.
 */
function computeDIPDecision() {
    const value = parseFloat(document.getElementById('dip-value').value) || 0;
    const deposit = parseFloat(document.getElementById('dip-deposit').value) || 0;
    const rent = parseFloat(document.getElementById('dip-rent').value) || 0;
    const ownership = document.getElementById('dip-ownership').value;
    const term = document.getElementById('dip-term').value;

    // Pay rate from live market data when available
    let payRate5 = 5.66, payRate2 = 5.27;
    if (typeof DataAPI !== 'undefined') {
        payRate5 = DataAPI.getMortgageRate('5year', 75).rate;
        payRate2 = DataAPI.getMortgageRate('2year', 75).rate;
    }

    const payRate = term === '5yr' ? payRate5 : payRate2;
    // 5yr fixes: stressed at pay rate (min 4.5%). Shorter: max(5.5%, pay + 2%)
    const stressRate = term === '5yr' ? Math.max(payRate, 4.5) : Math.max(5.5, payRate + 2);
    const icr = ownership === 'personal-higher' ? 1.45 : 1.25;

    const icrMaxLoan = (rent * 12) / ((stressRate / 100) * icr);
    const ltvMaxLoan = value * 0.75;
    const maxLoan = Math.min(icrMaxLoan, ltvMaxLoan);
    const requestedLoan = Math.max(value - deposit, 0);

    return {
        value, deposit, rent, ownership, term,
        stressRate, icr, maxLoan, requestedLoan,
        passes: requestedLoan > 0 && requestedLoan <= maxLoan,
        // Rent that would support the requested loan (for the "needs adjusting" path)
        rentNeeded: (requestedLoan * (stressRate / 100) * icr) / 12
    };
}

function submitDIP() {
    const emailInput = document.getElementById('dip-email');
    const email = emailInput.value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        emailInput.style.borderColor = 'var(--red)';
        emailInput.focus();
        return;
    }
    emailInput.style.borderColor = '';

    const decision = computeDIPDecision();
    sendDIPLead(email, decision);
    renderDIPResult(email, decision);
    dipGoToStep('result');
}

/**
 * Send the lead to the backend so Simmy's team can follow up.
 * Never blocks the UI - the user gets their result either way.
 */
function sendDIPLead(email, decision) {
    const lead = {
        email: email,
        propertyValue: decision.value,
        deposit: decision.deposit,
        monthlyRent: decision.rent,
        ownership: decision.ownership,
        term: decision.term,
        maxLoan: Math.round(decision.maxLoan),
        requestedLoan: Math.round(decision.requestedLoan),
        decision: decision.passes ? 'pass' : 'review',
        page: window.location.href,
        submittedAt: new Date().toISOString()
    };

    // Keep a local copy in case the endpoint is unreachable
    try {
        const stored = JSON.parse(localStorage.getItem('dip_leads') || '[]');
        stored.push(lead);
        localStorage.setItem('dip_leads', JSON.stringify(stored));
    } catch (e) { /* storage unavailable - ignore */ }

    fetch(DIP_LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
    }).catch(() => console.warn('DIP lead endpoint unreachable - lead kept in localStorage'));
}

function renderDIPResult(email, d) {
    const container = document.getElementById('dip-result');
    const ownershipLabel = d.ownership === 'ltd' ? 'a limited company'
        : d.ownership === 'personal-basic' ? 'a basic-rate taxpayer'
        : 'a higher-rate taxpayer';

    const badge = d.passes
        ? '<span class="dip-decision-badge pass">In principle: yes</span>'
        : '<span class="dip-decision-badge review">Nearly there, let\'s adjust it</span>';

    const explain = 'Based on ' + formatCurrency(d.rent) + '/month rent, stress-tested at '
        + d.stressRate.toFixed(2) + '% with ' + Math.round(d.icr * 100) + '% interest cover as '
        + ownershipLabel + ', capped at 75% LTV.';

    const personalNote = d.passes
        ? '<strong>You\'re in good shape.</strong> Your rent comfortably supports the '
            + formatCurrency(d.requestedLoan) + ' you need. I\'ve sent a copy to <strong>' + escapeDIPHtml(email)
            + '</strong> and I\'ll personally review your details and follow up within one working day with the lenders I\'d put you in front of.'
        : '<strong>Don\'t worry, this is fixable.</strong> Rent of about <strong>' + formatCurrency(d.rentNeeded)
            + '/month</strong> would support the loan you need, or a deposit of <strong>' + formatCurrency(Math.max(d.value - d.maxLoan, 0))
            + '</strong> would do it. I\'ve sent the numbers to <strong>' + escapeDIPHtml(email)
            + '</strong> and I\'ll personally look at ways to make this work. Top slicing and specialist lenders often unlock deals like yours.';

    container.innerHTML = badge
        + '<div class="dip-result-amount">' + formatCurrency(d.maxLoan) + '</div>'
        + '<div class="dip-result-amount-label">Your indicative borrowing, in principle</div>'
        + '<div class="dip-result-note">' + personalNote + '</div>'
        + '<p class="dip-signoff">Simmy Kaur, Director of Buy-to-Let Mortgages</p>'
        + '<div class="dip-actions">'
        + '<a href="' + DIP_BROKER_URL + '" target="_blank" rel="noopener" class="btn btn-primary dip-btn">Book a call with me</a>'
        + '<button type="button" class="btn dip-btn dip-btn-back" data-dip-goto="1">Start over</button>'
        + '</div>'
        + '<p class="dip-smallprint">' + explain + ' Indicative only, not a credit decision or formal DIP. No credit check was performed.</p>';

    container.querySelector('[data-dip-goto]').addEventListener('click', function() {
        dipGoToStep(this.dataset.dipGoto);
    });
}

function escapeDIPHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

