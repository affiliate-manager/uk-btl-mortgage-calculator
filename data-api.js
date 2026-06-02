/**
 * UK Buy-to-Let Mortgage Calculator
 * Data API Module - Official UK Government Data Sources
 * 
 * Sources:
 * - Bank of England Statistical Interactive Database (IADB)
 * - ONS Private Rental Market Statistics
 * - UK House Price Index
 * 
 * This module loads live data from update-rates.php when available,
 * with fallback to hardcoded defaults.
 */

// ============================================
// BANK OF ENGLAND DATA
// Default values (overridden by live API when available)
// ============================================

let BOE_DATA = {
    // Last updated: December 2025
    lastUpdated: '2025-12-18',
    
    // Official Bank Rate (Base Rate)
    baseRate: 3.75,
    
    // Next MPC meeting
    nextMPCMeeting: '2026-02-06',
    
    // Quoted Household Interest Rates - BTL Mortgages
    // Source: Mojo / Moneyfacts / Major UK Lenders (June 2026)
    // Note: Rates with typical 2-3% arrangement fee
    mortgageRates: {
        twoYearFixed75LTV: 3.89,    // 2yr fixed, 75% LTV
        fiveYearFixed75LTV: 5.53,   // 5yr fixed, 75% LTV (most popular)
        twoYearFixed60LTV: 3.69,    // 2yr fixed, 60% LTV
        fiveYearFixed60LTV: 3.44,   // 5yr fixed, 60% LTV
        fiveYearFixed80LTV: 4.68,   // 5yr fixed, 80% LTV
        svr: 7.00                    // Standard Variable Rate
    },
    
    // Historical Bank Rate for trend display
    baseRateHistory: [
        { date: '2024-08', rate: 5.00 },
        { date: '2024-11', rate: 4.75 },
        { date: '2025-02', rate: 4.50 },
        { date: '2025-05', rate: 4.25 },
        { date: '2025-08', rate: 4.00 },
        { date: '2025-11', rate: 3.75 },
        { date: '2025-12', rate: 3.75 }
    ],
    
    // Data source status
    dataSource: 'fallback',
    updateStatus: 'using defaults'
};

// ============================================
// LIVE DATA LOADER
// Fetches from update-rates.php endpoint
// ============================================

/**
 * Load live rates from the PHP backend
 * Call this on page load to get the latest data
 */
