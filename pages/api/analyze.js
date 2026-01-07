// pages/api/analyze.js - FIXED VERSION

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Fetch real BTC price from Binance
    const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    
    if (!binanceResponse.ok) {
      throw new Error('Binance API failed');
    }
    
    const binanceData = await binanceResponse.json();
    
    const currentPrice = parseFloat(binanceData.lastPrice);
    const change24h = parseFloat(binanceData.priceChangePercent);
    const volume24h = parseFloat(binanceData.quoteVolume);
    const high24h = parseFloat(binanceData.highPrice);
    const low24h = parseFloat(binanceData.lowPrice);
    
    // Fetch hourly candles for technical analysis
    const candlesResponse = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100');
    
    if (!candlesResponse.ok) {
      throw new Error('Failed to fetch candles');
    }
    
    const candles = await candlesResponse.json();
    const closePrices = candles.map(c => parseFloat(c[4]));
    
    // Calculate RSI
    const rsi = calculateRSI(closePrices, 14);
    
    // Calculate EMA
    const ema20 = calculateEMA(closePrices, 20);
    const ema50 = calculateEMA(closePrices, 50);
    
    // Calculate MACD
    const macd = calculateMACD(closePrices);
    
    // Generate 5-hour predictions
    const predictions = generate5HourPredictions(currentPrice, closePrices, rsi, macd);
    
    // Analyze signal
    const signal = analyzeSignal(currentPrice, predictions, rsi, macd, change24h);
    
    // Calculate support/resistance
    const support = Math.min(...closePrices.slice(-20));
    const resistance = Math.max(...closePrices.slice(-20));
    
    // Return complete analysis
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      market: {
        price: currentPrice,
        change24h: change24h,
        volume24h: volume24h,
        high24h: high24h,
        low24h: low24h,
        support: support,
        resistance: resistance
      },
      technicals: {
        rsi: rsi,
        ema20: ema20,
        ema50: ema50,
        macd: macd
      },
      signal: signal,
      predictions: predictions
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to fetch data', 
      message: error.message 
    });
  }
}

// Helper Functions

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) gains += changes[i];
    else losses -= changes[i];
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return parseFloat(rsi.toFixed(2));
}

function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return parseFloat(ema.toFixed(2));
}

function calculateMACD(prices) {
  if (prices.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }
  
  const ema12 = calculateEMA(prices.slice(-12), 12);
  const ema26 = calculateEMA(prices.slice(-26), 26);
  
  const macdLine = ema12 - ema26;
  const signalLine = macdLine * 0.9;
  const histogram = macdLine - signalLine;
  
  return {
    macd: parseFloat(macdLine.toFixed(2)),
    signal: parseFloat(signalLine.toFixed(2)),
    histogram: parseFloat(histogram.toFixed(2))
  };
}

function generate5HourPredictions(basePrice, historicalPrices, rsi, macd) {
  const predictions = [];
  let price = basePrice;
  
  const recent = historicalPrices.slice(-10);
  const trend = (recent[recent.length - 1] - recent[0]) / recent[0];
  
  const changes = [];
  for (let i = 1; i < historicalPrices.length; i++) {
    changes.push(Math.abs((historicalPrices[i] - historicalPrices[i-1]) / historicalPrices[i-1]));
  }
  const volatility = changes.reduce((a, b) => a + b, 0) / changes.length;
  
  let rsiFactor = 0;
  if (rsi > 70) rsiFactor = -0.005;
  else if (rsi < 30) rsiFactor = 0.005;
  
  const macdFactor = macd.histogram > 0 ? 0.002 : -0.002;
  
  for (let i = 1; i <= 10; i++) {
    const trendComponent = price * trend * 0.7 * (1 - i * 0.05);
    const indicatorComponent = price * (rsiFactor + macdFactor);
    const randomComponent = price * volatility * (Math.random() - 0.5) * 2;
    const meanReversion = (basePrice - price) * 0.15;
    
    price = price + trendComponent + indicatorComponent + randomComponent + meanReversion;
    
    predictions.push({
      interval: i,
      hours: i * 5,
      price: parseFloat(price.toFixed(2)),
      change: parseFloat(((price - basePrice) / basePrice * 100).toFixed(2))
    });
  }
  
  return predictions;
}

