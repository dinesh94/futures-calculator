// save as getQuotes.js and run: node getQuotes.js
// Node v18+ (has global fetch)

async function fetchQuotes() {
  // Yahoo uses these tickers for futures: ES=F, NQ=F
  console.log('Fetching quotes for ES=F and NQ=F');
  const symbols = 'ES=F,NQ=F';
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error('HTTP', res.status);
    console.error(await res.text());
    return;
  }
  const body = await res.json();
  const quotes = body?.quoteResponse?.result || [];
  for (const q of quotes) {
    console.log(`${q.symbol}  price=${q.regularMarketPrice}  time=${new Date(q.regularMarketTime*1000).toISOString()}`);
  }
}

fetchQuotes().catch(console.error);
