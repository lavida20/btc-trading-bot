// pages/api/analyze.js
// 🟢 BTC Range Engine + Liquidation Clusters + Multi-Horizon Probability
// works with Binance REST + WebSocket, supports backtest

import { Spot, Futures } from '@binance/connector';
import axios from 'axios';

let spotClient = new Spot();
let futuresClient = new Futures();
let wsConnected = false;
let liveCandles = [];
let liquidationClusters = [];

// config
const SYMBOL = 'BTCUSDT';
const INTERVAL = '1h'; // live candle interval
const LIQ_WS_URL = 'wss://fstream.binance.com/ws/btcusdt@forceOrder';
const CANDLE_LIMIT = 500;

// -------------------- WEBHOOK LIVE --------------------
function connectLiquidationWS() {
  if (wsConnected) return;
  const ws = new WebSocket(LIQ_WS_URL);

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    const cluster = {
      price: parseFloat(data.p),
      qty: parseFloat(data.q),
      side: data.S === 'BUY' ? 'buy' : 'sell',
      timestamp: data.T
    };
    liquidationClusters.push(cluster);
  };

  ws.onopen = () => {
    wsConnected = true;
    console.log('Liquidation WS connected');
  };

  ws.onclose = () => {
    wsConnected = false;
    console.log('Liquidation WS disconnected, retrying...');
    setTimeout(connectLiquidationWS, 2000);
  };
}

connectLiquidationWS();

// -------------------- FETCH HISTORICAL CANDLES --------------------
async function fetchHistoricalCandles(limit = CANDLE_LIMIT) {
  try {
    const resp = await spotClient.candles(SYMBOL, INTERVAL, { limit });
    return resp.map(c => ({
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
      timestamp: c[0]
    }));
  } catch (e) {
    console.error('Historical candle fetch failed:', e.message);
    return [];
  }
}

// -------------------- TECHNICALS --------------------
function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  const deltas = prices.slice(1).map((p, i) => p - prices[i]);
  let gains = 0, losses = 0;
  for (let i = 0; i < period; i++) {
    if (deltas[i] > 0) gains += deltas[i];
    else losses -= deltas[i];
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// -------------------- RANGE ENGINE --------------------
function detectRegime(candles) {
  const closes = candles.map(c => c.close);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  let type = 'range';
  let direction = 'neutral';
  if (ema20 > ema50) { type = 'trend'; direction = 'up'; }
  else if (ema20 < ema50) { type = 'trend'; direction = 'down'; }
  return { type, direction };
}

function calculateRealizedVolatility(candles, lookback = 24) {
  const closes = candles.slice(-lookback).map(c => c.close);
  const returns = closes.slice(1).map((p, i) => Math.log(p / closes[i]));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(365 * 24); // annualized
}

function projectRange(candles, currentPrice, horizonHours = 1) {
  const regime = detectRegime(candles);
  const realizedVol = calculateRealizedVolatility(candles, 24);
  let mult = 1;
  if (regime.type === 'trend') mult = 1.15;
  else if (regime.type === 'range') mult = 0.9;
  const width = currentPrice * realizedVol * Math.sqrt(horizonHours / 24) * mult;
  return { low: currentPrice - width/2, high: currentPrice + width/2, center: currentPrice };
}

// -------------------- BACKTEST --------------------
function backtestRanges(candles, horizons = [1,6,12]) {
  const results = horizons.map(h => {
    const hits = [];
    for (let i = 24; i < candles.length - h; i++) {
      const slice = candles.slice(i - 24, i);
      const range = projectRange(slice, candles[i].close, h);
      const futurePrice = candles[i+h].close;
      hits.push(futurePrice >= range.low && futurePrice <= range.high);
    }
    const accuracy = hits.filter(Boolean).length / hits.length;
    return { horizon: h, accuracy };
  });
  return results;
}

// -------------------- API HANDLER --------------------
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const candles = await fetchHistoricalCandles();
    const currentPrice = candles[candles.length-1].close;
    
    const horizons = [1,6,12];
    const rangePredictions = horizons.map(h => projectRange(candles, currentPrice, h));
    const backtest = backtestRanges(candles, horizons);

    res.status(200).json({
      success: true,
      timestamp: new Date(),
      currentPrice,
      rangePredictions,
      backtest,
      liquidationClusters
    });
  } catch (error) {
    console.error('Engine error', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
