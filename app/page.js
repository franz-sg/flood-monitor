'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, TrendingUp } from 'lucide-react';

export default function Home() {
  const [sfActual, setSfActual] = useState(null);
  const [sfPredicted, setSfPredicted] = useState(null);
  const [surgeAnomaly, setSurgeAnomaly] = useState(null);
  const [inferredLocal, setInferredLocal] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [manzanitaForecast, setManzanitaForecast] = useState(null);
  const [millerForecast, setMillerForecast] = useState(null);
  const [luckyForecast, setLuckyForecast] = useState(null);

  const ZONE_THRESHOLDS = {
    manzanita: 7.2,
    miller: 8.0,
    safeway: 8.3,
    lucky: 8.2,
    highway: 8.5,
  };

  const inferLocalTide = (sfLevel) => sfLevel + 0.35;

  const assessSurge = (actual, predicted) => {
    if (!actual || !predicted) return null;
    return actual - predicted;
  };

  const getManzanitaForecast = (local) => {
    if (local > ZONE_THRESHOLDS.manzanita) {
      return { label: 'LIKELY IMPASSABLE', color: '#d32f2f', context: 'The Bowl traps water. Drainage lag expected.' };
    }
    if (local > 6.8) {
      return { label: 'CAUTION', color: '#f57c00', context: 'Approaching threshold. High-clearance only.' };
    }
    return { label: 'PASSABLE', color: '#4caf50', context: 'Safe passage expected.' };
  };

  const getMillerForecast = (local) => {
    if (local > ZONE_THRESHOLDS.safeway) {
      return { label: 'BOTH BLOCKED', color: '#d32f2f', context: 'Tam High and Safeway both underwater.' };
    }
    if (local > ZONE_THRESHOLDS.miller) {
      return { label: 'TAM HIGH BLOCKED', color: '#d32f2f', context: 'Lower Miller impassable. Town Center still accessible.' };
    }
    if (local > 8.0) {
      return { label: 'CAUTION', color: '#f57c00', context: 'Approaching risk threshold.' };
    }
    return { label: 'PASSABLE', color: '#4caf50', context: 'Safe passage expected.' };
  };

  const getLuckyForecast = (local) => {
    if (local > ZONE_THRESHOLDS.highway) {
      return { label: 'HWY 101 THREAT', color: '#8b0000', context: 'Major highway flooding. Pump-dependent zone.' };
    }
    if (local > ZONE_THRESHOLDS.lucky) {
      return { label: 'RAMP CLOSED', color: '#d32f2f', context: 'Off-ramp likely barricaded.' };
    }
    if (local > 8.0) {
      return { label: 'CAUTION', color: '#f57c00', context: 'Approaching risk threshold.' };
    }
    return { label: 'PASSABLE', color: '#4caf50', context: 'Safe passage expected.' };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // STRESS TEST: Hardcode SF level to 7.126 (Jan 4 event)
        const actual = 7.126;
        const predicted = 6.8; // Typical prediction
        
        const local = inferLocalTide(actual);
        const surge = assessSurge(actual, predicted);
        
        setSfActual(actual);
        setSfPredicted(predicted);
        setInferredLocal(local);
        setSurgeAnomaly(surge);
        
        setManzanitaForecast(getManzanitaForecast(local));
        setMillerForecast(getMillerForecast(local));
        setLuckyForecast(getLuckyForecast(local));
        setLastUpdated(new Date());
      } catch (error) {
        console.log('Error:', error.message);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white">
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight">🔮 Mill Valley Flood Crystal Ball</h1>
              <p className="text-slate-400 text-sm mt-1">Predictive flood forecasting model (Not a live camera) - STRESS TEST MODE</p>
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
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300">
            <strong>⚠️ STRESS TEST MODE:</strong> SF Gauge is hardcoded to 7.126 ft (Jan 4 event). This is test data to verify dashboard behavior during flooding.
          </p>
        </div>

        <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>What This Is:</strong> A predictive model that projects future water conditions based on San Francisco Bay tide data. 
            It is not a live camera of current conditions. Use this for planning, not for real-time decisions.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-light mb-4 flex items-center gap-2">
            <span>⏱️ Horizon 1: The Imminent (Next 30-60 Minutes)</span>
          </h2>
          <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
            <p className="text-sm text-slate-400 mb-4">
              <strong>What is hitting us right now?</strong>
            </p>
            {sfActual && (
              <>
                <p className="text-lg text-slate-300 mb-2">
                  SF Gauge reads <strong className="text-2xl text-red-400">{sfActual.toFixed(2)} ft</strong>
                </p>
                <p className="text-sm text-slate-400 mb-4">
                  Based on the 30-minute lag, water at approximately <strong className="text-red-300">{inferredLocal?.toFixed(2)} ft</strong> is arriving at Mill Valley now.
                </p>
                {surgeAnomaly !== null && (
                  <p className="text-sm" style={{ color: surgeAnomaly > 0.5 ? '#f57c00' : '#4caf50' }}>
                    {surgeAnomaly > 0.5 
                      ? `⚠️ Surge Alert: Water is ${surgeAnomaly.toFixed(2)} ft higher than predicted.`
                      : `Normal conditions: Water is tracking with predictions.`}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-light mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Horizon 2: The Commute (Next 2-6 Hours)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg p-6 border" style={{ backgroundColor: `${manzanitaForecast?.color}20`, borderColor: manzanitaForecast?.color }}>
              <p className="text-xs text-slate-400 uppercase mb-2">Zone 1: Manzanita (Hwy 1)</p>
              <p className="text-2xl font-light mb-2" style={{ color: manzanitaForecast?.color }}>
                {manzanitaForecast?.label}
              </p>
              <p className="text-sm text-slate-300">{manzanitaForecast?.context}</p>
              <p className="text-xs text-slate-500 mt-3">Forecast threshold: 7.2 ft | Current: {inferredLocal?.toFixed(2)} ft</p>
            </div>

            <div className="rounded-lg p-6 border" style={{ backgroundColor: `${millerForecast?.color}20`, borderColor: millerForecast?.color }}>
              <p className="text-xs text-slate-400 uppercase mb-2">Zone 2: Miller Avenue</p>
              <p className="text-2xl font-light mb-2" style={{ color: millerForecast?.color }}>
                {millerForecast?.label}
              </p>
              <p className="text-sm text-slate-300">{millerForecast?.context}</p>
              <p className="text-xs text-slate-500 mt-3">Thresholds: 8.0 ft / 8.3 ft | Current: {inferredLocal?.toFixed(2)} ft</p>
            </div>

            <div className="rounded-lg p-6 border" style={{ backgroundColor: `${luckyForecast?.color}20`, borderColor: luckyForecast?.color }}>
              <p className="text-xs text-slate-400 uppercase mb-2">Zone 3: Lucky Drive and Hwy 101</p>
              <p className="text-2xl font-light mb-2" style={{ color: luckyForecast?.color }}>
                {luckyForecast?.label}
              </p>
              <p className="text-sm text-slate-300">{luckyForecast?.context}</p>
              <p className="text-xs text-slate-500 mt-3">Thresholds: 8.2 ft / 8.5 ft | Current: {inferredLocal?.toFixed(2)} ft</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-light mb-4">🔮 Horizon 3: The Outlook (Next 12-24 Hours)</h2>
          <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
            <p className="text-sm text-slate-400 mb-4">
              Use this for planning (e.g., moving your car). General astronomical forecast adjusted for sea level rise.
            </p>
            {sfPredicted && (
              <p className="text-lg text-slate-300">
                Expected trend: <strong className="text-2xl">{(sfPredicted + 0.25).toFixed(2)} ft</strong> (adjusted for climate)
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
          <h3 className="text-sm font-semibold mb-3 text-slate-300">Forecast Limitations</h3>
          <ul className="text-xs text-slate-400 space-y-2">
            <li><strong>The Crystal Ball is Imperfect:</strong> We predict based on tides and surge. We cannot predict pump failures, clogged drains, or flash floods.</li>
            <li><strong>The Wind Factor:</strong> Strong south winds can push water levels 0.5-1.0 ft higher than our model predicts.</li>
            <li><strong>Trust Your Eyes:</strong> This is a planning tool. Real-world conditions (barricades, debris) always override the data.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
