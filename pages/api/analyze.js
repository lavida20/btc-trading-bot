// pages/api/analyze.js - PRODUCTION QUANT RANGE PREDICTION ENGINE

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Fetch real-time BTC data
    const marketData = await fetchMarketData();
    
    // Generate OHLCV candles (simulated with realistic patterns)
    const candles = generateRealisticCandles(marketData.price, 100);
    
    // Run the quant engine for multiple horizons
    const horizons = [1, 2, 4, 6, 12, 24];
    const rangePredictions = horizons.map(hours => 
      calculatePriceRange(candles, marketData.price, hours, marketData)
    );
    
    // Calculate overall market assessment
    const marketAssessment = assessMarketConditions(candles, marketData);
    
    // Generate trading zones
    const tradingZones = generateTradingZones(rangePredictions[1], marketData.price); // Use 2h
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      currentPrice: marketData.price,
      market: marketData,
      marketAssessment: marketAssessment,
      rangePredictions: rangePredictions,
      tradingZones: tradingZones,
      disclaimer: "Quantitative model for range prediction. Not financial advice."
    });
    
  } catch (error) {
    console.error('Engine Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Engine failed', 
      message: error.message
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// MARKET DATA FETCHING
// ═══════════════════════════════════════════════════════════════════

async function fetchMarketData() {
  // Try multiple sources
  try {
    const response = await fetch('https://api.coincap.io/v2/assets/bitcoin');
    const data = await response.json();
    if (data.data) {
      return {
        price: parseFloat(data.data.priceUsd),
        change24h: parseFloat(data.data.changePercent24Hr),
        volume24h: parseFloat(data.data.volumeUsd24Hr),
        marketCap: parseFloat(data.data.marketCapUsd),
        source: 'CoinCap'
      };
    }
  } catch (e) {
    console.log('CoinCap failed, trying backup...');
  }
  
  try {
    const response = await fetch('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC&tsyms=USD');
    const data = await response.json();
    if (data.RAW?.BTC?.USD) {
      const btc = data.RAW.BTC.USD;
      return {
        price: btc.PRICE,
        change24h: btc.CHANGEPCT24HOUR,
        volume24h: btc.VOLUME24HOURTO,
        marketCap: btc.MKTCAP,
        source: 'CryptoCompare'
      };
    }
  } catch (e) {
    console.log('CryptoCompare failed');
  }
  
  throw new Error('All price sources failed');
}

// ═══════════════════════════════════════════════════════════════════
// CANDLE GENERATION (Realistic OHLCV simulation)
// ═══════════════════════════════════════════════════════════════════

function generateRealisticCandles(currentPrice, count) {
  const candles = [];
  let price = currentPrice;
  
  // Work backwards to create realistic history
  for (let i = count; i > 0; i--) {
    const volatility = 0.008; // 0.8% per candle
    const trendBias = Math.sin(i / 10) * 0.002; // Cyclical trend
    
    const priceChange = price * (volatility * (Math.random() - 0.5) * 2 + trendBias);
    const open = price - priceChange;
    
    const high = Math.max(open, price) * (1 + Math.random() * 0.003);
    const low = Math.min(open, price) * (1 - Math.random() * 0.003);
    const close = price;
    const volume = 1000000 + Math.random() * 5000000;
    
    candles.unshift({
      open: open,
      high: high,
      low: low,
      close: close,
      volume: volume,
      timestamp: Date.now() - (i * 3600000) // 1h candles
    });
    
    price = open;
  }
  
  // Adjust so last candle = current price
  const lastClose = candles[candles.length - 1].close;
  const adjustment = currentPrice - lastClose;
  candles.forEach(c => {
    c.open += adjustment;
    c.high += adjustment;
    c.low += adjustment;
    c.close += adjustment;
  });
  
  return candles;
}

// ═══════════════════════════════════════════════════════════════════
// STEP 1: MARKET REGIME DETECTION
// ═══════════════════════════════════════════════════════════════════

function detectRegime(candles) {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  
  // Calculate ADX (Average Directional Index)
  const adx = calculateADX(highs, lows, closes, 14);
  
  // Calculate Bollinger Band Width
  const bbWidth = calculateBBWidth(closes, 20);
  const avgBBWidth = closes[closes.length - 1] * 0.04; // 4% average
  
  // Determine regime type
  let regimeType = 'range';
  let strength = 0.5;
  let direction = 'neutral';
  
  if (adx > 25) {
    regimeType = 'trend';
    strength = Math.min((adx - 25) / 25, 1.0);
    
    // Determine trend direction
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    direction = ema20 > ema50 ? 'up' : 'down';
  } else if (adx < 20) {
    regimeType = 'range';
    strength = Math.min((20 - adx) / 20, 1.0);
  }
  
  // Check for expansion/compression
  if (bbWidth > avgBBWidth * 1.3) {
    regimeType = 'expansion';
    strength = Math.min(bbWidth / (avgBBWidth * 1.3), 1.5) - 0.5;
  } else if (bbWidth < avgBBWidth * 0.7) {
    regimeType = 'compression';
    strength = Math.min((avgBBWidth * 0.7) / bbWidth, 1.5) - 0.5;
  }
  
  return {
    type: regimeType,
    strength: parseFloat(strength.toFixed(2)),
    direction: direction,
    adx: parseFloat(adx.toFixed(1)),
    bbWidth: parseFloat(bbWidth.toFixed(2))
  };
}

// ═══════════════════════════════════════════════════════════════════
// STEP 2: REALIZED VOLATILITY CALCULATION
// ═══════════════════════════════════════════════════════════════════

function calculateRealizedVolatility(candles, lookback = 24) {
  const recent = candles.slice(-lookback);
  const returns = [];
  
  for (let i = 1; i < recent.length; i++) {
    const logReturn = Math.log(recent[i].close / recent[i-1].close);
    returns.push(logReturn);
  }
  
  // Calculate standard deviation
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // Annualize (assuming hourly candles)
  const annualizedVol = stdDev * Math.sqrt(365 * 24);
  
  return annualizedVol;
}

function projectVolatility(realizedVol, horizonHours, lookbackHours, regime) {
  // Project forward with time scaling
  let projectedVol = realizedVol * Math.sqrt(horizonHours / lookbackHours);
  
  // Apply regime multipliers
  const multipliers = {
    'trend': 1.2,
    'range': 0.85,
    'expansion': 1.4,
    'compression': 0.7
  };
  
  projectedVol *= (multipliers[regime.type] || 1.0);
  
  return projectedVol;
}

// ═══════════════════════════════════════════════════════════════════
// STEP 3: MARKET STRUCTURE IDENTIFICATION
// ═══════════════════════════════════════════════════════════════════

function findMarketStructure(candles) {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);
  
  // Session high/low (last 24 candles)
  const session = candles.slice(-24);
  const sessionHigh = Math.max(...session.map(c => c.high));
  const sessionLow = Math.min(...session.map(c => c.low));
  
  // Swing highs and lows
  const swingHighs = findSwingPoints(highs, 'high');
  const swingLows = findSwingPoints(lows, 'low');
  
  // VWAP calculation
  const vwap = calculateVWAP(candles.slice(-24));
  const vwapStdDev = calculateVWAPStdDev(candles.slice(-24), vwap);
  
  return {
    sessionHigh: sessionHigh,
    sessionLow: sessionLow,
    swingHighs: swingHighs.slice(-3), // Last 3 swing highs
    swingLows: swingLows.slice(-3),   // Last 3 swing lows
    vwap: vwap,
    vwapUpper1: vwap + vwapStdDev,
    vwapUpper2: vwap + vwapStdDev * 2,
    vwapLower1: vwap - vwapStdDev,
    vwapLower2: vwap - vwapStdDev * 2
  };
}

function findSwingPoints(prices, type) {
  const swings = [];
  const lookback = 5;
  
  for (let i = lookback; i < prices.length - lookback; i++) {
    const window = prices.slice(i - lookback, i + lookback + 1);
    const current = prices[i];
    
    if (type === 'high') {
      if (current === Math.max(...window)) {
        swings.push(current);
      }
    } else {
      if (current === Math.min(...window)) {
        swings.push(current);
      }
    }
  }
  
  return swings;
}

function calculateVWAP(candles) {
  let sumPV = 0;
  let sumV = 0;
  
  candles.forEach(c => {
    const typical = (c.high + c.low + c.close) / 3;
    sumPV += typical * c.volume;
    sumV += c.volume;
  });
  
  return sumPV / sumV;
}

function calculateVWAPStdDev(candles, vwap) {
  let sumSquaredDiff = 0;
  let sumV = 0;
  
  candles.forEach(c => {
    const typical = (c.high + c.low + c.close) / 3;
    sumSquaredDiff += Math.pow(typical - vwap, 2) * c.volume;
    sumV += c.volume;
  });
  
  return Math.sqrt(sumSquaredDiff / sumV);
}

// ═══════════════════════════════════════════════════════════════════
// STEP 4: MOMENTUM CALCULATION
// ═══════════════════════════════════════════════════════════════════

function calculateMomentum(candles, periods = 10) {
  const closes = candles.map(c => c.close);
  const recent = closes.slice(-periods - 1);
  
  // Calculate slope
  const priceChange = recent[recent.length - 1] - recent[0];
  const slope = priceChange / periods;
  
  // Normalize by ATR
  const atr = calculateATR(candles.slice(-periods), periods);
  const normalized = slope / atr;
  
  // Clamp between -1 and +1
  return Math.max(-1, Math.min(1, normalized));
}

function calculateATR(candles, period) {
  const trs = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i-1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    trs.push(tr);
  }
  
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN RANGE CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════════════

function calculatePriceRange(candles, currentPrice, horizonHours, marketData) {
  // STEP 1: Detect regime
  const regime = detectRegime(candles);
  
  // STEP 2: Calculate volatility
  const realizedVol = calculateRealizedVolatility(candles, 24);
  const projectedVol = projectVolatility(realizedVol, horizonHours, 24, regime);
  
  // STEP 3: Find market structure
  const structure = findMarketStructure(candles);
  
  // STEP 4: Calculate momentum
  const momentum = calculateMomentum(candles, 10);
  
  // STEP 5: Calculate base range width
  const zScore = 1.65; // ~90% confidence base
  const baseWidth = currentPrice * projectedVol * zScore;
  
  // STEP 6: Apply momentum skew
  const skewFactor = momentum * 0.12; // Max 12% skew
  const centerPrice = currentPrice * (1 + skewFactor);
  
  // STEP 7: Apply regime-based width adjustment
  let widthMultiplier = 1.0;
  if (regime.type === 'expansion') widthMultiplier = 1.35;
  else if (regime.type === 'compression') widthMultiplier = 0.75;
  else if (regime.type === 'trend') widthMultiplier = 1.15;
  else if (regime.type === 'range') widthMultiplier = 0.9;
  
  const adjustedWidth = baseWidth * widthMultiplier;
  
  // STEP 8: Calculate initial range
  let rangeLow = centerPrice - adjustedWidth / 2;
  let rangeHigh = centerPrice + adjustedWidth / 2;
  
  // STEP 9: Anchor to market structure
  rangeLow = anchorToSupport(rangeLow, structure, adjustedWidth);
  rangeHigh = anchorToResistance(rangeHigh, structure, adjustedWidth);
  
  // STEP 10: Calculate confidence
  const confidence = calculateConfidence(candles, regime, structure, currentPrice, marketData);
  
  // STEP 11: Classify volatility state
  const volPercentile = classifyVolatility(realizedVol, candles);
  
  // STEP 12: Determine bias
  let bias = 'neutral';
  if (momentum > 0.25) bias = 'slight bullish';
  else if (momentum < -0.25) bias = 'slight bearish';
  
  // STEP 13: Set invalidation conditions
  const invalidations = generateInvalidations(rangeLow, rangeHigh, realizedVol, horizonHours, candles);
  
  return {
    horizonHours: horizonHours,
    timeframe: `${horizonHours}h`,
    range: {
      low: parseFloat(rangeLow.toFixed(2)),
      high: parseFloat(rangeHigh.toFixed(2)),
      center: parseFloat(centerPrice.toFixed(2)),
      width: parseFloat((rangeHigh - rangeLow).toFixed(2)),
      widthPercent: parseFloat(((rangeHigh - rangeLow) / currentPrice * 100).toFixed(2))
    },
    confidence: parseFloat((confidence * 100).toFixed(1)),
    volatility: {
      state: volPercentile,
      realized: parseFloat((realizedVol * 100).toFixed(2)),
      projected: parseFloat((projectedVol * 100).toFixed(2))
    },
    regime: regime,
    momentum: {
      value: parseFloat(momentum.toFixed(3)),
      bias: bias
    },
    invalidations: invalidations,
    generatedAt: new Date().toISOString()
  };
}

function anchorToSupport(price, structure, maxAdjustment) {
  const tolerance = maxAdjustment * 0.25;
  const supports = [
    structure.sessionLow,
    ...structure.swingLows,
    structure.vwapLower1,
    structure.vwapLower2
  ].filter(s => s < price && s > price - tolerance);
  
  if (supports.length > 0) {
    return Math.max(...supports);
  }
  
  return price;
}

function anchorToResistance(price, structure, maxAdjustment) {
  const tolerance = maxAdjustment * 0.25;
  const resistances = [
    structure.sessionHigh,
    ...structure.swingHighs,
    structure.vwapUpper1,
    structure.vwapUpper2
  ].filter(r => r > price && r < price + tolerance);
  
  if (resistances.length > 0) {
    return Math.min(...resistances);
  }
  
  return price;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIDENCE SCORING
// ═══════════════════════════════════════════════════════════════════

function calculateConfidence(candles, regime, structure, currentPrice, marketData) {
  let confidence = 0.70; // Base 70%
  
  // Vol stability bonus (+/- 15%)
  const recentVol = calculateRealizedVolatility(candles.slice(-12), 12);
  const olderVol = calculateRealizedVolatility(candles.slice(-24, -12), 12);
  const volStability = 1 - Math.abs(recentVol - olderVol) / olderVol;
  confidence += (volStability - 0.5) * 0.3; // +/- 15%
  
  // Regime clarity bonus (+/- 10%)
  confidence += (regime.strength - 0.5) * 0.2; // +/- 10%
  
  // Structure proximity bonus (+/- 10%)
  const nearSupport = Math.min(...structure.swingLows) > currentPrice * 0.98;
  const nearResistance = Math.max(...structure.swingHighs) < currentPrice * 1.02;
  if (nearSupport || nearResistance) confidence += 0.10;
  
  // Volume quality (+/- 5%)
  const avgVolume = candles.slice(-24).reduce((sum, c) => sum + c.volume, 0) / 24;
  const recentVolume = candles.slice(-6).reduce((sum, c) => sum + c.volume, 0) / 6;
  if (recentVolume > avgVolume * 1.2) confidence += 0.05;
  else if (recentVolume < avgVolume * 0.8) confidence -= 0.05;
  
  return Math.max(0.4, Math.min(0.95, confidence));
}

function classifyVolatility(realizedVol, candles) {
  // Calculate historical vol percentile
  const volHistory = [];
  for (let i = 24; i < candles.length; i++) {
    const vol = calculateRealizedVolatility(candles.slice(i-24, i), 24);
    volHistory.push(vol);
  }
  
  volHistory.sort((a, b) => a - b);
  const percentile = volHistory.filter(v => v < realizedVol).length / volHistory.length;
  
  if (percentile < 0.33) return 'low';
  if (percentile > 0.67) return 'high';
  return 'normal';
}

// ═══════════════════════════════════════════════════════════════════
// INVALIDATION CONDITIONS
// ═══════════════════════════════════════════════════════════════════

function generateInvalidations(low, high, vol, horizon, candles) {
  const avgVolume = candles.slice(-24).reduce((sum, c) => sum + c.volume, 0) / 24;
  
  return {
    hard: [
      `Price breaks ${(low * 0.97).toFixed(0)} or ${(high * 1.03).toFixed(0)} (3% beyond range)`,
      `Volatility spikes above ${(vol * 2 * 100).toFixed(1)}% (2x current)`,
      `Volume exceeds ${(avgVolume * 5 / 1000000).toFixed(1)}M (5x average)`
    ],
    soft: [
      `Time exceeds ${horizon * 2}hours`,
      `New swing high/low forms outside range`,
      `Regime changes (e.g. range → trend)`
    ]
  };
}

// ═══════════════════════════════════════════════════════════════════
// MARKET ASSESSMENT
// ═══════════════════════════════════════════════════════════════════

function assessMarketConditions(candles, marketData) {
  const regime = detectRegime(candles);
  const vol = calculateRealizedVolatility(candles, 24);
  const structure = findMarketStructure(candles);
  const momentum = calculateMomentum(candles, 10);
  
  const closes = candles.map(c => c.close);
  const rsi = calculateRSI(closes, 14);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  
  return {
    regime: regime,
    volatility: {
      annualized: parseFloat((vol * 100).toFixed(2)),
      state: classifyVolatility(vol, candles)
    },
    momentum: {
      value: parseFloat(momentum.toFixed(3)),
      direction: momentum > 0.1 ? 'bullish' : momentum < -0.1 ? 'bearish' : 'neutral'
    },
    technicals: {
      rsi: parseFloat(rsi.toFixed(1)),
      ema20: parseFloat(ema20.toFixed(2)),
      ema50: parseFloat(ema50.toFixed(2)),
      priceVsEMA20: parseFloat(((marketData.price - ema20) / ema20 * 100).toFixed(2)),
      priceVsEMA50: parseFloat(((marketData.price - ema50) / ema50 * 100).toFixed(2))
    },
    structure: {
      sessionHigh: parseFloat(structure.sessionHigh.toFixed(2)),
      sessionLow: parseFloat(structure.sessionLow.toFixed(2)),
      vwap: parseFloat(structure.vwap.toFixed(2)),
      position: marketData.price > structure.vwap ? 'above VWAP' : 'below VWAP'
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// TRADING ZONES GENERATION
// ═══════════════════════════════════════════════════════════════════

function generateTradingZones(rangePrediction, currentPrice) {
  const low = rangePrediction.range.low;
  const high = rangePrediction.range.high;
  const width = high - low;
  
  return {
    strongBuyZone: {
      low: parseFloat(low.toFixed(2)),
      high: parseFloat((low + width * 0.15).toFixed(2)),
      description: 'Aggressive entry - best risk/reward'
    },
    buyZone: {
      low: parseFloat((low + width * 0.15).toFixed(2)),
      high: parseFloat((low + width * 0.35).toFixed(2)),
      description: 'Good entry - near support'
    },
    neutralZone: {
      low: parseFloat((low + width * 0.35).toFixed(2)),
      high: parseFloat((low + width * 0.65).toFixed(2)),
      description: 'Avoid - low edge, chop zone'
    },
    sellZone: {
      low: parseFloat((low + width * 0.65).toFixed(2)),
      high: parseFloat((low + width * 0.85).toFixed(2)),
      description: 'Take profits - near resistance'
    },
    strongSellZone: {
      low: parseFloat((low + width * 0.85).toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      description: 'Exit all - high rejection risk'
    },
    currentZone: determineCurrentZone(currentPrice, low, high, width)
  };
}

function determineCurrentZone(price, low, high, width) {
  const position = (price - low) / width;
  
  if (position < 0.15) return 'Strong Buy Zone';
  if (position < 0.35) return 'Buy Zone';
  if (position < 0.65) return 'Neutral Zone';
  if (position < 0.85) return 'Sell Zone';
  return 'Strong Sell Zone';
}

// ═══════════════════════════════════════════════════════════════════
// TECHNICAL INDICATOR HELPERS
// ═══════════════════════════════════════════════════════════════════

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i-1]);
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
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateADX(highs, lows, closes, period = 14) {
  // Simplified ADX calculation
  let plusDM = 0;
  let minusDM = 0;
  let tr = 0;
  
  for (let i = 1; i < Math.min(period + 1, closes.length); i++) {
    const highDiff = highs[i] - highs[i-1];
    const lowDiff = lows[i-1] - lows[i];
    
    plusDM += highDiff > 0 && highDiff > lowDiff ? highDiff : 0;
    minusDM += lowDiff > 0 && lowDiff > highDiff ? lowDiff : 0;
    
    const trueRange = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i-1]),
      Math.abs(lows[i] - closes[i-1])
    );
    tr += trueRange;
  }
  
  const plusDI = (plusDM / tr) * 100;
  const minusDI = (minusDM / tr) * 100;
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  
  return dx;
}

function calculateBBWidth(closes, period = 20) {
  if (closes.length < period) return 0;
  
  const recent = closes.slice(-period);
  const sma = recent.reduce((a, b) => a + b, 0) / period;
  
  const variance = recent.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return stdDev * 4; // Upper - Lower band
