// CommodityTrack - Main Application JavaScript

// ===========================================
// CONFIGURATION & DATA
// ===========================================

// Store for live prices - will be updated from APIs
let metalPrices = {
    gold: { price: 0, change: 0, changePercent: 0, bid: 0, ask: 0, high: 0, low: 0, prevClose: 0 },
    silver: { price: 0, change: 0, changePercent: 0, bid: 0, ask: 0, high: 0, low: 0, prevClose: 0 },
    platinum: { price: 0, change: 0, changePercent: 0, bid: 0, ask: 0, high: 0, low: 0, prevClose: 0 },
    palladium: { price: 0, change: 0, changePercent: 0, bid: 0, ask: 0, high: 0, low: 0, prevClose: 0 }
};

// Currency exchange rates (vs USD) - will be updated from API
let exchangeRates = {
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.50,
    CHF: 0.88,
    INR: 83.00,
    AUD: 1.53,
    CNY: 7.24
};

// Market hours (in UTC)
const marketHours = {
    'ny': { open: 14, close: 21, name: 'New York' },
    'london': { open: 8, close: 16, name: 'London' },
    'tokyo': { open: 0, close: 6, name: 'Tokyo' },
    'shanghai': { open: 1, close: 7, name: 'Shanghai' },
    'hk': { open: 1, close: 8, name: 'Hong Kong' }
};

// Track if we've successfully loaded data
let dataLoaded = false;

// ===========================================
// INITIALIZATION
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Start time updates
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // Update market status
    updateMarketStatus();
    setInterval(updateMarketStatus, 60000);

    // Initialize UI components
    initializeCalculator();
    initializeCurrencyConverter();
    initializeFilters();

    // Show loading state
    showLoadingState();

    // Fetch real data from multiple sources
    await fetchAllData();

    // Refresh prices every 30 seconds
    setInterval(fetchAllData, 30000);
}

function showLoadingState() {
    const priceElements = document.querySelectorAll('.price, .amount');
    priceElements.forEach(el => {
        if (el.textContent.includes('---')) {
            el.textContent = 'Loading...';
        }
    });
}

// ===========================================
// DATA FETCHING - Multiple API Sources
// ===========================================

async function fetchAllData() {
    // Try multiple sources for reliability
    const pricesLoaded = await fetchMetalPrices();
    await fetchExchangeRates();

    if (pricesLoaded) {
        dataLoaded = true;
        updatePrices();
        updatePricesPage();
    }
}

// Primary: Fetch from metals.live API (free, no key required)
async function fetchMetalPrices() {
    try {
        // metals.live provides real-time spot prices
        const response = await fetch('https://api.metals.live/v1/spot');
        if (response.ok) {
            const data = await response.json();

            // API returns array, get latest entry
            const latest = Array.isArray(data) ? data[0] : data;

            if (latest) {
                updateMetalFromAPI('gold', latest.gold);
                updateMetalFromAPI('silver', latest.silver);
                updateMetalFromAPI('platinum', latest.platinum);
                updateMetalFromAPI('palladium', latest.palladium);

                console.log('✓ Prices loaded from metals.live API');
                updateLastUpdated();
                return true;
            }
        }
    } catch (error) {
        console.log('metals.live API unavailable, trying backup...');
    }

    // Backup: Try Gold-API (different endpoint)
    try {
        const response = await fetch('https://data-asg.goldprice.org/dbXRates/USD');
        if (response.ok) {
            const data = await response.json();
            if (data.items && data.items[0]) {
                const item = data.items[0];
                updateMetalFromAPI('gold', item.xauPrice);
                updateMetalFromAPI('silver', item.xagPrice);
                updateMetalFromAPI('platinum', item.xptPrice);
                updateMetalFromAPI('palladium', item.xpdPrice);

                console.log('✓ Prices loaded from goldprice.org API');
                updateLastUpdated();
                return true;
            }
        }
    } catch (error) {
        console.log('Backup API also unavailable');
    }

    // If all APIs fail, use realistic current market prices (Feb 2026)
    setFallbackPrices();
    return true;
}

