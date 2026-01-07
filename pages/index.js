// pages/index.js - Main page for your Vercel app

import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analyze');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const result = await response.json();
      setData(result);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAnalysis, 300000);
    return () => clearInterval(interval);
  }, []);

  const getSignalColor = (type) => {
    if (type?.includes('BUY')) return 'text-green-500 bg-green-500/20 border-green-500';
    if (type?.includes('SELL')) return 'text-red-500 bg-red-500/20 border-red-500';
    return 'text-yellow-500 bg-yellow-500/20 border-yellow-500';
  };

  const getSignalIcon = (type) => {
    if (type?.includes('BUY')) return '📈';
    if (type?.includes('SELL')) return '📉';
    return '⏸️';
  };

  return (
    <>
      <Head>
        <title>Bitcoin Trading Bot - Live Analysis</title>
        <meta name="description" content="Real-time Bitcoin trading analysis with AI predictions" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              ₿ Bitcoin Trading Bot
            </h1>
            <p className="text-blue-200">Real-Time Analysis • 5-Hour Predictions • Technical Indicators</p>
          </div>

          {/* Update Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center gap-2"
            >
              {loading ? '🔄 Analyzing...' : '🔄 Refresh Analysis'}
            </button>
          </div>

          {/* Last Update */}
          {lastUpdate && (
            <div className="text-center mb-6">
              <p className="text-sm text-blue-300">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
              <p className="text-red-200">❌ Error: {error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && !data && (
            <div className="flex justify-center items-center h-64">
              <div className="text-white text-xl">Loading market data...</div>
            </div>
          )}

          {/* Main Content */}
          {data && (
            <>
              {/* Price Cards */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <p className="text-blue-200 text-sm mb-2">💰 Current BTC Price</p>
                  <p className="text-5xl font-bold text-white mb-2">
                    ${data.market.price.toLocaleString()}
                  </p>
                  <p className={`text-lg font-semibold ${data.market.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.market.change24h >= 0 ? '▲' : '▼'} {Math.abs(data.market.change24h).toFixed(2)}% (24h)
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <p className="text-blue-200 text-sm mb-3">Market Statistics</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">24h High</span>
                      <span className="text-white font-semibold">${data.market.high24h.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">24h Low</span>
                      <span className="text-white font-semibold">${data.market.low24h.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">24h Volume</span>
                      <span className="text-white font-semibold">${(data.market.volume24h / 1e9).toFixed(2)}B</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Support</span>
                      <span className="text-green-400 font-semibold">${data.market.support.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Resistance</span>
                      <span className="text-red-400 font-semibold">${data.market.resistance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Indicators */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">📊 Technical Indicators</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-blue-200 text-xs mb-1">RSI (14)</p>
                    <p className="text-2xl font-bold text-white">{data.technicals.rsi}</p>
                    <p className={`text-xs mt-1 ${data.technicals.rsi > 70 ? 'text-red-400' : data.technicals.rsi < 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {data.technicals.rsi > 70 ? 'Overbought' : data.technicals.rsi < 30 ? 'Oversold' : 'Neutral'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-blue-200 text-xs mb-1">EMA (20)</p>
                    <p className="text-2xl font-bold text-white">${(data.technicals.ema20 / 1000).toFixed(1)}k</p>
                    <p className={`text-xs mt-1 ${data.market.price > data.technicals.ema20 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.market.price > data.technicals.ema20 ? 'Above' : 'Below'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-blue-200 text-xs mb-1">EMA (50)</p>
                    <p className="text-2xl font-bold text-white">${(data.technicals.ema50 / 1000).toFixed(1)}k</p>
                    <p className={`text-xs mt-1 ${data.market.price > data.technicals.ema50 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.market.price > data.technicals.ema50 ? 'Above' : 'Below'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-blue-200 text-xs mb-1">MACD</p>
                    <p className="text-2xl font-bold text-white">{data.technicals.macd.macd.toFixed(1)}</p>
                    <p className={`text-xs mt-1 ${data.technicals.macd.histogram > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.technicals.macd.histogram > 0 ? 'Bullish' : 'Bearish'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trading Signal */}
              <div className={`${getSignalColor(data.signal.type)} border-2 rounded-2xl p-6 mb-6`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="text-5xl">{getSignalIcon(data.signal.type)}</div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        🎯 Signal: {data.signal.type}
                      </h3>
                      <p className="text-white/90 text-sm mb-1">
                        <strong>Analysis:</strong> {data.signal.analysis}
                      </p>
                      <p className="text-white/80 text-sm mb-2">
                        <strong>Action:</strong> {data.signal.recommendation}
                      </p>
                      <p className="text-white/70 text-xs">
                        Risk Level: {data.signal.riskLevel}
                      </p>
                    </div>
                  </div>
                  <div className="text-center bg-white/10 rounded-xl p-4 min-w-[140px]">
                    <p className="text-white/80 text-sm mb-1">Confidence</p>
                    <p className="text-4xl font-bold text-white">{data.signal.confidence.toFixed(0)}%</p>
                    <p className={`text-sm mt-2 font-semibold ${data.signal.change > 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {data.signal.change > 0 ? '▲' : '▼'} {Math.abs(data.signal.change).toFixed(2)}%
                    </p>
                    <p className="text-xs text-white/60 mt-1">50h forecast</p>
                  </div>
                </div>

                {/* Technical Signals */}
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-white/80 text-sm font-semibold mb-2">Technical Signals:</p>
                  <div className="flex flex-wrap gap-2">
                    {data.signal.signals.map((sig, i) => (
                      <span key={i} className="bg-white/10 text-white/90 px-3 py-1 rounded-full text-xs">
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Risk Management */}
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-white/80 text-sm font-semibold mb-2">Risk Management:</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/70">Stop Loss:</span>
                      <span className="text-red-400 font-bold ml-2">${data.signal.stopLoss.toLocaleString()}</span>
                      <span className="text-white/60 ml-1">(-2.5%)</span>
                    </div>
                    <div>
                      <span className="text-white/70">Take Profit:</span>
                      <span className="text-green-400 font-bold ml-2">${data.signal.takeProfit.toLocaleString()}</span>
                      <span className="text-white/60 ml-1">(+5%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Predictions */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">🔮 5-Hour Interval Predictions (50 Hours)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {data.predictions.map((pred) => {
                    const isPositive = pred.change > 0;
                    return (
                      <div key={pred.interval} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all">
                        <p className="text-blue-200 text-xs mb-1">+{pred.hours}h</p>
                        <p className="text-2xl font-bold text-white">
                          ${(pred.price / 1000).toFixed(1)}k
                        </p>
                        <p className={`text-xs mt-1 font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {isPositive ? '↑' : '↓'} {Math.abs(pred.change).toFixed(2)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-200 text-sm">
                  ⚠️ <strong>Risk Warning:</strong> Cryptocurrency trading carries significant risk. This bot provides analysis based on technical indicators and historical patterns, but cannot predict future price movements with certainty. Never invest more than you can afford to lose. This is NOT financial advice. Always conduct your own research.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
