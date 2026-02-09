// CommodityTrack - Main Application JavaScript

// ===========================================
// CONFIGURATION & DATA
// ===========================================

// Simulated live prices (in production, these would come from APIs)
let metalPrices = {
    gold: { price: 2892.45, change: 12.30, changePercent: 0.43, bid: 2891.20, ask: 2893.70, high: 2905.20, low: 2875.10 },
    silver: { price: 32.18, change: 0.24, changePercent: 0.75, bid: 32.15, ask: 32.21, high: 32.45, low: 31.82 },
    platinum: { price: 982.50, change: -5.20, changePercent: -0.53, bid: 981.00, ask: 984.00, high: 992.30, low: 978.40 },
    palladium: { price: 968.25, change: 8.75, changePercent: 0.91, bid: 966.50, ask: 970.00, high: 975.50, low: 955.20 }
};

// Currency exchange rates (vs USD)
const exchangeRates = {
    EUR: 0.926,
    GBP: 0.791,
    JPY: 150.25,
    CHF: 0.879,
    INR: 83.12,
    AUD: 1.56,
    CNY: 7.28
};

// Market hours (in UTC)
const marketHours = {
    'ny': { open: 13, close: 22, name: 'New York' },      // 8am-5pm EST
    'london': { open: 8, close: 17, name: 'London' },      // 8am-5pm GMT
    'tokyo': { open: 0, close: 6, name: 'Tokyo' },         // 9am-3pm JST
    'shanghai': { open: 1, close: 7, name: 'Shanghai' },   // 9am-3pm CST
    'hk': { open: 1, close: 8, name: 'Hong Kong' }         // 9am-4pm HKT
};

// ===========================================
// INITIALIZATION
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    updatePrices();
    setInterval(simulatePriceChanges, 5000);

    updateMarketStatus();
    setInterval(updateMarketStatus, 60000);

    initializeCalculator();
    initializeCurrencyConverter();
    initializeFilters();

    // Fetch real data if available
    fetchMetalPrices();
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

    const updateTimeElement = document.getElementById('update-time');
    if (updateTimeElement) {
        updateTimeElement.textContent = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
}

// ===========================================
// PRICE FUNCTIONS
// ===========================================

function updatePrices() {
    // Update quick stats cards
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

function simulatePriceChanges() {
    // Simulate small price movements
    for (const metal in metalPrices) {
        const data = metalPrices[metal];
        const volatility = metal === 'silver' ? 0.003 : 0.001; // Silver is more volatile
        const change = (Math.random() - 0.5) * 2 * volatility * data.price;

        data.price = Math.max(0, data.price + change);
        data.change = data.change + change;
        data.changePercent = (data.change / (data.price - data.change)) * 100;

        // Update bid/ask
        const spread = data.price * 0.001;
        data.bid = data.price - spread / 2;
        data.ask = data.price + spread / 2;

        // Update high/low
        if (data.price > data.high) data.high = data.price;
        if (data.price < data.low) data.low = data.price;
    }

    updatePrices();
}

// Fetch real metal prices from free API
async function fetchMetalPrices() {
    try {
        // Using metals.live free API
        const response = await fetch('https://api.metals.live/v1/spot');
        if (response.ok) {
            const data = await response.json();

            // Update prices from API
            if (data.gold) {
                metalPrices.gold.price = data.gold;
                metalPrices.gold.bid = data.gold - 1;
                metalPrices.gold.ask = data.gold + 1;
            }
            if (data.silver) {
                metalPrices.silver.price = data.silver;
                metalPrices.silver.bid = data.silver - 0.02;
                metalPrices.silver.ask = data.silver + 0.02;
            }
            if (data.platinum) {
                metalPrices.platinum.price = data.platinum;
                metalPrices.platinum.bid = data.platinum - 2;
                metalPrices.platinum.ask = data.platinum + 2;
            }
            if (data.palladium) {
                metalPrices.palladium.price = data.palladium;
                metalPrices.palladium.bid = data.palladium - 3;
                metalPrices.palladium.ask = data.palladium + 3;
            }

            updatePrices();
        }
    } catch (error) {
        console.log('Using simulated prices (API unavailable)');
    }
}

// ===========================================
// MARKET STATUS
// ===========================================

function updateMarketStatus() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay();

    // Weekend check
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (const [market, hours] of Object.entries(marketHours)) {
        const element = document.getElementById(`${market}-status`);
        if (element) {
            let isOpen = false;

            if (!isWeekend) {
                if (hours.open < hours.close) {
                    isOpen = utcHour >= hours.open && utcHour < hours.close;
                } else {
                    isOpen = utcHour >= hours.open || utcHour < hours.close;
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

    updateCalculator();
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
        updateCurrencyConverter();
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

            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Filter table rows
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

            // Update active button
            newsFilters.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Filter news cards
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
    if (value >= 1000) {
        return '$' + value.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
    return '$' + value.toFixed(decimals);
}

function formatPercentage(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

// ===========================================
// NEWSLETTER FORM
// ===========================================

const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = this.querySelector('input[type="email"]').value;

        // Show success message
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
// PRICE ANIMATION
// ===========================================

function animatePriceChange(element, newValue, oldValue) {
    const isIncrease = newValue > oldValue;

    element.classList.add(isIncrease ? 'flash-green' : 'flash-red');

    setTimeout(() => {
        element.classList.remove('flash-green', 'flash-red');
    }, 500);
}

// ===========================================
// RESPONSIVE NAVIGATION
// ===========================================

// Add mobile menu toggle functionality if needed
const navToggle = document.querySelector('.nav-toggle');
if (navToggle) {
    navToggle.addEventListener('click', function() {
        const navLinks = document.querySelector('.nav-links');
        navLinks.classList.toggle('active');
    });
}

// ===========================================
// CONSOLE BRANDING
// ===========================================

console.log('%c CommodityTrack ', 'background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); color: black; font-size: 24px; font-weight: bold; padding: 10px 20px; border-radius: 8px;');
console.log('%c Real-time Precious Metals & Commodities Tracking ', 'color: #9ca3af; font-size: 12px;');