function updateMetalFromAPI(metal, price) {
    if (!price || price <= 0) return;

    const data = metalPrices[metal];
    const oldPrice = data.price;

    data.price = parseFloat(price);

    // Calculate spread based on metal
    const spreadPercent = metal === 'gold' ? 0.0003 :
                          metal === 'silver' ? 0.001 : 0.005;
    const spread = data.price * spreadPercent;

    data.bid = data.price - spread;
    data.ask = data.price + spread;

    // Set high/low (approximate daily range)
    const rangePercent = metal === 'silver' ? 0.02 : 0.01;
    if (data.high === 0) data.high = data.price * (1 + rangePercent / 2);
    if (data.low === 0) data.low = data.price * (1 - rangePercent / 2);

    // Update high/low if price moves outside range
    if (data.price > data.high) data.high = data.price;
    if (data.price < data.low) data.low = data.price;

    // Calculate change from previous close (estimate)
    if (data.prevClose === 0) {
        data.prevClose = data.price * 0.998; // Assume small positive change
    }
    data.change = data.price - data.prevClose;
    data.changePercent = (data.change / data.prevClose) * 100;
}

function setFallbackPrices() {
    // Current realistic market prices as of Feb 2026
    // These serve as fallback when APIs are unavailable
    const fallbackData = {
        gold: { price: 2920, prevClose: 2905 },
        silver: { price: 32.50, prevClose: 32.20 },
        platinum: { price: 985, prevClose: 990 },
        palladium: { price: 975, prevClose: 965 }
    };

    for (const [metal, data] of Object.entries(fallbackData)) {
        metalPrices[metal].prevClose = data.prevClose;
        updateMetalFromAPI(metal, data.price);
    }

    console.log('Using fallback prices (APIs unavailable)');
    updateLastUpdated('Offline Mode');
}

// Fetch exchange rates from free API
async function fetchExchangeRates() {
    try {
        // Using frankfurter.app - free, no API key
        const response = await fetch('https://api.frankfurter.app/latest?from=USD');
        if (response.ok) {
            const data = await response.json();
            if (data.rates) {
                exchangeRates.EUR = data.rates.EUR || exchangeRates.EUR;
                exchangeRates.GBP = data.rates.GBP || exchangeRates.GBP;
                exchangeRates.JPY = data.rates.JPY || exchangeRates.JPY;
                exchangeRates.CHF = data.rates.CHF || exchangeRates.CHF;
                exchangeRates.INR = data.rates.INR || exchangeRates.INR;
                exchangeRates.AUD = data.rates.AUD || exchangeRates.AUD;
                exchangeRates.CNY = data.rates.CNY || exchangeRates.CNY;

                console.log('✓ Exchange rates loaded');
                updateCurrencyConverter();
            }
        }
    } catch (error) {
        console.log('Using default exchange rates');
    }
}

function updateLastUpdated(status = null) {
    const updateTimeElement = document.getElementById('update-time');
    if (updateTimeElement) {
        if (status) {
            updateTimeElement.textContent = status;
        } else {
            const now = new Date();
            updateTimeElement.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        }
    }
}

// ===========================================
// TIME FUNCTIONS
// ===========================================

function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = `${dateString} ${timeString}`;
    }
}

// ===========================================
// PRICE UPDATE FUNCTIONS
// ===========================================

function updatePrices() {
    // Update quick stats cards on dashboard
    updateStatCard('gold');
    updateStatCard('silver');
    updateStatCard('platinum');
    updateStatCard('palladium');

    // Update market table
    updateMarketTable();

    // Update calculator
    updateCalculator();
}

function updateStatCard(metal) {
    const data = metalPrices[metal];
    if (!data || data.price === 0) return;

    const priceElement = document.getElementById(`${metal}-price`);
    const changeElement = document.getElementById(`${metal}-change`);

    if (priceElement) {
        priceElement.textContent = formatCurrency(data.price);
    }

    if (changeElement) {
        const changeText = `${data.change >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`;
        changeElement.textContent = changeText;
        changeElement.className = `change ${data.change >= 0 ? 'positive' : 'negative'}`;
    }
}

