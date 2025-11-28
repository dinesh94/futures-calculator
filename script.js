// Get form elements
const entryPriceInput = document.getElementById('entryPrice');
const takeProfitInput = document.getElementById('takeProfit');
const stopLossInput = document.getElementById('stopLoss');
const contractsInput = document.getElementById('contracts');
const calculateBtn = document.getElementById('calculateBtn');
const clearBtn = document.getElementById('clearBtn');
const buyingPowerInput = document.getElementById('buyingPower');
const calcContractsBtn = document.getElementById('calcContractsBtn');
const resultsSection = document.getElementById('resultsSection');
const futuresMarketSelect = document.getElementById('futuresMarket');

// Contract specifications database (trimmed to user-specified tickers)
const contractSpecs = {
    mes: {
        ticker: 'MES',
        name: 'Micro E-mini S&P 500',
        pointValue: 5,
        tickSize: 0.25,
        tickValue: 1.25,
        margin: 2462.90
    },
    es: {
        ticker: 'ES',
        name: 'E-mini S&P 500',
        pointValue: 50,
        tickSize: 0.25,
        tickValue: 12.50,
        margin: 24626.80
    },
    mnq: {
        ticker: 'MNQ',
        name: 'Micro E-mini Nasdaq-100',
        pointValue: 2,
        tickSize: 0.25,
        tickValue: 0.50,
        margin: 3683.90
    },
    nq: {
        ticker: 'NQ',
        name: 'E-mini Nasdaq-100',
        pointValue: 20,
        tickSize: 0.25,
        tickValue: 5.00,
        margin: 36834.60
    },
    sil: {
        ticker: 'SIL',
        name: 'Micro Silver Futures',
        contractUnit: '1000 oz',
        pointValue: 1000,
        tickSize: 0.005,
        tickValue: 5,
        margin: 5280
    },
    met: {
        ticker: 'MET',
        name: 'Micro Ether Futures',
        contractUnit: '0.10 ETH',
        pointValue : 0.10,
        tickSize: 0.50,
        tickValue: 0.50,
        margin: 110
    },
    mbt: {
        ticker: 'MBT',
        name: 'Micro Bitcoin Futures',
        contractUnit: '0.1 BTC',
        pointValue: 0.1,
        tickSize: 5,
        tickValue: 0.50,
        margin: 2387
    }
};

let currentContractSpec = contractSpecs.mes;
let isLongPosition = true;

// Mock current market prices (sample values) — replace with real API if needed
const marketPrices = {
    mes: 6672.00,
    mnq: 12500.50,
    m2k: 1890.25,
    mym: 33000.00,
    es: 6672.00,
    nq: 15400.75,
    ym: 35100.00,
    mbt: 68000.00,
    met: 3500.00,
    btc: 68000.00,
    eth: 3500.00,
    cl: 76.25,
    mcl: 76.30,
    gc: 2140.50,
    mgc: 214.05,
    yg: 710.00,
    si: 24.35,
    sil: 4.87,
    yi: 4.87
};

/**
 * Simulated fetch for current price. Returns a Promise so it can be swapped
 * out easily for a real network request later.
 * @param {string} marketKey
 * @returns {Promise<number>}
 */
function fetchCurrentPrice(marketKey) {
    return new Promise((resolve) => {
        // Simulate network latency
        setTimeout(() => {
            const price = marketPrices[marketKey];
            if (price !== undefined) {
                resolve(price);
            } else {
                // If unknown, return a small generated value as fallback
                resolve(Math.round((Math.random() * 1000 + 100) * 100) / 100);
            }
        }, 300);
    });
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();
    setupPositionButtons();
    setupAdjustButtons();
    populateFuturesMarketDropdown();
    setupFuturesMarketDropdown();
    // Fetch delayed quotes on startup
    loadQuotes();
});

// Fetch CSV quote from Stooq (returns parsed row). Note: browser CORS may block this
// request in some environments; in that case use a proxy or server-side fetch.
async function getQuote(symbol) {
    const url = `https://stooq.com/q/l/?s=${symbol}&f=sd2t2ohlcv&h&e=csv`;

    const res = await fetch(url);
    const text = await res.text();

    // Parse CSV
    const [header, row] = text.trim().split("\n");
    if (!row) return null;
    const cols = row.split(",");

    return {
        symbol: cols[0],
        date: cols[1],
        time: cols[2],
        open: cols[3],
        high: cols[4],
        low: cols[5],
        close: cols[6],
        volume: cols[7]
    };
}