function analyzeSignal(current, predictions, rsi, macd, change24h) {
  const finalPrice = predictions[predictions.length - 1].price;
  const finalChange = ((finalPrice - current) / current) * 100;
  
  let upCount = 0;
  for (let i = 0; i < predictions.length - 1; i++) {
    if (predictions[i + 1].price > predictions[i].price) upCount++;
  }
  const trendConsistency = upCount / (predictions.length - 1);
  
  let techScore = 0;
  const signals = [];
  
  if (rsi > 70) {
    techScore -= 1;
    signals.push(`RSI Overbought (${rsi.toFixed(1)})`);
  } else if (rsi < 30) {
    techScore += 1;
    signals.push(`RSI Oversold (${rsi.toFixed(1)})`);
  } else {
    signals.push(`RSI Neutral (${rsi.toFixed(1)})`);
  }
  
  if (macd.histogram > 0) {
    techScore += 1;
    signals.push('MACD Bullish');
  } else {
    techScore -= 1;
    signals.push('MACD Bearish');
  }
  
  const combinedScore = finalChange + techScore + (change24h * 0.2);
  
  const stopLoss = parseFloat((current * 0.975).toFixed(2));
  const takeProfit = parseFloat((current * 1.05).toFixed(2));
  
  if (combinedScore > 3 && trendConsistency > 0.65) {
    return {
      type: 'STRONG BUY',
      confidence: Math.min(95, 70 + Math.abs(combinedScore) * 4),
      change: parseFloat(finalChange.toFixed(2)),
      signals: signals,
      analysis: `Strong bullish momentum. Trend consistency: ${(trendConsistency * 100).toFixed(0)}%`,
      recommendation: `Enter long position. Stop-loss: $${stopLoss.toLocaleString()} (-2.5%). Take-profit: $${takeProfit.toLocaleString()} (+5%)`,
      riskLevel: 'MEDIUM',
      stopLoss: stopLoss,
      takeProfit: takeProfit
    };
  } else if (combinedScore > 1.5) {
    return {
      type: 'BUY',
      confidence: Math.min(85, 60 + Math.abs(combinedScore) * 5),
      change: parseFloat(finalChange.toFixed(2)),
      signals: signals,
      analysis: `Moderate bullish trend. Market up ${change24h.toFixed(2)}% (24h)`,
      recommendation: `Consider buying. Stop-loss: $${stopLoss.toLocaleString()}`,
      riskLevel: 'MEDIUM',
      stopLoss: stopLoss,
      takeProfit: takeProfit
    };
  } else if (combinedScore < -3 && trendConsistency < 0.35) {
    return {
      type: 'STRONG SELL',
      confidence: Math.min(95, 70 + Math.abs(combinedScore) * 4),
      change: parseFloat(finalChange.toFixed(2)),
      signals: signals,
      analysis: 'Strong bearish pressure detected',
      recommendation: 'Exit positions or short. Protect capital',
      riskLevel: 'HIGH',
      stopLoss: stopLoss,
      takeProfit: takeProfit
    };
  } else if (combinedScore < -1.5) {
    return {
      type: 'SELL',
      confidence: Math.min(85, 60 + Math.abs(combinedScore) * 5),
      change: parseFloat(finalChange.toFixed(2)),
      signals: signals,
      analysis: 'Bearish trend forming',
      recommendation: 'Consider taking profits or reducing exposure',
      riskLevel: 'MEDIUM-HIGH',
      stopLoss: stopLoss,
      takeProfit: takeProfit
    };
  } else {
    return {
      type: 'HOLD',
      confidence: 65,
      change: parseFloat(finalChange.toFixed(2)),
      signals: signals,
      analysis: 'Mixed signals. Market consolidating',
      recommendation: 'Wait for clearer trend. No action recommended',
      riskLevel: 'LOW',
      stopLoss: stopLoss,
      takeProfit: takeProfit
    };
  }
}
