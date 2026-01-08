// pages/index.js - Range-Based Trading Bot Frontend

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
    const interval = setInterval(fetchAnalysis, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  const getSignalColor = (type) => {
    if (type?.includes('BUY')) return 'text-green-500 bg-green-500/20 border-green-500';
    if (type?.includes('SELL')) return 'text-red-500 bg-red-500/20 border-red-500';
    return 'text-yellow-500 bg-yellow-500/20 border-yellow-500';
  };

  const getZoneColor = (zone) => {
    if (zone === 'Support') return 'bg-green-500';
    if (zone === 'Resistance') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  return (
    <>
      <Head>
        <title>Bitcoin Range Trading Bot - Live Analysis</title>
        <meta name="description" content="Professional Bitcoin range-based trading with zone analysis" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              ₿ Bitcoin Range Trading Bot
            </h1>
            <p className="text-blue-200">Zone-Based Analysis • Multiple Timeframes • Smart Ranges</p>
          </div>

          {/* Update Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg"
            >
              {loading ? '🔄 Analyzing...' : '🔄 Refresh Analysis'}
            </button>
          </div>

          {lastUpdate && (
            <div className="text-center mb-6">
              <p className="text-sm text-blue-300">
                Last updated: {lastUpdate.toLocaleTimeString()} • Source: {data?.source}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
              <p className="text-red-200">❌ Error: {error}</p>
            </div>
          )}

          {loading && !data && (
            <div className="flex justify-center items-center h-64">
              <div className="text-white text-xl">Loading market data...</div>
            </div>
          )}

          {data && (
            <>
              {/* Current Price Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20 shadow-2xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-center md:text-left">
                    <p className="text-blue-200 text-sm mb-2">💰 Current BTC Price</p>
                    <p className="text-5xl md:text-6xl font-bold text-white mb-2">
                      ${data.market.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                    <p className={`text-lg font-semibold ${data.market.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.market.change24h >= 0 ? '▲' : '▼'} {Math.abs(data.market.change24h).toFixed(2)}% (24h)
                    </p>
                  </div>
                  {data.signal && (
                    <div className={`${getSignalColor(data.signal.type)} px-6 py-4 rounded-xl border-2`}>
                      <p className="text-sm opacity-80">Current Zone</p>
                      <p className="text-2xl font-bold">{data.signal.currentZone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Market Structure */}
              {data.marketStructure && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20 shadow-xl">
                  <h3 className="text-xl font-bold text-white mb-4">📊 Market Structure</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-blue-200 text-sm mb-1">Position in Range</p>
                      <p className="text-3xl font-bold text-white">{data.marketStructure.position}%</p>
                      <p className="text-xs text-white/60 mt-1">{data.marketStructure.structure}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-blue-200 text-sm mb-1">Bias</p>
                      <p className={`text-3xl font-bold ${data.marketStructure.bias === 'BULLISH' ? 'text-green-400' : data.marketStructure.bias === 'BEARISH' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {data.marketStructure.bias}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-blue-200 text-sm mb-2">Key Levels</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/70">Resistance:</span>
                          <span className="text-red-400 font-bold">${data.marketStructure.keyLevels.resistance.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Support:</span>
                          <span className="text-green-400 font-bold">${data.marketStructure.keyLevels.support.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trading Signal */}
              {data.signal && (
                <div className={`${getSignalColor(data.signal.type)} border-2 rounded-2xl p-6 mb-6 shadow-xl`}>
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-3xl font-bold text-white mb-2">
                        🎯 Signal: {data.signal.type}
                      </h3>
                      <p className="text-white/90 mb-2">
                        <strong>Analysis:</strong> {data.signal.analysis}
                      </p>
                      <p className="text-white/80 text-sm mb-3">
                        <strong>Action:</strong> {data.signal.recommendation}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {data.signal.signals.map((sig, i) => (
                          <span key={i} className="bg-white/10 text-white/90 px-3 py-1 rounded-full text-xs">
                            {sig}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-center bg-white/10 rounded-xl p-4 min-w-[140px]">
                      <p className="text-white/80 text-sm mb-1">Confidence</p>
                      <p className="text-5xl font-bold text-white">{data.signal.confidence}%</p>
                      <p className="text-sm text-white/70 mt-2">Risk: {data.signal.riskLevel}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* RANGE FORECASTS - MAIN FEATURE */}
              {data.rangeForecasts && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20 shadow-xl">
                  <h3 className="text-2xl font-bold text-white mb-6">🎯 Multi-Timeframe Range Predictions</h3>
                  
                  <div className="space-y-6">
                    {data.rangeForecasts.map((forecast, idx) => (
                      <div key={idx} className="bg-white/5 rounded-xl p-5 border border-white/10 hover:bg-white/10 transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xl font-bold text-white">⏰ {forecast.timeframe} Range Prediction</h4>
                          <div className="text-right">
                            <p className="text-xs text-white/60">Most Likely Price</p>
                            <p className="text-2xl font-bold text-blue-400">${forecast.mostLikely.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          {/* Support Zone */}
                          <div className="bg-green-500/10 border-2 border-green-500 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <p className="text-green-400 font-bold text-sm">SUPPORT ZONE</p>
                            </div>
                            <p className="text-2xl font-bold text-white mb-1">
                              ${forecast.supportZone.low.toLocaleString()} - ${forecast.supportZone.high.toLocaleString()}
                            </p>
                            <p className="text-xs text-white/70">{forecast.supportZone.description}</p>
                          </div>

                          {/* Trading Range */}
                          <div className="bg-yellow-500/10 border-2 border-yellow-500 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <p className="text-yellow-400 font-bold text-sm">TRADING RANGE</p>
                            </div>
                            <p className="text-2xl font-bold text-white mb-1">
                              ${forecast.tradingRange.low.toLocaleString()} - ${forecast.tradingRange.high.toLocaleString()}
                            </p>
                            <p className="text-xs text-white/70">{forecast.tradingRange.description}</p>
                          </div>

                          {/* Resistance Zone */}
                          <div className="bg-red-500/10 border-2 border-red-500 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <p className="text-red-400 font-bold text-sm">RESISTANCE ZONE</p>
                            </div>
                            <p className="text-2xl font-bold text-white mb-1">
                              ${forecast.resistanceZone.low.toLocaleString()} - ${forecast.resistanceZone.high.toLocaleString()}
                            </p>
                            <p className="text-xs text-white/70">{forecast.resistanceZone.description}</p>
                          </div>
                        </div>

                        {/* Breakout Probabilities */}
                        <div className="flex gap-4 text-sm">
                          <div className="flex-1 bg-green-500/10 rounded-lg p-3">
                            <p className="text-white/70 mb-1">↗️ Breakout Up</p>
                            <p className="text-xl font-bold text-green-400">{forecast.breakoutProbability.upside}%</p>
                          </div>
                          <div className="flex-1 bg-red-500/10 rounded-lg p-3">
                            <p className="text-white/70 mb-1">↘️ Breakout Down</p>
                            <p className="text-xl font-bold text-red-400">{forecast.breakoutProbability.downside}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Indicators */}
              {data.technicals && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
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
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-blue-200 text-xs mb-1">EMA (50)</p>
                      <p className="text-2xl font-bold text-white">${(data.technicals.ema50 / 1000).toFixed(1)}k</p>
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
              )}

              {/* Disclaimer */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-200 text-sm">
                  ⚠️ <strong>Risk Warning:</strong> This bot uses range-based technical analysis. Cryptocurrency trading is highly risky. Price ranges are estimates and not guarantees. Always use proper risk management and never invest more than you can afford to lose. This is NOT financial advice.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