async function loadLiveRates() {
    try {
        // Try to fetch from the PHP endpoint
        const response = await fetch('update-rates.php', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const liveData = await response.json();
        
        // Validate the response has required fields
        if (liveData.baseRate && liveData.mortgageRates) {
            // Update BOE_DATA with live values
            BOE_DATA.baseRate = liveData.baseRate;
            BOE_DATA.lastUpdated = liveData.lastUpdated || BOE_DATA.lastUpdated;
            BOE_DATA.nextMPCMeeting = liveData.nextMPCMeeting || BOE_DATA.nextMPCMeeting;
            BOE_DATA.dataSource = 'live';
            BOE_DATA.updateStatus = liveData.updateStatus || 'live data';
            
            // Merge mortgage rates
            if (liveData.mortgageRates) {
                BOE_DATA.mortgageRates = {
                    ...BOE_DATA.mortgageRates,
                    ...liveData.mortgageRates
                };
            }
            
            console.log('✅ Live rates loaded from Bank of England');
            console.log('   Base Rate:', BOE_DATA.baseRate + '%');
            console.log('   Last Updated:', BOE_DATA.lastUpdated);
            
            // Dispatch event so calculator can update
            window.dispatchEvent(new CustomEvent('ratesUpdated', { detail: BOE_DATA }));
            
            return true;
        } else {
            throw new Error('Invalid response format');
        }
        
    } catch (error) {
        console.warn('⚠️ Could not load live rates, using defaults:', error.message);
        BOE_DATA.dataSource = 'fallback';
        BOE_DATA.updateStatus = 'using cached defaults';
        return false;
    }
}

/**
 * Try to load rates from rates.json (static file alternative)
 */
async function loadCachedRates() {
    try {
        const response = await fetch('rates.json');
        if (response.ok) {
            const data = await response.json();
            if (data.baseRate) {
                BOE_DATA = { ...BOE_DATA, ...data, dataSource: 'cached' };
                console.log('📁 Loaded cached rates from rates.json');
                return true;
            }
        }
    } catch (e) {
        // Silent fail - will use defaults
    }
    return false;
}

// Auto-load rates when script loads
(async function initRates() {
    // Try live API first, then cached file, then use defaults
    const liveLoaded = await loadLiveRates();
    if (!liveLoaded) {
        await loadCachedRates();
    }
})();

// ============================================
// ONS PRIVATE RENTAL MARKET DATA
// Source: ONS Private rental market summary statistics
// https://www.ons.gov.uk/peoplepopulationandcommunity/housing/datasets/privaterentalmarketsummarystatisticsinengland
// Data: October 2024 release (latest available)
// ============================================

const ONS_RENTAL_DATA = {
    lastUpdated: '2024-10',
    
    // Median monthly rents by region and bedroom count
    // Format: region -> bedrooms -> { lower, median, upper }
    regions: {
        'england': {
            name: 'England',
            room: { lower: 450, median: 550, upper: 650 },
            studio: { lower: 550, median: 700, upper: 850 },
            1: { lower: 650, median: 825, upper: 1050 },
            2: { lower: 750, median: 950, upper: 1250 },
            3: { lower: 900, median: 1150, upper: 1500 },
            4: { lower: 1200, median: 1550, upper: 2100 }
        },
        'london': {
            name: 'London',
            room: { lower: 700, median: 850, upper: 1000 },
            studio: { lower: 1100, median: 1350, upper: 1600 },
            1: { lower: 1400, median: 1700, upper: 2100 },
            2: { lower: 1700, median: 2100, upper: 2600 },
            3: { lower: 2000, median: 2500, upper: 3200 },
            4: { lower: 2500, median: 3200, upper: 4500 }
        },
        'south-east': {
            name: 'South East',
            room: { lower: 500, median: 600, upper: 725 },
            studio: { lower: 650, median: 800, upper: 950 },
            1: { lower: 800, median: 975, upper: 1200 },
            2: { lower: 950, median: 1175, upper: 1450 },
            3: { lower: 1150, median: 1400, upper: 1750 },
            4: { lower: 1500, median: 1900, upper: 2500 }
        },
        'south-west': {
            name: 'South West',
            room: { lower: 425, median: 525, upper: 625 },
            studio: { lower: 550, median: 675, upper: 800 },
            1: { lower: 650, median: 800, upper: 975 },
            2: { lower: 775, median: 950, upper: 1175 },
            3: { lower: 950, median: 1150, upper: 1425 },
            4: { lower: 1200, median: 1500, upper: 1950 }
        },
        'east': {
            name: 'East of England',
            room: { lower: 475, median: 575, upper: 700 },
            studio: { lower: 600, median: 750, upper: 900 },
            1: { lower: 725, median: 900, upper: 1100 },
            2: { lower: 875, median: 1075, upper: 1325 },
            3: { lower: 1050, median: 1300, upper: 1600 },
            4: { lower: 1350, median: 1700, upper: 2200 }
        },
        'west-midlands': {
            name: 'West Midlands',
            room: { lower: 400, median: 495, upper: 595 },
            studio: { lower: 500, median: 625, upper: 750 },
            1: { lower: 595, median: 750, upper: 925 },
            2: { lower: 700, median: 875, upper: 1075 },
            3: { lower: 850, median: 1050, upper: 1300 },
            4: { lower: 1100, median: 1400, upper: 1800 }
        },
        'east-midlands': {
            name: 'East Midlands',
            room: { lower: 375, median: 465, upper: 560 },
            studio: { lower: 475, median: 595, upper: 725 },
            1: { lower: 550, median: 695, upper: 850 },
            2: { lower: 650, median: 825, upper: 1000 },
            3: { lower: 795, median: 995, upper: 1225 },
            4: { lower: 1000, median: 1275, upper: 1650 }
        },
        'yorkshire': {
            name: 'Yorkshire and the Humber',
            room: { lower: 350, median: 435, upper: 525 },
            studio: { lower: 450, median: 550, upper: 675 },
            1: { lower: 525, median: 650, upper: 800 },
            2: { lower: 625, median: 775, upper: 950 },
            3: { lower: 750, median: 925, upper: 1150 },
            4: { lower: 950, median: 1200, upper: 1550 }
        },
        'north-west': {
            name: 'North West',
            room: { lower: 375, median: 460, upper: 550 },
            studio: { lower: 475, median: 595, upper: 725 },
            1: { lower: 550, median: 695, upper: 850 },
            2: { lower: 650, median: 825, upper: 1025 },
            3: { lower: 795, median: 995, upper: 1250 },
            4: { lower: 1000, median: 1300, upper: 1700 }
        },
        'north-east': {
            name: 'North East',
            room: { lower: 325, median: 400, upper: 475 },
            studio: { lower: 400, median: 495, upper: 600 },
            1: { lower: 475, median: 575, upper: 700 },
            2: { lower: 550, median: 675, upper: 825 },
            3: { lower: 650, median: 800, upper: 995 },
            4: { lower: 825, median: 1050, upper: 1350 }
        },
        'wales': {
            name: 'Wales',
            room: { lower: 350, median: 425, upper: 500 },
            studio: { lower: 425, median: 525, upper: 625 },
            1: { lower: 500, median: 625, upper: 750 },
            2: { lower: 595, median: 750, upper: 925 },
            3: { lower: 725, median: 895, upper: 1100 },
            4: { lower: 900, median: 1150, upper: 1475 }
        },
        'scotland': {
            name: 'Scotland',
            room: { lower: 400, median: 495, upper: 595 },
            studio: { lower: 500, median: 625, upper: 750 },
            1: { lower: 575, median: 725, upper: 895 },
            2: { lower: 700, median: 875, upper: 1075 },
            3: { lower: 850, median: 1050, upper: 1300 },
            4: { lower: 1075, median: 1375, upper: 1775 }
        }
    },
    
    // Postcode prefix to region mapping
    postcodeMap: {
        // London
        'E': 'london', 'EC': 'london', 'N': 'london', 'NW': 'london',
        'SE': 'london', 'SW': 'london', 'W': 'london', 'WC': 'london',
        
        // South East
        'BN': 'south-east', 'BR': 'south-east', 'CT': 'south-east',
        'DA': 'south-east', 'GU': 'south-east', 'HP': 'south-east',
        'KT': 'south-east', 'ME': 'south-east', 'MK': 'south-east',
        'OX': 'south-east', 'PO': 'south-east', 'RG': 'south-east',
        'RH': 'south-east', 'SL': 'south-east', 'SM': 'south-east',
        'SO': 'south-east', 'TN': 'south-east', 'TW': 'south-east',
        
        // South West
        'BA': 'south-west', 'BH': 'south-west', 'BS': 'south-west',
        'DT': 'south-west', 'EX': 'south-west', 'GL': 'south-west',
        'PL': 'south-west', 'SN': 'south-west', 'SP': 'south-west',
        'TA': 'south-west', 'TQ': 'south-west', 'TR': 'south-west',
        
        // East of England
        'AL': 'east', 'CB': 'east', 'CM': 'east', 'CO': 'east',
        'EN': 'east', 'IG': 'east', 'IP': 'east', 'LU': 'east',
        'NR': 'east', 'PE': 'east', 'RM': 'east', 'SG': 'east',
        'SS': 'east', 'WD': 'east',
        
        // West Midlands
        'B': 'west-midlands', 'CV': 'west-midlands', 'DY': 'west-midlands',
        'HR': 'west-midlands', 'ST': 'west-midlands', 'TF': 'west-midlands',
        'WR': 'west-midlands', 'WS': 'west-midlands', 'WV': 'west-midlands',
        
        // East Midlands
        'DE': 'east-midlands', 'DN': 'east-midlands', 'LE': 'east-midlands',
        'LN': 'east-midlands', 'NG': 'east-midlands', 'NN': 'east-midlands',
        
        // Yorkshire
        'BD': 'yorkshire', 'HD': 'yorkshire', 'HG': 'yorkshire',
        'HU': 'yorkshire', 'HX': 'yorkshire', 'LS': 'yorkshire',
        'S': 'yorkshire', 'WF': 'yorkshire', 'YO': 'yorkshire',
        
        // North West
        'BB': 'north-west', 'BL': 'north-west', 'CA': 'north-west',
        'CH': 'north-west', 'CW': 'north-west', 'FY': 'north-west',
        'L': 'north-west', 'LA': 'north-west', 'M': 'north-west',
        'OL': 'north-west', 'PR': 'north-west', 'SK': 'north-west',
        'WA': 'north-west', 'WN': 'north-west',
        
        // North East
        'DH': 'north-east', 'DL': 'north-east', 'NE': 'north-east',
        'SR': 'north-east', 'TS': 'north-east',
        
        // Wales
        'CF': 'wales', 'LD': 'wales', 'LL': 'wales', 'NP': 'wales',
        'SA': 'wales', 'SY': 'wales',
        
        // Scotland
        'AB': 'scotland', 'DD': 'scotland', 'DG': 'scotland',
        'EH': 'scotland', 'FK': 'scotland', 'G': 'scotland',
        'HS': 'scotland', 'IV': 'scotland', 'KA': 'scotland',
        'KW': 'scotland', 'KY': 'scotland', 'ML': 'scotland',
        'PA': 'scotland', 'PH': 'scotland', 'TD': 'scotland', 'ZE': 'scotland'
    }
};

// ============================================
// UK HOUSE PRICE INDEX DATA
// Source: HM Land Registry / ONS
// https://landregistry.data.gov.uk/
// ============================================

const UK_HPI_DATA = {
    lastUpdated: '2024-10',
    
    // Average house prices by region (October 2024)
    averagePrices: {
        'england': 314000,
        'london': 523000,
        'south-east': 385000,
        'south-west': 320000,
        'east': 335000,
        'west-midlands': 255000,
        'east-midlands': 245000,
        'yorkshire': 215000,
        'north-west': 220000,
        'north-east': 165000,
        'wales': 220000,
        'scotland': 195000
    },
    
    // Annual price change by region (%)
    annualChange: {
        'england': 2.8,
        'london': 1.5,
        'south-east': 2.2,
        'south-west': 3.1,
        'east': 2.5,
        'west-midlands': 3.8,
        'east-midlands': 4.1,
        'yorkshire': 4.5,
        'north-west': 4.8,
        'north-east': 5.2,
        'wales': 3.5,
        'scotland': 4.2
    },
    
    // Average gross yields by region (calculated from rent/price)
    averageYields: {
        'england': 4.8,
        'london': 3.9,
        'south-east': 4.2,
        'south-west': 4.5,
        'east': 4.3,
        'west-midlands': 5.5,
        'east-midlands': 5.4,
        'yorkshire': 5.8,
        'north-west': 5.9,
        'north-east': 6.5,
        'wales': 5.2,
        'scotland': 5.4
    }
};

// ============================================
// REGULATORY DATA
// Source: PRA SS13/16, HMRC, UK Government
// Last Updated: January 2026
// ============================================

const REGULATORY_DATA = {
    // PRA Stress Test Requirements (SS13/16)
    stressTest: {
        // Minimum stress rate floor
        floorRate: 5.50,
        
        // For products < 5 years: higher of (payrate + 2%) or floor
        shortTermBuffer: 2.00,
        
        // For 5+ year fixed: can use pay rate
        longTermUsePayRate: true
    },
    
    // Interest Coverage Ratios by borrower type
    icr: {
        basicRate: 1.25,      // 125% for basic rate taxpayers
        higherRate: 1.45,     // 145% for higher rate taxpayers
        additionalRate: 1.45, // 145% for additional rate taxpayers
        limitedCompany: 1.25, // 125% for Ltd companies
        hmoSmall: 1.45,       // 145% for HMO 3-6 beds (typical)
        hmoLarge: 1.60,       // 160% for large HMO 7+ beds
        mufb: 1.50            // 150% for multi-unit freehold blocks
    },
    
    // Income Tax bands 2025/26 (thresholds FROZEN until 2028)
    // Source: https://www.gov.uk/income-tax-rates
    incomeTax: {
        personalAllowance: 12570,    // Frozen
        basicRateLimit: 50270,       // Frozen
        higherRateLimit: 125140,     // Frozen
        rates: {
            basic: 0.20,
            higher: 0.40,
            additional: 0.45
        }
    },
    
    // NEW: Property Income Tax Rates (from 6 April 2026)
    // Source: Budget 2025 - separate rates for rental income
    propertyIncomeTax: {
        effectiveFrom: '2026-04-06',
        rates: {
            basic: 0.22,       // 22% (was 20%)
            higher: 0.42,      // 42% (was 40%)
            additional: 0.47   // 47% (was 45%)
        }
    },
    
    // Capital Gains Tax on Residential Property (from April 2025)
    // Source: https://www.gov.uk/capital-gains-tax
    capitalGainsTax: {
        effectiveFrom: '2025-04-06',
        annualExemption: 3000,  // Reduced from £6,000
        rates: {
            basicRate: 0.18,    // Was 10%
            higherRate: 0.24    // Was 20%
        }
    },
    
    // Corporation Tax 2025/26
    corporationTax: {
        smallProfitsRate: 0.19,  // Up to £50k
        mainRate: 0.25,          // Over £250k
        marginalRelief: true     // £50k - £250k
    },
    
    // Making Tax Digital (MTD) for Landlords
    // Source: HMRC MTD for Income Tax
    makingTaxDigital: {
        phase1: {
            effectiveFrom: '2026-04-06',
            incomeThreshold: 50000,  // £50k+ rental income
            description: 'Quarterly digital reporting required'
        },
        phase2: {
            effectiveFrom: '2027-04-06',
            incomeThreshold: 30000,  // £30k-£50k rental income
            description: 'Quarterly digital reporting required'
        }
    },
    
    // Renters Rights Act 2025 - Key Landlord Obligations
    // Source: https://www.gov.uk/government/collections/renters-reform-bill
    rentersRightsAct: {
        status: 'enacted',
        keyChanges: {
            section21Abolished: true,          // No-fault evictions abolished
            section8Strengthened: true,        // Grounds for possession reformed
            periodicTenanciesDefault: true,    // No more fixed terms (rolling tenancies)
            rentIncreaseLimit: 'once_per_year', // Max once per 12 months
            petRequests: 'cannot_unreasonably_refuse',
            propertyPortal: {
                mandatory: true,
                deadline: '2026-04-01'  // All landlords must register
            },
            decentHomesStandard: {
                applicable: true,
                awab: true  // Awaab's Law - respond to hazards within set timeframes
            }
        },
        landlordCosts: {
            propertyPortalFee: 'TBC',
            complianceEstimate: 500  // Estimated annual compliance cost
        }
    }
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get current Bank of England base rate
 */
function getBaseRate() {
    return {
        rate: BOE_DATA.baseRate,
        lastUpdated: BOE_DATA.lastUpdated,
        source: 'Bank of England Official Bank Rate'
    };
}

/**
 * Get current mortgage rate averages
 * @param {string} term - '2year' or '5year'
 * @param {number} ltv - Loan to value (e.g., 75)
 */
function getMortgageRate(term = '5year', ltv = 75) {
    const rates = BOE_DATA.mortgageRates;
    let rate;
    
    if (term === '5year') {
        if (ltv <= 60) {
            rate = rates.fiveYearFixed60LTV;
        } else if (ltv <= 75) {
            rate = rates.fiveYearFixed75LTV;
        } else {
            rate = rates.fiveYearFixed80LTV || rates.fiveYearFixed75LTV + 1.0;
        }
    } else {
        rate = ltv <= 60 ? rates.twoYearFixed60LTV : rates.twoYearFixed75LTV;
    }
    
    return {
        rate: rate,
        term: term,
        ltv: ltv,
        lastUpdated: BOE_DATA.lastUpdated,
        source: 'UK Lender Average (Which? / Major Banks)'
    };
}

/**
 * Get rental estimate for a postcode
 * @param {string} postcode - UK postcode (e.g., 'M1 1AA')
 * @param {number} bedrooms - Number of bedrooms (1-4, or 'room', 'studio')
 */
function getRentalEstimate(postcode, bedrooms = 2) {
    // Extract postcode prefix
    const prefix = postcode.toUpperCase().replace(/[0-9\s].*/g, '');
    
    // Find region from postcode
    let region = 'england'; // Default
    
    // Check for exact match first (e.g., 'EC'), then single letter (e.g., 'E')
    if (ONS_RENTAL_DATA.postcodeMap[prefix]) {
        region = ONS_RENTAL_DATA.postcodeMap[prefix];
    } else if (ONS_RENTAL_DATA.postcodeMap[prefix.charAt(0)]) {
        region = ONS_RENTAL_DATA.postcodeMap[prefix.charAt(0)];
    }
    
    const regionData = ONS_RENTAL_DATA.regions[region];
    const bedroomKey = bedrooms === 'room' || bedrooms === 'studio' ? bedrooms : bedrooms;
    const rentData = regionData[bedroomKey] || regionData[2]; // Default to 2-bed
    
    return {
        lower: rentData.lower,
        median: rentData.median,
        upper: rentData.upper,
        region: regionData.name,
        bedrooms: bedrooms,
        lastUpdated: ONS_RENTAL_DATA.lastUpdated,
        source: 'ONS Private Rental Market Statistics'
    };
}

/**
 * Get region from postcode
 * @param {string} postcode - UK postcode
 */
function getRegionFromPostcode(postcode) {
    const prefix = postcode.toUpperCase().replace(/[0-9\s].*/g, '');
    
    if (ONS_RENTAL_DATA.postcodeMap[prefix]) {
        return ONS_RENTAL_DATA.postcodeMap[prefix];
    } else if (ONS_RENTAL_DATA.postcodeMap[prefix.charAt(0)]) {
        return ONS_RENTAL_DATA.postcodeMap[prefix.charAt(0)];
    }
    
    return 'england';
}

/**
 * Get average house price for region
 * @param {string} region - Region key or postcode
 */
function getAveragePrice(region) {
    // If it looks like a postcode, convert to region
    if (region.match(/[A-Z]{1,2}[0-9]/i)) {
        region = getRegionFromPostcode(region);
    }
    
    const price = UK_HPI_DATA.averagePrices[region] || UK_HPI_DATA.averagePrices['england'];
    const change = UK_HPI_DATA.annualChange[region] || UK_HPI_DATA.annualChange['england'];
    const yield_ = UK_HPI_DATA.averageYields[region] || UK_HPI_DATA.averageYields['england'];
    
    return {
        averagePrice: price,
        annualChange: change,
        averageYield: yield_,
        region: ONS_RENTAL_DATA.regions[region]?.name || 'England',
        lastUpdated: UK_HPI_DATA.lastUpdated,
        source: 'HM Land Registry UK House Price Index'
    };
}

/**
 * Get ICR requirement based on borrower profile
 * @param {string} borrowerType - 'individual' or 'limited'
 * @param {string} taxBand - 'basic', 'higher', 'additional'
 * @param {string} propertyType - 'standard', 'hmo-small', 'hmo-large', 'mufb'
 */
function getICRRequirement(borrowerType = 'individual', taxBand = 'basic', propertyType = 'standard') {
    let baseICR;
    
    if (borrowerType === 'limited') {
        baseICR = REGULATORY_DATA.icr.limitedCompany;
    } else {
        switch (taxBand) {
            case 'higher':
            case 'additional':
                baseICR = REGULATORY_DATA.icr.higherRate;
                break;
            default:
                baseICR = REGULATORY_DATA.icr.basicRate;
        }
    }
    
    // Adjust for property type
    let propertyICR;
    switch (propertyType) {
        case 'hmo-small':
            propertyICR = REGULATORY_DATA.icr.hmoSmall;
            break;
        case 'hmo-large':
            propertyICR = REGULATORY_DATA.icr.hmoLarge;
            break;
        case 'mufb':
            propertyICR = REGULATORY_DATA.icr.mufb;
            break;
        default:
            propertyICR = baseICR;
    }
    
    // Use the higher of the two
    const finalICR = Math.max(baseICR, propertyICR);
    
    return {
        icr: finalICR,
        percentage: (finalICR * 100).toFixed(0) + '%',
        borrowerType: borrowerType,
        taxBand: taxBand,
        propertyType: propertyType,
        source: 'PRA SS13/16 Guidelines'
    };
}

/**
 * Get stress rate for calculation
 * @param {string} productTerm - '2year' or '5year'
 * @param {number} payRate - The actual mortgage interest rate
 */
function getStressRate(productTerm = '5year', payRate = 4.5) {
    const floor = REGULATORY_DATA.stressTest.floorRate;
    const buffer = REGULATORY_DATA.stressTest.shortTermBuffer;
    
    let stressRate;
    let explanation;
    
    if (productTerm === '5year') {
        // 5-year fixed: use pay rate
        stressRate = payRate;
        explanation = '5-year fixed products can use the pay rate for stress testing';
    } else {
        // Short-term: higher of (payrate + 2%) or 5.5%
        const bufferedRate = payRate + buffer;
        stressRate = Math.max(bufferedRate, floor);
        explanation = `Short-term products stress at higher of (pay rate + ${buffer}%) or ${floor}%`;
    }
    
    return {
        stressRate: stressRate,
        stressRateFormatted: stressRate.toFixed(2) + '%',
        payRate: payRate,
        productTerm: productTerm,
        explanation: explanation,
        source: 'PRA SS13/16 Guidelines'
    };
}

/**
 * Calculate maximum loan based on rental income
 * @param {number} monthlyRent - Monthly rental income
 * @param {string} borrowerType - 'individual' or 'limited'
 * @param {string} taxBand - Tax band for individuals
 * @param {string} propertyType - Property type
 * @param {string} productTerm - '2year' or '5year'
 * @param {number} interestRate - Interest rate
 */
function calculateMaxLoan(monthlyRent, borrowerType, taxBand, propertyType, productTerm, interestRate) {
    const annualRent = monthlyRent * 12;
    const icrData = getICRRequirement(borrowerType, taxBand, propertyType);
    const stressData = getStressRate(productTerm, interestRate);
    
    // Max Loan = Annual Rent / (Stress Rate × ICR)
    const maxLoan = annualRent / ((stressData.stressRate / 100) * icrData.icr);
    
    return {
        maxLoan: Math.round(maxLoan),
        annualRent: annualRent,
        icr: icrData.icr,
        icrPercentage: icrData.percentage,
        stressRate: stressData.stressRate,
        stressRateFormatted: stressData.stressRateFormatted,
        requiredAnnualCover: annualRent * icrData.icr,
        explanation: `Based on ${icrData.percentage} ICR at ${stressData.stressRateFormatted} stress rate`,
        sources: ['PRA SS13/16', 'Bank of England']
    };
}

/**
 * Get yield benchmark for region
 * @param {string} postcode - UK postcode
 * @param {number} calculatedYield - The calculated gross yield
 */
function getYieldBenchmark(postcode, calculatedYield) {
    const region = getRegionFromPostcode(postcode);
    const regionYield = UK_HPI_DATA.averageYields[region] || UK_HPI_DATA.averageYields['england'];
    
    let rating;
    let description;
    
    if (calculatedYield >= regionYield + 2) {
        rating = 'excellent';
        description = 'Significantly above regional average';
    } else if (calculatedYield >= regionYield + 0.5) {
        rating = 'good';
        description = 'Above regional average';
    } else if (calculatedYield >= regionYield - 0.5) {
        rating = 'average';
        description = 'In line with regional average';
    } else {
        rating = 'below-average';
        description = 'Below regional average';
    }
    
    return {
        calculatedYield: calculatedYield,
        regionalAverage: regionYield,
        rating: rating,
        description: description,
        region: ONS_RENTAL_DATA.regions[region]?.name || 'England',
        source: 'HM Land Registry / ONS'
    };
}

/**
 * Get all data sources info for display
 */
function getDataSourcesInfo() {
    return {
        boe: {
            name: 'Bank of England',
            description: 'Official Bank Rate & Mortgage Rate Averages',
            lastUpdated: BOE_DATA.lastUpdated,
            url: 'https://www.bankofengland.co.uk/boeapps/database/'
        },
        ons: {
            name: 'Office for National Statistics',
            description: 'Private Rental Market Statistics',
            lastUpdated: ONS_RENTAL_DATA.lastUpdated,
            url: 'https://www.ons.gov.uk/'
        },
        hmlr: {
            name: 'HM Land Registry',
            description: 'UK House Price Index',
            lastUpdated: UK_HPI_DATA.lastUpdated,
            url: 'https://landregistry.data.gov.uk/'
        },
        pra: {
            name: 'Prudential Regulation Authority',
            description: 'SS13/16 Stress Testing Guidelines',
            lastUpdated: '2024-01',
            url: 'https://www.bankofengland.co.uk/prudential-regulation/'
        }
    };
}

// ============================================
// EXPORT FOR USE IN MAIN CALCULATOR
// ============================================

window.DataAPI = {
    // Data access
    getBaseRate,
    getMortgageRate,
    getRentalEstimate,
    getRegionFromPostcode,
    getAveragePrice,
    getICRRequirement,
    getStressRate,
    calculateMaxLoan,
    getYieldBenchmark,
    getDataSourcesInfo,
    
    // Raw data access (for advanced users)
    BOE_DATA,
    ONS_RENTAL_DATA,
    UK_HPI_DATA,
    REGULATORY_DATA
};

// Log data sources on load
console.log('📊 UK BTL Calculator - Data Sources Loaded');
console.log('   Bank of England:', BOE_DATA.lastUpdated);
console.log('   ONS Rental Data:', ONS_RENTAL_DATA.lastUpdated);
console.log('   UK HPI Data:', UK_HPI_DATA.lastUpdated);