async function loadQuotes() {
    // Prefer local quotes server if available to avoid CORS issues.
    try {
        const resp = await fetch('http://localhost:3000/quotes');
        if (resp.ok) {
            const quotes = await resp.json();
            const esObj = quotes.find(q => q.symbol === 'ES=F' || q.symbol === 'ES');
            const nqObj = quotes.find(q => q.symbol === 'NQ=F' || q.symbol === 'NQ');

            document.getElementById("es").innerText = esObj && (esObj.regularMarketPrice ?? esObj.close) ? `ES: ${esObj.regularMarketPrice ?? esObj.close}` : 'ES: N/A';
            document.getElementById("nq").innerText = nqObj && (nqObj.regularMarketPrice ?? nqObj.close) ? `NQ: ${nqObj.regularMarketPrice ?? nqObj.close}` : 'NQ: N/A';
            console.log('Loaded quotes from local server', quotes);
            return;
        }
    } catch (err) {
        console.warn('Local quotes server not available or failed:', err.message || err);
    }

    // Fallback to CSV provider (may be blocked by CORS in browser)
    try {
        const es = await getQuote("es.f");   // ES delayed quote
        const nq = await getQuote("nq.f");   // NQ delayed quote

        console.log("ES Quote →", es);
        console.log("NQ Quote →", nq);

        document.getElementById("es").innerText = es && es.close ? `ES: ${es.close}` : 'ES: N/A';
        document.getElementById("nq").innerText = nq && nq.close ? `NQ: ${nq.close}` : 'NQ: N/A';
    } catch (err) {
        console.error('Failed to load quotes', err);
        document.getElementById("es").innerText = 'ES: Error';
        document.getElementById("nq").innerText = 'NQ: Error';
    }
}

function setupPositionButtons() {
    const longBtn = document.querySelector('.btn-long');
    const shortBtn = document.querySelector('.btn-short');

    longBtn.addEventListener('click', function (e) {
        e.preventDefault();
        isLongPosition = true;
        longBtn.classList.add('active');
        shortBtn.classList.remove('active');
        longBtn.textContent = '✓ Long';
        shortBtn.textContent = 'Short';
        performCalculation();
    });

    shortBtn.addEventListener('click', function (e) {
        e.preventDefault();
        isLongPosition = false;
        shortBtn.classList.add('active');
        longBtn.classList.remove('active');
        shortBtn.textContent = '✓ Short';
        longBtn.textContent = 'Long';
        performCalculation();
    });
}

function setupEventListeners() {
    calculateBtn.addEventListener('click', performCalculation);
    clearBtn.addEventListener('click', clearForm);

    // Allow Enter key to submit
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                performCalculation();
            }
        });
    });
    // Buying power -> calculate contracts button
    if (typeof calcContractsBtn !== 'undefined' && calcContractsBtn) {
        calcContractsBtn.addEventListener('click', calculateContractsFromBuyingPower);
    }
}

function setupAdjustButtons() {
    const adjustButtons = document.querySelectorAll('.btn-adjust');

    adjustButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const inputGroup = this.closest('.input-group');
            const input = inputGroup.querySelector('input[type="number"]');
            const isIncrease = this.textContent === '+';
            let step;
            // Use tickSize for price fields, default step for contracts
            if (['entryPrice','takeProfit','stopLoss'].includes(input.id)) {
                const tickSizeSpan = document.getElementById('tickSize');
                step = parseFloat(tickSizeSpan.textContent) || 1;
            } else {
                step = parseFloat(input.step) || 1;
            }
            if (isIncrease) {
                input.value = (parseFloat(input.value) || 0) + step;
            } else {
                input.value = (parseFloat(input.value) || 0) - step;
            }
            // No slider: nothing to update for contracts here
            input.dispatchEvent(new Event('change'));
        });
    });
}

/**
 * Calculate how many contracts can be bought given buying power and margin requirement
 */
function calculateContractsFromBuyingPower() {
    const buyingPower = parseFloat(buyingPowerInput && buyingPowerInput.value) || 0;
    const marginReq = currentContractSpec && currentContractSpec.margin;
    if (!marginReq || marginReq <= 0) {
        alert('Margin requirement not available for the selected contract');
        return;
    }

    const rawContracts = Math.floor(buyingPower / marginReq);
    if (rawContracts < 1) {
        alert('Buying power insufficient to purchase one contract');
        // reflect 0 in the contracts input but don't change the slider (slider min is 1)
        contractsInput.value = '0';
        return;
    }

    // Set contracts to the calculated number (no upper clamp)
    contractsInput.value = rawContracts;
    performCalculation();
}

