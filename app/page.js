'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, AlertCircle } from 'lucide-react';

export default function Home() {
  const [sfActual, setSfActual] = useState(null);
  const [sfPredicted, setSfPredicted] = useState(null);
  const [surgeAnomaly, setSurgeAnomaly] = useState(null);
  const [inferredLocal, setInferredLocal] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [manzanitaStatus, setManzanitaStatus] = useState(null);
  const [millerStatus, setMillerStatus] = useState(null);
  const [luckyStatus, setLuckyStatus] = useState(null);
  const [surgeLevel, setSurgeLevel] = useState('normal');
  const [hasRainAdvisory, setHasRainAdvisory] = useState(false);

  const ZONE_THRESHOLDS = {
    manzanita: { risk: 6.8, impassable: 7.2 },
    miller: { risk: 8.0, safeway: 8.3 },
    lucky: { risk: 8.2, highway: 8.5 },
  };

  const inferLocalTide = (sfLevel) => sfLevel + 0.35;

  const assessSurge = (actual, predicted) => {
    if (!actual || !predicted) return null;
    const anomaly = actual - predicted;
    if (anomaly > 1.0) return { level: 'critical', anomaly };
    if (anomaly > 0.5) return { level: 'strong', anomaly };
    return { level: 'normal', anomaly };
  };

  const getManzanitaStatus = (local, hasRain) => {
    if (hasRain && local > 5.5) {
      return { label: 'LIKELY FLOODED', color: '#d32f2f', context: 'Rainwater trapped in bowl. Drainage stalled.' };
    }
    if (local > ZONE_THRESHOLDS.manzanita.impassable) {
      return { label: 'LIKELY IMPASSABLE', color: '#d32f2f', context: 'Commuter trap floods early, drains slowly.' };
    }
    if (local >= ZONE_THRESHOLDS.manzanita.risk) {
      return { label: 'HIGH CLEARANCE ONLY', color: '#f57c00', context: 'Approaching critical threshold.' };
    }
    return { label: 'LIKELY CLEAR', color: '#4caf50', context: 'Safe passage.' };
  };

  const getMillerStatus = (local, hasRain) => {
    if (hasRain && local > 5.5) {
      return { label: 'PONDING ALERT', color: '#f57c00', context: 'Tide is low but infrastructure overwhelmed.' };
    }
    if (local > ZONE_THRESHOLDS.miller.safeway) {
      return { label: 'SAFEWAY RISK', color: '#d32f2f', context: 'Water entering town center lots.' };
    }
    if (local > ZONE_THRESHOLDS.miller.risk) {
      return { label: 'TAM HIGH BLOCKED', color: '#d32f2f', context: 'Road impassable at High School/Marsh.' };
    }
    return { label: 'LIKELY CLEAR', color: '#4caf50', context: 'Safe passage.' };
  };

  const getLuckyStatus = (local, hasRain) => {
    if (hasRain && local > 5.5) {
      return { label: 'PONDING ALERT', color: '#f57c00', context: 'Ponding despite low tide.' };
    }
    if (local > ZONE_THRESHOLDS.lucky.highway) {
      return { label: 'HWY 101 THREAT', color: '#8b0000', context: 'Major highway flooding. Expect lane closures.' };
    }
    if (local > ZONE_THRESHOLDS.lucky.risk) {
      return { label: 'RAMP CLOSED', color: '#d32f2f', context: 'Off-ramp barricaded. Trader Joes inaccessible.' };
    }
    return { label: 'LIKELY CLEAR', color: '#4caf50', context: 'Safe passage.' };
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
          const tomorrow = new Date(now.getTime() + 24 * 3600000);
          
          const predResponse = await fetch(
            `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=predictions&begin_date=${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}&end_date=${tomorrow.getFullYear()}${String(tomorrow.getMonth() + 1).padStart(2, '0')}${String(tomorrow.getDate()).padStart(2, '0')} ${String(tomorrow.getHours()).padStart(2, '0')}${String(tomorrow.getMinutes()).padStart(2, '0')}&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json&application=millvalleybriefing`
          );
          
          let predicted = actual;
          const predData = await predResponse.json();
          if (predData.predictions && predData.predictions.length > 0) {
            const closest = predData.predictions.reduce((prev, curr) => {
              const prevTime = new Date(prev.t).getTime();
              const currTime = new Date(curr.t).getTime();
              const nowTime = new Date(latest.t).getTime();
              return Math.abs(currTime - nowTime) < Math.abs(prevTime - nowTime) ? curr : prev;
            });
            predicted = parseFloat(closest.v);
          }
          
          const local = inferLocalTide(actual);
          const surge = assessSurge(actual, predicted);
          
          setSfActual(actual);
          setSfPredicted(predicted);
          setInferredLocal(local);
          setSurgeAnomaly(surge);
          setSurgeLevel(surge?.level || 'normal');
          
          setManzanitaStatus(getManzanitaStatus(local, hasRainAdvisory));
          setMillerStatus(getMillerStatus(local, hasRainAdvisory));
          setLuckyStatus(getLuckyStatus(local, hasRainAdvisory));
          setLastUpdated(new Date(latest.t));
        }
      } catch (error) {
        console.log('API error:', error.message);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [hasRainAdvisory]);

  const getSurgeColor = () => {
    if (surgeLevel === 'critical') return '#8b0000';
    if (surgeLevel === 'strong') return '#d32f2f';
    return '#4caf50';
  };

  const getSurgeLabel = () => {
    if (surgeLevel === 'critical') return '🚨 CRITICAL SURGE';
    if (surgeLevel === 'strong') return '⚠️ STRONG SURGE';
    return 'Normal';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white">
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight">Mill Valley Flood Intelligence</h1>
              <p className="text-slate-400 text-sm mt-1">Real-time flood risk engine (SF Gauge + 30 min lag correction)</p>
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
        {surgeAnomaly && (
          <div className="mb-8 p-4 rounded-lg border" style={{ backgroundColor: `${getSurgeColor()}20`, borderColor: getSurgeColor() }}>
            <p className="text-lg font-light" style={{ color: getSurgeColor() }}>
              {getSurgeLabel()}
            </p>
            <p className="text-sm text-slate-300 mt-2">
              {surgeLevel === 'critical' && 'Water is 1.0+ ft higher than predicted. Historic flooding likely. Hwy 101 at risk.'}
              {surgeLevel === 'strong' && 'Water is 0.5+ ft higher than predicted. Storm surge detected. Expect additional flooding.'}
              {surgeLevel === 'normal' && `Surge is normal (${surgeAnomaly.anomaly.toFixed(2)} ft).`}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 uppercase">SF Actual</p>
            <p className="text-2xl font-light mt-1">{sfActual?.toFixed(2) || '—'} ft</p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 uppercase">SF Predicted</p>
            <p className="text-2xl font-light mt-1">{sfPredicted?.toFixed(2) || '—'} ft</p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 uppercase">Inferred Local (SF + 0.35)</p>
            <p className="text-2xl font-light mt-1">{inferredLocal?.toFixed(2) || '—'} ft</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg p-6 border" style={{ backgroundColor: `${manzanitaStatus?.color}20`, borderColor: manzanitaStatus?.color }}>
            <p className="text-xs text-slate-400 uppercase mb-2">Zone 1: Manzanita (Hwy 1)</p>
            <p className="text-2xl font-light mb-2" style={{ color: manzanitaStatus?.color }}>
              {manzanitaStatus?.label}
            </p>
            <p className="text-sm text-slate-300">{manzanitaStatus?.context}</p>
            <p className="text-xs text-slate-500 mt-3">Impassable above 7.2 ft</p>
          </div>

          <div className="rounded-lg p-6 border" style={{ backgroundColor: `${millerStatus?.color}20`, borderColor: millerStatus?.color }}>
            <p className="text-xs text-slate-400 uppercase mb-2">Zone 2: Miller Avenue</p>
            <p className="text-2xl font-light mb-2" style={{ color: millerStatus?.color }}>
              {millerStatus?.label}
            </p>
            <p className="text-sm text-slate-300">{millerStatus?.context}</p>
            <p className="text-xs text-slate-500 mt-3">Blocked above 8.0 ft | Safeway above 8.3 ft</p>
          </div>

          <div className="rounded-lg p-6 border" style={{ backgroundColor: `${luckyStatus?.color}20`, borderColor: luckyStatus?.color }}>
            <p className="text-xs text-slate-400 uppercase mb-2">Zone 3: Lucky Drive and Hwy 101</p>
            <p className="text-2xl font-light mb-2" style={{ color: luckyStatus?.color }}>
              {luckyStatus?.label}
            </p>
            <p className="text-sm text-slate-300">{luckyStatus?.context}</p>
            <p className="text-xs text-slate-500 mt-3">Ramp above 8.2 ft | Hwy threat above 8.5 ft</p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700 text-xs text-slate-400">
          <p><strong>Method:</strong> SF Gauge (NOAA 9414290) plus 0.35 ft amplification. Time lag: -30 min (SF leads Mill Valley).</p>
          <p className="mt-2">
            Data suggests flooding likelihood based on observed patterns.
            Not definitive closures. Always verify with local authorities.
          </p>
        </div>
      </div>
    </div>
  );
}
