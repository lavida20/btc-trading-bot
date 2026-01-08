// pages/index.js - PROFESSIONAL QUANT TRADING INTERFACE

import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedHorizon, setSelectedHorizon] = useState(1); // Index of selected timeframe

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
    const interval = setInterval(fetchAnalysis, 180000); // 3 min
    return () => clearInterval(interval);
  }, []);

  const getZoneColor = (zoneName) => {
    if (zoneName?.includes('Strong Buy')) return 'bg-green-600';
    if (zoneName?.includes('Buy')) return 'bg-green-500';
    if (zoneName?.includes('Neutral')) return 'bg-yellow-500';
    if (zoneName?.includes('Sell') && !zoneName.includes('Strong')) return 'bg-orange-500';
    if (zoneName?.includes('Strong Sell')) return 'bg-red-600';
    return 'bg-gray-500';
  };

  const getConfidenceColor = (conf) => {
    if (conf >= 80) return 'text-green-400';
    if (conf >= 70) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getRegimeColor = (regime) => {
    if (regime === 'trend') return 'text-purple-400';
    if (regime === 'range') return 'text-blue-400';
    if (regime === 'expansion') return 'text-red-400';
    if (regime === 'compression') return 'text-green-400';
    return 'text-gray-400';
  };

  return (
    <>
      <Head>
        <title>Quant Range Prediction Engine | BTC Trading</title>
        <meta name="description" content="Production-grade Bitcoin range prediction using quantitative analysis" />
      </Head>

      <main className="min-h-screen bg-slate-950 text-white">
        {/* Header */}
        <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-[1800px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <span className="text-blue-500">₿</span>
                  QUANT RANGE ENGINE
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">LIVE</span>
                </h1>
                <p className="text-sm text-slate-400">Probabilistic Price Range Prediction • Not Direction Calls</p>
              </div>
              <div className="flex items-center gap-4">
                {lastUpdate && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Last Update</p>
                    <p className="text-sm text-slate-300">{lastUpdate.toLocaleTimeString()}</p>
                  </div>
                )}
                <button
                  onClick={fetchAnalysis}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded-lg font-medium transition-all flex items-center gap-2"
                >
                  {loading ? '⟳ Analyzing...' : '↻ Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="max-w-[1800px] mx-auto px-4 py-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400">⚠ Error: {error}</p>
            </div>
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Initializing quant engine...</p>
            </div>
          </div>
        )}

        {data && (
          <div className="max-w-[1800px] mx-auto px-4 py-6 space-y-6">
            
            {/* Current Price & Market State */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Current Price */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <p className="text-xs text-slate-500 mb-2">SPOT PRICE</p>
                <p className="text-4xl font-bold mb-1">${data.currentPrice.toLocaleString()}</p>
                <p className={`text-sm font-medium ${data.market.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.market.change24h >= 0 ? '▲' : '▼'} {Math.abs(data.market.change24h).toFixed(2)}% (24h)
                </p>
              </div>

              {/* Current Zone */}
              {data.tradingZones && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <p className="text-xs text-slate-500 mb-2">CURRENT POSITION</p>
                  <div className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${getZoneColor(data.tradingZones.currentZone)}`}>
                    {data.tradingZones.currentZone}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Price is in {data.tradingZones.currentZone.toLowerCase()}
                  </p>
                </div>
              )}

              {/* Regime */}
              {data.marketAssessment && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <p className="text-xs text-slate-500 mb-2">MARKET REGIME</p>
                  <p className={`text-2xl font-bold uppercase ${getRegimeColor(data.marketAssessment.regime.type)}`}>
                    {data.marketAssessment.regime.type}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Strength: {(data.marketAssessment.regime.strength * 100).toFixed(0)}% • 
                    Dir: {data.marketAssessment.regime.direction}
                  </p>
                </div>
              )}
            </div>

            {/* Market Assessment Dashboard */}
            {data.marketAssessment && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-4">📊 MARKET ASSESSMENT</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Volatility</p>
                    <p className="text-xl font-bold text-blue-400">{data.marketAssessment.volatility.annualized}%</p>
                    <p className="text-xs text-slate-400 uppercase">{data.marketAssessment.volatility.state}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">Momentum</p>
                    <p className={`text-xl font-bold ${data.marketAssessment.momentum.value > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.marketAssessment.momentum.value > 0 ? '+' : ''}{(data.marketAssessment.momentum.value * 100).toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-400 uppercase">{data.marketAssessment.momentum.direction}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">RSI (14)</p>
                    <p className={`text-xl font-bold ${data.marketAssessment.technicals.rsi > 70 ? 'text-red-400' : data.marketAssessment.technicals.rsi < 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {data.marketAssessment.technicals.rsi}
                    </p>
                    <p className="text-xs text-slate-400">
                      {data.marketAssessment.technicals.rsi > 70 ? 'OVERBOUGHT' : data.marketAssessment.technicals.rsi < 30 ? 'OVERSOLD' : 'NEUTRAL'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">vs EMA20</p>
                    <p className={`text-xl font-bold ${data.marketAssessment.technicals.priceVsEMA20 > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.marketAssessment.technicals.priceVsEMA20 > 0 ? '+' : ''}{data.marketAssessment.technicals.priceVsEMA20}%
                    </p>
                    <p className="text-xs text-slate-400">
                      ${data.marketAssessment.technicals.ema20.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">vs VWAP</p>
                    <p className={`text-xl font-bold ${data.marketAssessment.structure.position === 'above VWAP' ? 'text-green-400' : 'text-red-400'}`}>
                      {data.marketAssessment.structure.position === 'above VWAP' ? 'ABOVE' : 'BELOW'}
                    </p>
                    <p className="text-xs text-slate-400">
                      ${data.marketAssessment.structure.vwap.toLocaleString()}
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* Range Predictions - Tabbed Interface */}
            {data.rangePredictions && data.rangePredictions.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                
                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-900/50">
                  {data.rangePredictions.map((pred, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedHorizon(idx)}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                        selectedHorizon === idx
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {pred.timeframe}
                    </button>
                  ))}
                </div>

                {/* Selected Prediction Details */}
                {data.rangePredictions[selectedHorizon] && (() => {
                  const pred = data.rangePredictions[selectedHorizon];
                  return (
                    <div className="p-6">
                      
                      {/* Range Display */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-2xl font-bold">PREDICTED RANGE</h3>
                            <p className="text-sm text-slate-400">Next {pred.horizonHours} hour{pred.horizonHours > 1 ? 's' : ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">CONFIDENCE</p>
                            <p className={`text-4xl font-bold ${getConfidenceColor(pred.confidence)}`}>
                              {pred.confidence}%
                            </p>
                          </div>
                        </div>

                        {/* Visual Range Bar */}
                        <div className="bg-slate-800 rounded-lg p-6 mb-4">
                          <div className="flex items-center justify-between mb-2 text-sm">
                            <span className="text-green-400 font-bold">LOW: ${pred.range.low.toLocaleString()}</span>
                            <span className="text-blue-400 font-bold">CENTER: ${pred.range.center.toLocaleString()}</span>
                            <span className="text-red-400 font-bold">HIGH: ${pred.range.high.toLocaleString()}</span>
                          </div>
                          
                          <div className="relative h-8 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 rounded-full overflow-hidden">
                            {/* Current price marker */}
                            <div 
                              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                              style={{
                                left: `${((data.currentPrice - pred.range.low) / (pred.range.high - pred.range.low) * 100)}%`
                              }}
                            >
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold whitespace-nowrap">
                                NOW
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between mt-2 text-xs text-slate-400">
                            <span>Buy Zone</span>
                            <span>Neutral</span>
                            <span>Sell Zone</span>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-slate-800 rounded-lg p-4">
                            <p className="text-xs text-slate-500 mb-1">Range Width</p>
                            <p className="text-xl font-bold">${pred.range.width.toLocaleString()}</p>
                            <p className="text-xs text-slate-400">{pred.range.widthPercent}%</p>
                          </div>

                          <div className="bg-slate-800 rounded-lg p-4">
                            <p className="text-xs text-slate-500 mb-1">Volatility</p>
                            <p className={`text-xl font-bold ${pred.volatility.state === 'high' ? 'text-red-400' : pred.volatility.state === 'low' ? 'text-green-400' : 'text-yellow-400'}`}>
                              {pred.volatility.projected}%
                            </p>
                            <p className="text-xs text-slate-400 uppercase">{pred.volatility.state}</p>
                          </div>

                          <div className="bg-slate-800 rounded-lg p-4">
                            <p className="text-xs text-slate-500 mb-1">Bias</p>
                            <p className={`text-xl font-bold ${pred.momentum.bias.includes('bullish') ? 'text-green-400' : pred.momentum.bias.includes('bearish') ? 'text-red-400' : 'text-yellow-400'}`}>
                              {pred.momentum.bias.includes('bullish') ? '↗' : pred.momentum.bias.includes('bearish') ? '↘' : '→'}
                            </p>
                            <p className="text-xs text-slate-400 uppercase">{pred.momentum.bias}</p>
                          </div>

                          <div className="bg-slate-800 rounded-lg p-4">
                            <p className="text-xs text-slate-500 mb-1">Regime</p>
                            <p className={`text-xl font-bold uppercase ${getRegimeColor(pred.regime.type)}`}>
                              {pred.regime.type}
                            </p>
                            <p className="text-xs text-slate-400">{(pred.regime.strength * 100).toFixed(0)}% strength</p>
                          </div>
                        </div>
                      </div>

                      {/* Invalidation Conditions */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                          <p className="text-sm font-bold text-red-400 mb-2">🚨 HARD INVALIDATIONS</p>
                          <ul className="space-y-1 text-xs text-slate-300">
                            {pred.invalidations.hard.map((inv, i) => (
                              <li key={i}>• {inv}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                          <p className="text-sm font-bold text-yellow-400 mb-2">⚠️ SOFT INVALIDATIONS</p>
                          <ul className="space-y-1 text-xs text-slate-300">
                            {pred.invalidations.soft.map((inv, i) => (
                              <li key={i}>• {inv}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </div>
            )}

            {/* Trading Zones */}
            {data.tradingZones && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-4">🎯 TRADING ZONES (2h Horizon)</h2>
                <div className="grid md:grid-cols-5 gap-4">
                  
                  <div className="bg-green-600/20 border border-green-600 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                      <p className="text-xs font-bold text-green-400">STRONG BUY</p>
                    </div>
                    <p className="text-lg font-bold mb-1">
                      ${data.tradingZones.strongBuyZone.low.toLocaleString()}-${data.tradingZones.strongBuyZone.high.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400">{data.tradingZones.strongBuyZone.description}</p>
                  </div>

                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <p className="text-xs font-bold text-green-400">BUY</p>
                    </div>
                    <p className="text-lg font-bold mb-1">
                      ${data.tradingZones.buyZone.low.toLocaleString()}-${data.tradingZones.buyZone.high.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400">{data.tradingZones.buyZone.description}</p>
                  </div>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <p className="text-xs font-bold text-yellow-400">NEUTRAL</p>
                    </div>
                    <p className="text-lg font-bold mb-1">
                      ${data.tradingZones.neutralZone.low.toLocaleString()}-${data.tradingZones.neutralZone.high.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400">{data.tradingZones.neutralZone.description}</p>
                  </div>

                  <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <p className="text-xs font-bold text-orange-400">SELL</p>
                    </div>
                    <p className="text-lg font-bold mb-1">
                      ${data.tradingZones.sellZone.low.toLocaleString()}-${data.tradingZones.sellZone.high.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400">{data.tradingZones.sellZone.description}</p>
                  </div>

                  <div className="bg-red-600/20 border border-red-600 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                      <p className="text-xs font-bold text-red-400">STRONG SELL</p>
                    </div>
                    <p className="text-lg font-bold mb-1">
                      ${data.tradingZones.strongSellZone.low.toLocaleString()}-${data.tradingZones.strongSellZone.high.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400">{data.tradingZones.strongSellZone.description}</p>
                  </div>

                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-xs text-yellow-200">
                <strong>⚠️ PROFESSIONAL TOOL DISCLAIMER:</strong> This is a quantitative range prediction engine designed for price range estimation, NOT directional trading. Predictions are probabilistic and based on realized volatility, market structure, and regime detection. Past performance does not guarantee future results. Target is ≥80% range hit rate, not maximum profit. Use proper risk management. This is NOT financial advice. Trade at your own risk.
              </p>
            </div>

          </div>
        )}
      </main>
    </>
  );
}