function setupFuturesMarketDropdown() {
    futuresMarketSelect.addEventListener('change', function () {
        const selectedMarket = this.value;
        if (selectedMarket) {
            currentContractSpec = contractSpecs[selectedMarket];
            updateContractDetails();
            // Fetch a live quote from the local server (if running)
            fetchQuoteForSelectedMarket(selectedMarket);
        } else {
            // Hide contract details if no selection
            const contractDetailsSection = document.getElementById('contractDetailsSection');
            contractDetailsSection.style.display = 'none';
        }
    });
}

// When a market is selected, try to fetch a live quote from the local server
// If available, fill entryPrice and the current price display.
const equityFuturesSet = new Set(['MES','ES','NQ','MNQ','M2K','MYM','YM']);

function fetchQuoteForSelectedMarket(selectedMarketKey) {
    if (!selectedMarketKey) return;
    const spec = contractSpecs[selectedMarketKey];
    if (!spec) return;

    // Always append =F for Yahoo symbol
    const ticker = spec.ticker;
    const symbol = `${ticker}=F`;

    const display = document.getElementById('currentPriceDisplay');
    const liveQuoteDisplay = document.getElementById('liveQuote');
    
    display.textContent = 'Fetching...';
    liveQuoteDisplay.textContent = 'Fetching...';

    fetch(`/quote?symbol=${encodeURIComponent(symbol)}`)
        .then(resp => {
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.json();
        })
        .then(data => {
            // server returns { symbol, price, prevClose, timestamp } or { error }
            if (data && data.price !== undefined) {
                const price = Number(data.price);
                const prevClose = data.prevClose ? Number(data.prevClose) : null;
                
                // Update entry price input and current price display
                document.getElementById('currentPriceDisplay').textContent = price.toFixed(2);
                entryPriceInput.value = price.toFixed(2);
                
                // Also populate takeProfit and stopLoss with the same price
                takeProfitInput.value = price.toFixed(2);
                stopLossInput.value = price.toFixed(2);
                
                // Update live quote display
                const marketName = spec.name;
                let quoteText = `${spec.ticker}: ${price.toFixed(2)}`;
                if (prevClose) {
                    const change = price - prevClose;
                    const changePercent = ((change / prevClose) * 100).toFixed(2);
                    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
                    quoteText += ` (${changeStr}, ${changePercent}%)`;
                }
                liveQuoteDisplay.textContent = quoteText;
                liveQuoteDisplay.style.color = price >= prevClose ? '#009688' : '#d32f2f';
            } else {
                console.warn('Quote endpoint returned unexpected data', data);
                display.textContent = 'N/A';
                liveQuoteDisplay.textContent = 'Quote unavailable';
                liveQuoteDisplay.style.color = '#999';
            }
        })
        .catch(err => {
            console.warn('Failed to fetch quote from local server:', err);
            display.textContent = 'N/A';
            liveQuoteDisplay.textContent = 'Quote unavailable';
            liveQuoteDisplay.style.color = '#999';
        });
}