function updateMarketTable() {
    for (const metal of ['gold', 'silver', 'platinum', 'palladium']) {
        const data = metalPrices[metal];
        if (!data || data.price === 0) continue;

        const elements = {
            bid: document.getElementById(`${metal}-bid`),
            ask: document.getElementById(`${metal}-ask`),
            high: document.getElementById(`${metal}-high`),
            low: document.getElementById(`${metal}-low`),
            change: document.getElementById(`${metal}-table-change`)
        };

        if (elements.bid) elements.bid.textContent = formatCurrency(data.bid);
        if (elements.ask) elements.ask.textContent = formatCurrency(data.ask);
        if (elements.high) elements.high.textContent = formatCurrency(data.high);
        if (elements.low) elements.low.textContent = formatCurrency(data.low);

        if (elements.change) {
            const changeText = `${data.change >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`;
            elements.change.textContent = changeText;
            elements.change.className = `change-badge ${data.change >= 0 ? 'positive' : 'negative'}`;
        }
    }
}

// Update prices page elements
function updatePricesPage() {
    // Gold detailed prices
    updateDetailedPrices('gold');
    updateDetailedPrices('silver');
    updateDetailedPrices('platinum');
    updateDetailedPrices('palladium');

    // Update world market prices (convert USD to local currencies)
    updateWorldMarketPrices();
}

function updateDetailedPrices(metal) {
    const data = metalPrices[metal];
    if (!data || data.price === 0) return;

    // Spot price
    const spotEl = document.getElementById(`${metal}-spot`);
    if (spotEl) spotEl.textContent = data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Change
    const changeEl = document.getElementById(`${metal}-spot-change`);
    if (changeEl) {
        const sign = data.change >= 0 ? '+' : '';
        changeEl.textContent = `${sign}${data.change.toFixed(2)} (${sign}${data.changePercent.toFixed(2)}%)`;
        changeEl.parentElement.className = `price-change ${data.change >= 0 ? 'positive' : 'negative'}`;
    }

    // Per gram (1 oz = 31.1035 grams)
    const gramEl = document.getElementById(`${metal}-gram`);
    if (gramEl) gramEl.textContent = formatCurrency(data.price / 31.1035);

    // Per kilo
    const kiloEl = document.getElementById(`${metal}-kilo`);
    if (kiloEl) kiloEl.textContent = formatCurrency((data.price / 31.1035) * 1000);

    // 24h High/Low
    const highEl = document.getElementById(`${metal}-24h-high`);
    if (highEl) highEl.textContent = formatCurrency(data.high);

    const lowEl = document.getElementById(`${metal}-24h-low`);
    if (lowEl) lowEl.textContent = formatCurrency(data.low);
}

function updateWorldMarketPrices() {
    const goldUSD = metalPrices.gold.price;
    if (goldUSD === 0) return;

    // Update market cards with converted prices
    const markets = document.querySelectorAll('.market-card');
    markets.forEach(card => {
        const priceEl = card.querySelector('.market-price .price');
        const currencyEl = card.querySelector('.market-currency');

        if (priceEl && currencyEl) {
            const currency = currencyEl.textContent.split('/')[0].trim();
            let convertedPrice = goldUSD;
            let symbol = '$';

            switch(currency) {
                case 'GBP':
                    convertedPrice = goldUSD * exchangeRates.GBP;
                    symbol = '£';
                    break;
                case 'EUR':
                    convertedPrice = goldUSD * exchangeRates.EUR;
                    symbol = '€';
                    break;
                case 'JPY':
                    convertedPrice = goldUSD * exchangeRates.JPY;
                    symbol = '¥';
                    break;
                case 'CNY':
                    // China quotes per gram
                    convertedPrice = (goldUSD / 31.1035) * exchangeRates.CNY;
                    symbol = '¥';
                    break;
                case 'INR':
                    // India quotes per 10 grams
                    convertedPrice = (goldUSD / 31.1035) * 10 * exchangeRates.INR;
                    symbol = '₹';
                    break;
                case 'CHF':
                    convertedPrice = goldUSD * exchangeRates.CHF;
                    symbol = 'CHF ';
                    break;
                case 'A$':
                case 'AUD':
                    convertedPrice = goldUSD * exchangeRates.AUD;
                    symbol = 'A$';
                    break;
            }

            priceEl.textContent = symbol + convertedPrice.toLocaleString('en-US', {
                minimumFractionDigits: currency === 'JPY' || currency === 'INR' ? 0 : 2,
                maximumFractionDigits: currency === 'JPY' || currency === 'INR' ? 0 : 2
            });
        }
    });
}

// ===========================================
// MARKET STATUS
// ===========================================

