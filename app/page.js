'use client';

import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Info } from 'lucide-react';

export default function Home() {
  const [sfActual, setSfActual] = useState(null);
  const [sfPredicted, setSfPredicted] = useState(null);
  const [surgeAnomaly, setSurgeAnomaly] = useState(null);
  const [smartLocalTide, setSmartLocalTide] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [manzanitaStatus, setManzanitaStatus] = useState(null);
  const [millerStatus, setMillerStatus] = useState(null);
  const [luckyStatus, setLuckyStatus] = useState(null);
  const [riseRate, setRiseRate] = useState(null);
  const [nextHighTide, setNextHighTide] = useState(null);
  const [allPredictions, setAllPredictions] = useState([]);
  const [closureTimes, setClosureTimes] = useState({});
  const [showTransparency, setShowTransparency] = useState(false);

  const ZONE_THRESHOLDS = {
    manzanita: { rising: 6.8, closure: 7.2 },
    miller: { tam: 8.0, safeway: 8.3 },
    lucky: { ramp: 8.2 },
  };

  const getSmartLocalTide = (sfValue, surge) => {
    const baseAmplification = 0.35;
    const dynamicOffset = Math.max(surge > 0.1 ? surge : 0, 0.25);
    return sfValue + baseAmplification + dynamicOffset;
  };

  const assessSurge = (actual, predicted) => {
    if (!actual || !predicted) return 0;
    return actual - predicted;
  };

  const getManzanitaStatus = (level) => {
    if (level > ZONE_THRESHOLDS.manzanita.closure) {
      return { label: 'LIKELY IMPASSABLE', color: '#d32f2f', context: 'The Bowl Effect: Traps water. Add +45 mins to drainage time.' };
    }
    if (level > ZONE_THRESHOLDS.manzanita.rising) {
      return { label: 'RISING RISK', color: '#f57c00', context: 'Water approaching Manzanita threshold.' };
    }
    return { label: 'LOW TIDAL RISK', color: '#475569', context: 'Below risk threshold.' };
  };

  const getMillerStatus = (level) => {
    if (level > ZONE_THRESHOLDS.miller.safeway) {
      return { label: 'HIGH RISK', color: '#d32f2f', context: 'Water entering Safeway lots. Both Tam High and Town Center at risk.' };
    }
    if (level > ZONE_THRESHOLDS.miller.tam) {
      return { label: 'PARTIAL BLOCK', color: '#f57c00', context: 'Tam High blocked. Safeway accessible from Downtown only.' };
    }
    return { label: 'LOW TIDAL RISK', color: '#475569', context: 'Below risk threshold.' };
  };

  const getLuckyStatus = (level) => {
    if (level > ZONE_THRESHOLDS.lucky.ramp) {
      return { label: 'RAMP CLOSED', color: '#d32f2f', context: 'Pump Dependent: If pumps fail, flooding occurs regardless of tide.' };
    }
    return { label: 'LOW TIDAL RISK', color: '#475569', context: 'Below risk threshold.' };
  };

  const calculateClosureTimes = (predictions, surge) => {
    const times = {
      manzanita: null,
      tamHigh: null,
      safeway: null,
      lucky: null,
    };

    predictions.forEach(p => {
      const sfLevel = parseFloat(p.v);
      const smartLevel = getSmartLocalTide(sfLevel, surge);
      const timeStr = new Date(p.t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      if (smartLevel > 7.2 && !times.manzanita) times.manzanita = timeStr;
      if (smartLevel > 8.0 && !times.tamHigh) times.tamHigh = timeStr;
      if (smartLevel > 8.3 && !times.safeway) times.safeway = timeStr;
      if (smartLevel > 8.2 && !times.lucky) times.lucky = timeStr;
    });

    return times;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const actualResponse = await fetch(
          `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=water_level&date=latest&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=millvalleybriefing`
        );
        const actualData = await actualResponse.json();
        
        if (actualData.data && actualData.data.length > 0) {
          const latest = actualData.data[actualData.data.length - 1];
          const actual = parseFloat(latest.v);
          
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 3600000);
          const tomorrow = new Date(now.getTime() + 24 * 3600000);
          
          const hourlyResponse = await fetch(
            `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=water_level&begin_date=${oneHourAgo.getFullYear()}${String(oneHourAgo.getMonth() + 1).padStart(2, '0')}${String(oneHourAgo.getDate()).padStart(2, '0')} ${String(oneHourAgo.getHours()).padStart(2, '0')}${String(oneHourAgo.getMinutes()).padStart(2, '0')}&end_date=${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=millvalleybriefing`
          );
          const hourlyDataResponse = await hourlyResponse.json();
          
          if (hourlyDataResponse.data && hourlyDataResponse.data.length > 1) {
            const oldest = parseFloat(hourlyDataResponse.data[0].v);
            const newest = parseFloat(hourlyDataResponse.data[hourlyDataResponse.data.length - 1].v);
            const risePerHour = newest - oldest;
            setRiseRate(risePerHour);
          }
          
          const predResponse = await fetch(
            `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=predictions&begin_date=${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}&end_date=${tomorrow.getFullYear()}${String(tomorrow.getMonth() + 1).padStart(2, '0')}${String(tomorrow.getDate()).padStart(2, '0')} ${String(tomorrow.getHours()).padStart(2, '0')}${String(tomorrow.getMinutes()).padStart(2, '0')}&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json&application=millvalleybriefing`
          );
          
          let predicted = actual;
          const predData = await predResponse.json();
          if (predData.predictions && predData.predictions.length > 0) {
            setAllPredictions(predData.predictions);
            
            const closest = predData.predictions.reduce((prev, curr) => {
              const prevTime = new Date(prev.t).getTime();
              const currTime = new Date(curr.t).getTime();
              const nowTime = new Date(latest.t).getTime();
              return Math.abs(currTime - nowTime) < Math.abs(prevTime - nowTime) ? curr : prev;
            });
            predicted = parseFloat(closest.v);
            
            const highs = predData.predictions.filter(p => p.type === 'H').sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
            if (highs.length > 0) {
              const nextHigh = highs[0];
              const sfHighLevel = parseFloat(nextHigh.v);
              const surge = assessSurge(actual, predicted);
              const localHighLevel = getSmartLocalTide(sfHighLevel, surge);
              
              setNextHighTide({
                sfLevel: sfHighLevel,
                localLevel: localHighLevel,
                time: new Date(nextHigh.t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                date: new Date(nextHigh.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              });
            }
          }
          
          const surge = assessSurge(actual, predicted);
          const smartLocal = getSmartLocalTide(actual, surge);
          
          setSfActual(actual);
          setSfPredicted(predicted);
          setSurgeAnomaly(surge);
          setSmartLocalTide(smartLocal);
          
          setManzanitaStatus(getManzanitaStatus(smartLocal));
          setMillerStatus(getMillerStatus(smartLocal));
          setLuckyStatus(getLuckyStatus(smartLocal));
          
          if (predData.predictions) {
            const times = calculateClosureTimes(predData.predictions, surge);
            setClosureTimes(times);
          }
          
          setLastUpdated(new Date(latest.t));
        }
      } catch (error) {
        console.log('API error:', error.message);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const getRiseRateContext = () => {
    if (riseRate === null) return null;
    if (riseRate > 0.15) return { text: 'Rising rapidly', color: '#d32f2f', concern: 'Very concerning. Flooding could occur faster than expected.' };
    if (riseRate > 0.05) return { text: 'Rising moderately', color: '#f57c00', concern: 'Monitor closely. Plan for potential zone closures.' };
    if (riseRate > 0) return { text: 'Rising slowly', color: '#f59e0b', concern: 'Normal tidal progression. Follow standard forecasts.' };
    if (riseRate < -0.05) return { text: 'Falling', color: '#475569', concern: 'Water receding. Conditions improving.' };
    return { text: 'Stable', color: '#475569', concern: 'No significant change in water level.' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white">
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight">🔮 Mill Valley Flood Crystal Ball</h1>
              <p className="text-slate-400 text-sm mt-1">Predictive Model (Not a Live Camera)</p>
            </div>
            {lastUpdated && (
              <div className="text-right text-slate-400 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>What This Is:</strong> A predictive model that projects future water conditions based on San Francisco Bay tide data. 
            It is not a live camera. Use this for planning, not real-time decisions.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-light mb-4">⏱️ Horizon 1: The Imminent (Next 30-60 Minutes)</h2>
          <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
            <p className="text-sm text-slate-400 mb-4"><strong>What is hitting us right now?</strong></p>
            {sfActual && (
              <>
                <p className="text-lg text-slate-300 mb-4">
                  SF Gauge currently reads <strong className="text-2xl">{sfActual.toFixed(2)} ft</strong>
                </p>
                
                <p className="text-sm text-slate-400 mb-3">
                  <strong>Why this matters:</strong> The SF level is a predictor of Mill Valley's future. Due to the 30-minute lag and local amplification, 
                  this SF reading will increase by 0.35 ft when it reaches Mill Valley.
                </p>
                
                <p className="text-sm text-slate-300 mb-4">
                  <strong>Expected in Mill Valley:</strong> Around <strong>{new Date(new Date().getTime() + 30 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong>, 
                  Mill Valley water levels should reach approximately <strong className="text-xl">{smartLocalTide?.toFixed(2)} ft</strong>.
                </p>

                <div className="mt-6 pt-4 border-t border-slate-600">
                  <p className="text-sm text-slate-400 mb-3"><strong>How Fast Is It Rising?</strong></p>
                  {riseRate !== null && getRiseRateContext() && (
                    <>
                      <p className="text-sm text-slate-300 mb-2">
                        Past hour: <span style={{ color: getRiseRateContext().color }} className="font-semibold">
                          {getRiseRateContext().text} ({riseRate > 0 ? '+' : ''}{riseRate.toFixed(3)} ft/hour)
                        </span>
                      </p>
                      <p className="text-sm text-slate-300 mb-3">{getRiseRateContext().concern}</p>
                      {surgeAnomaly && (
                        <p className="text-sm text-slate-300">
                          {surgeAnomaly > 0.3
                            ? `⚠️ Water is running ${surgeAnomaly.toFixed(2)} ft higher than tide tables predict. Flooding likely sooner.`
                            : `✓ Water tracking normally with predictions.`}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-light mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Horizon 2: The Commute (Next 6 Hours)
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            <strong>Zone Risk Assessment:</strong> Water levels at which zones become inaccessible. Times calculated using real-time surge adjustments.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg p-6 border" style={{ backgroundColor: `${manzanitaStatus?.color}20`, borderColor: manzanitaStatus?.color }}>
              <p className="text-xs text-slate-400 uppercase mb-2">Zone 1: Manzanita (Hwy 1)</p>
              <p className="text-2xl font-light mb-2" style={{ color: manzanitaStatus?.color }}>
                {manzanitaStatus?.label}
              </p>
              <p className="text-sm text-slate-300 mb-3">{manzanitaStatus?.context}</p>
              <div className="text-xs text-slate-500 space-y-1">
                <p><strong>Rising Risk:</strong> 6.8 ft</p>
                <p><strong>Closure Threshold:</strong> 7.2 ft</p>
                <p><strong>Current Level:</strong> {smartLocalTide?.toFixed(2)} ft</p>
                {closureTimes.manzanita && (
                  <p className="text-slate-400 mt-2"><strong>Expected Closure:</strong> {closureTimes.manzanita}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg p-6 border" style={{ backgroundColor: `${millerStatus?.color}20`, borderColor: millerStatus?.color }}>
              <p className="text-xs text-slate-400 uppercase mb-2">Zone 2: Miller Avenue</p>
              <p className="text-2xl font-light mb-2" style={{ color: millerStatus?.color }}>
                {millerStatus?.label}
              </p>
              <p className="text-sm text-slate-300 mb-3">{millerStatus?.context}</p>
              <div className="text-xs text-slate-500 space-y-1">
                <p><strong>Tam High Closes:</strong> 8.0 ft</p>
                <p><strong>Safeway Closes:</strong> 8.3 ft</p>
                <p><strong>Current Level:</strong> {smartLocalTide?.toFixed(2)} ft</p>
                {closureTimes.tamHigh && (
                  <div className="text-slate-400 mt-2 space-y-1">
                    <p><strong>Tam High:</strong> {closureTimes.tamHigh}</p>
                    {closureTimes.safeway && <p><strong>Safeway:</strong> {closureTimes.safeway}</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg p-6 border" style={{ backgroundColor: `${luckyStatus?.color}20`, borderColor: luckyStatus?.color }}>
              <p className="text-xs text-slate-400 uppercase mb-2">Zone 3: Lucky Drive and Hwy 101</p>
              <p className="text-2xl font-light mb-2" style={{ color: luckyStatus?.color }}>
                {luckyStatus?.label}
              </p>
              <p className="text-sm text-slate-300 mb-3">{luckyStatus?.context}</p>
              <div className="text-xs text-slate-500 space-y-1">
                <p><strong>Ramp Closes:</strong> 8.2 ft</p>
                <p><strong>Current Level:</strong> {smartLocalTide?.toFixed(2)} ft</p>
                {closureTimes.lucky && (
                  <p className="text-slate-400 mt-2"><strong>Expected Closure:</strong> {closureTimes.lucky}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-light mb-4">🔮 Horizon 3: The Outlook (Next 24 Hours)</h2>
          <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
            <p className="text-sm text-slate-400 mb-4">
              <strong>Planning Tool:</strong> Use this to decide whether to move your car, avoid commutes, or plan ahead for zone closures.
            </p>
            {nextHighTide && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2">Next High Tide Expected:</p>
                  <p className="text-2xl text-slate-300 font-light">
                    <strong>{nextHighTide.time}</strong> on <strong>{nextHighTide.date}</strong>
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-700/30 rounded p-4">
                    <p className="text-xs text-slate-400 uppercase mb-2">SF Level at Peak</p>
                    <p className="text-2xl font-light">{nextHighTide.sfLevel.toFixed(2)} ft</p>
                  </div>
                  <div className="bg-slate-700/30 rounded p-4">
                    <p className="text-xs text-slate-400 uppercase mb-2">Mill Valley Peak (Adjusted)</p>
                    <p className="text-2xl font-light">{nextHighTide.localLevel.toFixed(2)} ft</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-600">
                  <p className="text-sm text-slate-400 mb-3"><strong>Zone Closures Expected at Peak:</strong></p>
                  <ul className="text-sm text-slate-300 space-y-2">
                    {nextHighTide.localLevel > 7.2 && (
                      <li>• <strong>Manzanita (Hwy 1):</strong> LIKELY IMPASSABLE</li>
                    )}
                    {nextHighTide.localLevel > 8.0 && (
                      <li>• <strong>Miller Avenue (Tam High):</strong> At Risk or CLOSED</li>
                    )}
                    {nextHighTide.localLevel > 8.3 && (
                      <li>• <strong>Safeway Area:</strong> HIGH RISK - Avoid</li>
                    )}
                    {nextHighTide.localLevel > 8.2 && (
                      <li>• <strong>Lucky Drive Ramp:</strong> RAMP CLOSED</li>
                    )}
                    {nextHighTide.localLevel <= 7.2 && (
                      <li>• No major zone closures expected</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <button
            onClick={() => setShowTransparency(!showTransparency)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 mb-4"
          >
            <Info className="w-4 h-4" />
            {showTransparency ? 'Hide' : 'Show'} How This Works
          </button>
          
          {showTransparency && (
            <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700 space-y-4">
              <div>
                <p className="font-semibold text-sm mb-2 text-slate-300">The Smart Forecast Formula</p>
                <p className="text-xs text-slate-400">
                  <strong>Mill Valley Level = SF Level + 0.35 ft (Local Depth) + Dynamic Offset</strong>
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  The Dynamic Offset is either the Real-Time Surge (if water is running higher than predicted) or 0.25 ft (climate correction for outdated 1992 NOAA data), whichever is larger.
                </p>
              </div>
              <div>
                <p className="font-semibold text-sm mb-2 text-slate-300">Why 0.35 ft?</p>
                <p className="text-xs text-slate-400">
                  Mill Valley's geography amplifies the Bay's tidal range. Water arriving from SF gains an additional 0.35 ft due to local depth and funnel effects.
                </p>
              </div>
              <div>
                <p className="font-semibold text-sm mb-2 text-slate-300">Why the 0.25 ft Climate Fix?</p>
                <p className="text-xs text-slate-400">
                  NOAA's tide tables use 1983-2001 data. Sea level has risen approximately 0.25 ft since then. We add this to all forecasts.
                </p>
              </div>
              <div>
                <p className="font-semibold text-sm mb-2 text-slate-300">Real-Time Surge</p>
                <p className="text-xs text-slate-400">
                  If water is currently higher than the tide table predicts, we use that actual difference (Surge Anomaly) instead of the fixed 0.25 ft. This accounts for storms and wind effects.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3 className="text-sm font-semibold mb-3 text-red-300">Critical Limitations</h3>
          <ul className="text-xs text-slate-400 space-y-2">
            <li><strong>Cannot Predict:</strong> Pump failures, clogged storm drains, or flash floods from inland storms.</li>
            <li><strong>Wind Factor:</strong> Strong south winds can push water levels an additional 0.5-1.0 ft higher than this model predicts.</li>
            <li><strong>Trust Authorities:</strong> Police barricades, road signs, and local warnings always override this app. If authorities say a road is closed, it is closed.</li>
            <li><strong>This is Not Real-Time:</strong> We predict based on tides and historical surge patterns. Real-world conditions change. Always look before you go.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