function populateFuturesMarketDropdown() {
    const dropdown = document.getElementById('futuresMarket');
    
    // Clear existing options except the placeholder
    dropdown.innerHTML = '<option value="">Select a futures market</option>';
    
    // Populate options from contractSpecs
    for (const [key, spec] of Object.entries(contractSpecs)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${spec.ticker} - ${spec.name}`;
        dropdown.appendChild(option);
    }
}

function updateContractDetails() {
    const contractDetailsSection = document.getElementById('contractDetailsSection');
    
    document.getElementById('contractName').textContent = currentContractSpec.name;
    
    // Display Point Value if available, otherwise show contract unit
    if (currentContractSpec.pointValue !== undefined) {
        document.getElementById('pointValue').textContent = `$${currentContractSpec.pointValue.toFixed(2)}`;
    } else if (currentContractSpec.contractUnit) {
        document.getElementById('pointValue').textContent = currentContractSpec.contractUnit;
    } else {
        document.getElementById('pointValue').textContent = '—';
    }
    
    document.getElementById('tickValue').textContent = `$${currentContractSpec.tickValue.toFixed(2)}`;
    document.getElementById('tickSize').textContent = currentContractSpec.tickSize.toString();
    
    // Show the contract details section
    contractDetailsSection.style.display = 'block';
}

// slider removed; updateSliderBackground no longer needed

function performCalculation() {
    // Get values from inputs
    const entryPrice = parseFloat(entryPriceInput.value) || 0;
    const takeProfit = parseFloat(takeProfitInput.value) || 0;
    const stopLoss = parseFloat(stopLossInput.value) || 0;
    const contracts = parseInt(contractsInput.value) || 1;

    // Validate inputs
    if (entryPrice <= 0 || takeProfit <= 0 || stopLoss <= 0) {
        alert('Please enter valid positive values for all fields');
        return;
    }

    // Get contract specs
    const tickSize = currentContractSpec.tickSize;
    const pointValue = currentContractSpec.pointValue || 0;

    let profitPoints, profitTicks, profitAmount;
    let lossPoints, lossTicks, lossAmount;

    if (isLongPosition) {
        // === LONG POSITION ===
        // Profit: Points = (takeProfit - entryPrice) * contracts
        profitPoints = (takeProfit - entryPrice) * contracts;
        profitTicks = profitPoints / tickSize;
        profitAmount = profitPoints * pointValue;

        // Loss: Points = (entryPrice - stopLoss) * contracts
        lossPoints = (entryPrice - stopLoss) * contracts;
        lossTicks = lossPoints / tickSize;
        lossAmount = lossPoints * pointValue;
    } else {
        // === SHORT POSITION ===
        // Profit: Points = (entryPrice - takeProfit) * contracts
        profitPoints = (entryPrice - takeProfit) * contracts;
        profitTicks = profitPoints / tickSize;
        profitAmount = profitPoints * pointValue;

        // Loss: Points = (stopLoss - entryPrice) * contracts
        lossPoints = (stopLoss - entryPrice) * contracts;
        lossTicks = lossPoints / tickSize;
        lossAmount = lossPoints * pointValue;
    }

    // Calculate risk/reward ratio
    const riskRewardRatio = (profitAmount > 0 && lossAmount > 0)
        ? (profitAmount / lossAmount).toFixed(2)
        : '0.00';

    // Update results display
    updateResults(
        profitTicks,
        profitPoints,
        profitAmount,
        lossTicks,
        lossPoints,
        lossAmount,
        riskRewardRatio
    );

    // Show results section
    resultsSection.classList.remove('hidden');
}

function updateResults(profitTicks, profitPoints, profitAmount, lossTicks, lossPoints, lossAmount, riskRewardRatio) {
    const resultCards = document.querySelectorAll('.result-card');

    // Update profit card
    const profitCard = resultCards[0];
    const profitItems = profitCard.querySelectorAll('.result-item');
    profitItems[0].querySelector('.result-value').textContent = profitTicks.toFixed(2);
    profitItems[1].querySelector('.result-value').textContent = profitPoints.toFixed(2);
    profitItems[2].querySelector('.result-value').textContent = profitAmount.toFixed(2);

    // Update loss card
    const lossCard = resultCards[1];
    const lossItems = lossCard.querySelectorAll('.result-item');
    lossItems[0].querySelector('.result-value').textContent = (-lossTicks).toFixed(2);
    lossItems[1].querySelector('.result-value').textContent = (-lossPoints).toFixed(2);
    lossItems[2].querySelector('.result-value').textContent = (-lossAmount).toFixed(2);

    // Update risk/reward ratio
    const riskRewardValue = document.querySelector('.risk-reward-value');
    riskRewardValue.textContent = '1:' + riskRewardRatio;
}

function clearForm() {
    entryPriceInput.value = '6672.00';
    takeProfitInput.value = '6680.00';
    stopLossInput.value = '6660.00';
    contractsInput.value = '1';
    // slider removed
    resultsSection.classList.add('hidden');
}

// Setup profit ratio buttons
document.querySelectorAll('.profit-ratio span').forEach(span => {
    span.addEventListener('click', function () {
        const ratio = this.textContent.includes('1:2') ? 2 : 3;
        const entryPrice = parseFloat(entryPriceInput.value) || 0;
        const stopLoss = parseFloat(stopLossInput.value) || 0;

        if (entryPrice > 0 && stopLoss > 0) {
            const riskAmount = Math.abs(entryPrice - stopLoss);
            const profitTarget = isLongPosition
                ? entryPrice + (riskAmount * ratio)
                : entryPrice - (riskAmount * ratio);

            takeProfitInput.value = profitTarget.toFixed(2);
        }
    });
});