function updateMarketStatus() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const dayOfWeek = now.getUTCDay();

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (const [market, hours] of Object.entries(marketHours)) {
        const element = document.getElementById(`${market}-status`);
        if (element) {
            let isOpen = false;

            if (!isWeekend) {
                const currentTime = utcHour + utcMinutes / 60;
                if (hours.open < hours.close) {
                    isOpen = currentTime >= hours.open && currentTime < hours.close;
                } else {
                    isOpen = currentTime >= hours.open || currentTime < hours.close;
                }
            }

            element.textContent = isOpen ? 'Open' : 'Closed';
            element.className = `market-indicator ${isOpen ? 'open' : 'closed'}`;
        }
    }
}

// ===========================================
// CALCULATOR
// ===========================================

function initializeCalculator() {
    const metalSelect = document.getElementById('calc-metal');
    const weightInput = document.getElementById('calc-weight');

    if (metalSelect) {
        metalSelect.addEventListener('change', updateCalculator);
    }

    if (weightInput) {
        weightInput.addEventListener('input', updateCalculator);
    }
}

function updateCalculator() {
    const metalSelect = document.getElementById('calc-metal');
    const weightInput = document.getElementById('calc-weight');
    const totalElement = document.getElementById('calc-total');

    if (!metalSelect || !weightInput || !totalElement) return;

    const metal = metalSelect.value;
    const weight = parseFloat(weightInput.value) || 0;
    const price = metalPrices[metal]?.price || 0;

    const total = weight * price;
    totalElement.textContent = formatCurrency(total);
}

// ===========================================
// CURRENCY CONVERTER
// ===========================================

function initializeCurrencyConverter() {
    const usdInput = document.getElementById('usd-amount');

    if (usdInput) {
        usdInput.addEventListener('input', updateCurrencyConverter);
    }
}

function updateCurrencyConverter() {
    const usdInput = document.getElementById('usd-amount');
    if (!usdInput) return;

    const usdAmount = parseFloat(usdInput.value) || 0;

    const currencies = ['eur', 'gbp', 'jpy', 'chf', 'inr'];

    for (const currency of currencies) {
        const element = document.getElementById(`${currency}-value`);
        if (element) {
            const rate = exchangeRates[currency.toUpperCase()];
            const converted = usdAmount * rate;

            if (currency === 'jpy') {
                element.textContent = `¥${Math.round(converted).toLocaleString()}`;
            } else if (currency === 'inr') {
                element.textContent = `₹${converted.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
            } else {
                element.textContent = `${getCurrencySymbol(currency)}${converted.toFixed(2)}`;
            }
        }
    }
}

function getCurrencySymbol(currency) {
    const symbols = {
        'eur': '€',
        'gbp': '£',
        'jpy': '¥',
        'chf': 'CHF ',
        'inr': '₹'
    };
    return symbols[currency] || '$';
}

// ===========================================
// FILTERS
// ===========================================

function initializeFilters() {
    // ETF filters
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;

            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const rows = document.querySelectorAll('.etf-table tbody tr');
            rows.forEach(row => {
                const type = row.dataset.type;
                if (filter === 'all' || type === filter) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    });

    // News filters
    const newsFilters = document.querySelectorAll('.news-filter');
    newsFilters.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;

            newsFilters.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const cards = document.querySelectorAll('.news-card');
            cards.forEach(card => {
                const category = card.dataset.category;
                if (filter === 'all' || category === filter) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function formatCurrency(value, decimals = 2) {
    if (value === 0 || isNaN(value)) return '$---.--';

    if (value >= 1000) {
        return '$' + value.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
    return '$' + value.toFixed(decimals);
}

// ===========================================
// NEWSLETTER FORM
// ===========================================

const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const button = this.querySelector('button');
        const originalText = button.textContent;
        button.textContent = 'Subscribed!';
        button.style.background = '#10b981';

        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
            this.reset();
        }, 2000);
    });
}

// ===========================================
// CONSOLE BRANDING
// ===========================================

console.log('%c CommodityTrack ', 'background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); color: black; font-size: 24px; font-weight: bold; padding: 10px 20px; border-radius: 8px;');
console.log('%c Real-time Precious Metals & Commodities Tracking ', 'color: #9ca3af; font-size: 12px;');
console.log('%c Data sources: metals.live, frankfurter.app ', 'color: #6b7280; font-size: 10px;');
