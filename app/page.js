'use client';

import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [sfActual, setSfActual] = useState(null);
  const [sfPredicted, setSfPredicted] = useState(null);
  const [surgeAnomaly, setSurgeAnomaly] = useState(null);
  const [inferredLocal, setInferredLocal] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [manzanitaForecast, setManzanitaForecast] = useState(null);
  const [millerForecast, setMillerForecast] = useState(null);
  const [luckyForecast, setLuckyForecast] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [riseRate, setRiseRate] = useState(null);
  const [nextHighTide, setNextHighTide] = useState(null);

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
        const actualResponse = await fetch(
          `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=water_level&date=latest&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=millvalleybriefing`
        );
        const actualData = await actualResponse.json();
        
        if (actualData.data && actualData.data.length > 0) {
          const latest = actualData.data[actualData.data.length - 1];
          const actual = parseFloat(latest.v);
          
          // Get hourly data for the past hour
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 3600000);
          const tomorrow = new Date(now.getTime() + 24 * 3600000);
          
          const hourlyResponse = await fetch(
            `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=water_level&begin_date=${oneHourAgo.getFullYear()}${String(oneHourAgo.getMonth() + 1).padStart(2, '0')}${String(oneHourAgo.getDate()).padStart(2, '0')} ${String(oneHourAgo.getHours()).padStart(2, '0')}${String(oneHourAgo.getMinutes()).padStart(2, '0')}&end_date=${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=millvalleybriefing`
          );
          const hourlyDataResponse = await hourlyResponse.json();
          
          if (hourlyDataResponse.data) {
            setHourlyData(hourlyDataResponse.data.map((d, idx) => ({
              time: new Date(d.t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              level: parseFloat(d.v),
              idx
            })));
            
            // Calculate rise rate
            if (hourlyDataResponse.data.length > 1) {
              const oldest = parseFloat(hourlyDataResponse.data[0].v);
              const newest = parseFloat(hourlyDataResponse.data[hourlyDataResponse.data.length - 1].v);
              const risePerHour = newest - oldest;
              setRiseRate(risePerHour);
            }
          }
          
          // Get predictions to find next high tide
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
            
            // Find next high tide
            const highs = predData.predictions.filter(p => p.type === 'H').sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
            if (highs.length > 0) {
              const nextHigh = highs[0];
              setNextHighTide({
                sfLevel: parseFloat(nextHigh.v),
                localLevel: parseFloat(nextHigh.v) + 0.35,
                time: new Date(nextHigh.t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                date: new Date(nextHigh.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              });
            }
          }
          
          const local = inferLocalTide(actual);
          const surge = assessSurge(actual, predicted);
          
          setSfActual(actual);
          setSfPredicted(predicted);
          setInferredLocal(local);
          setSurgeAnomaly(surge);
          
          setManzanitaForecast(getManzanitaForecast(local));
          setMillerForecast(getMillerForecast(local));
          setLuckyForecast(getLuckyForecast(local));
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
    if (!riseRate) return null;
    if (riseRate > 0.1) return { text: 'Rising quickly', color: '#f57c00' };
    if (riseRate > 0) return { text: 'Rising slowly', color: '#4caf50' };
    if (riseRate < -0.1) return { text: 'Falling quickly', color: '#4caf50' };
    return { text: 'Relatively stable', color: '#4caf50' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white">
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight">🔮 Mill Valley Flood Crystal Ball</h1>
              <p className="text-slate-400 text-sm mt-1">Predictive flood forecasting model (Not a live camera)</p>
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
            It is not a live camera of current conditions. Use this for planning, not for real-time decisions.
          </p>
        </div>

        {/* Horizon 1: Imminent */}
        <div className="mb-8">
          <h2 className="text-xl font-light mb-4">⏱️ Horizon 1: The Imminent (Next 30-60 Minutes)</h2>
          <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
            <p className="text-sm text-slate-400 mb-4">
              <strong>What is hitting us right now?</strong>
            </p>
            {sfActual && (
              <>
                <p className="text-lg text-slate-300 mb-4">
                  SF Gauge currently reads <strong className="text-2xl">{sfActual.toFixed(2)} ft</strong>
                </p>
                
                <p className="text-sm text-slate-400 mb-3">
                  <strong>Why this matters:</strong> The SF level is a <strong>predictor of Mill Valley's future</strong>. Due to the 30-minute lag and geography, 
                  this SF reading will amplify by 0.35 ft by the time it reaches Mill Valley.
                </p>
                
                <p className="text-sm text-slate-300 mb-4">
                  <strong>Expected in Mill Valley:</strong> In approximately <strong>30 minutes</strong> (around <strong>{new Date(new Date().getTime() + 30 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong>), 
                  Mill Valley water levels should be approximately <strong className="text-xl">{inferredLocal?.toFixed(2)} ft</strong>.
                </p>

                {/* Past hour trend */}
                <div className="mt-6 pt-4 border-t border-slate-600">
                  <p className="text-sm text-slate-400 mb-3"><strong>How Fast Is It Rising?</strong></p>
                  {hourlyData.length > 0 && (
                    <>
                      <p className="text-sm text-slate-300 mb-2">
                        Past hour trend: <span style={{ color: getRiseRateContext()?.color }} className="font-semibold">
                          {getRiseRateContext()?.text}
                        </span> ({riseRate?.toFixed(2)} ft/hour)
                      </p>
                      {surgeAnomaly && (
                        <p className="text-sm text-slate-300">
                          {surgeAnomaly > 0.3
                            ? `⚠️ Water is running ${surgeAnomaly.toFixed(2)} ft higher than predicted tide tables. This is concerning for Mill Valley. Expect flooding sooner than typical.`
                            : `Normal conditions: Water is tracking with predictions. Standard flooding timeline expected.`}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Horizon 2: Commute */}
        <div className="mb-8">
          <h2 className="text-xl font-light mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Horizon 2: The Commute (Next 2-6 Hours)
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            <strong>Zone Thresholds Explained:</strong> These are water levels at which each area becomes impassable due to tidal flooding. Times shown are approximate based on current tidal predictions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg p-6 border" style={{ backgroundColor: `${manzanitaForecast?.color}20`, borderColor: manzanitaForecast?.color }}>
              <p className="text-xs text-slate-400 uppercase mb-2">Zone 1: Manzanita (Hwy 1)</p>
              <p className="text-2xl font-light mb-2" style={{ color: manzanitaForecast?.color }}>
                {manzanitaForecast?.label}
              </p>
              <p className="text-sm text-slate-300 mb-3">{manzanitaForecast?.context}</p>
              <div className="text-xs text-slate-500 space-y-1">
                <p><strong>Caution Level:</strong> 6.8 ft</p>
                <p><strong>Closure Threshold:</strong> 7.2 ft</p>
                <p><strong>Current Level:</strong> {inferredLocal?.toFixed(2)} ft</p>
              </div>
            </div>

            <div className="rounded-lg p-6 border" style={{ backgroundColor: `${millerForecast?.color}20`, borderColor: millerForecast?.color }}>
              <p className="text-xs text-slate-400 uppercase mb-2">Zone 2: Miller Avenue</p>
              <p className="text-2xl font-light mb-2" style={{ color: millerForecast?.color }}>
                {millerForecast?.label}
              </p>
              <p className="text-sm text-slate-300 mb-3">{millerForecast?.context}</p>
              <div className="text-xs text-slate-500 space-y-1">
                <p><strong>Tam High Closes:</strong> 8.0 ft</p>
                <p><strong>Safeway Area Closes:</strong> 8.3 ft</p>
                <p><strong>Current Level:</strong> {inferredLocal?.toFixed(2)} ft</p>
              </div>
            </div>

            <div className="rounded-lg p-6 border" style={{ backgroundColor: `${luckyForecast?.color}20`, borderColor: luckyForecast?.color }}>
              <p className="text-xs text-slate-400 uppercase mb-2">Zone 3: Lucky Drive and Hwy 101</p>
              <p className="text-2xl font-light mb-2" style={{ color: luckyForecast?.color }}>
                {luckyForecast?.label}
              </p>
              <p className="text-sm text-slate-300 mb-3">{luckyForecast?.context}</p>
              <div className="text-xs text-slate-500 space-y-1">
                <p><strong>Ramp Closes:</strong> 8.2 ft</p>
                <p><strong>Hwy 101 Threatened:</strong> 8.5 ft</p>
                <p><strong>Current Level:</strong> {inferredLocal?.toFixed(2)} ft</p>
              </div>
            </div>
          </div>
        </div>

        {/* Horizon 3: Outlook */}
        <div className="mb-8">
          <h2 className="text-xl font-light mb-4">🔮 Horizon 3: The Outlook (Next 12-24 Hours)</h2>
          <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
            <p className="text-sm text-slate-400 mb-4">
              <strong>Planning for tonight and tomorrow:</strong> Use this for decisions like moving your car or avoiding commutes.
            </p>
            {nextHighTide && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-400">Next High Tide Expected:</p>
                  <p className="text-lg text-slate-300 mt-1">
                    <strong className="text-2xl">{nextHighTide.time}</strong> on <strong>{nextHighTide.date}</strong>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-700/30 rounded p-3">
                    <p className="text-xs text-slate-400">SF Level Expected</p>
                    <p className="text-xl font-light mt-1">{nextHighTide.sfLevel.toFixed(2)} ft</p>
                  </div>
                  <div className="bg-slate-700/30 rounded p-3">
                    <p className="text-xs text-slate-400">Mill Valley Level Expected</p>
                    <p className="text-xl font-light mt-1">{nextHighTide.localLevel.toFixed(2)} ft</p>
                  </div>
                </div>
              </div>
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
