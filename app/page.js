'use client';

import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Info, AlertTriangle } from 'lucide-react';

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
    return { label: 'LOW TIDAL RISK', color: '#56768C', context: 'Below risk threshold.' };
  };

  const getMillerStatus = (level) => {
    if (level > ZONE_THRESHOLDS.miller.safeway) {
      return { label: 'HIGH RISK', color: '#d32f2f', context: 'Water entering Safeway lots. Both Tam High and Town Center at risk.' };
    }
    if (level > ZONE_THRESHOLDS.miller.tam) {
      return { label: 'PARTIAL BLOCK', color: '#f57c00', context: 'Tam High blocked. Safeway accessible from Downtown only.' };
    }
    return { label: 'LOW TIDAL RISK', color: '#56768C', context: 'Below risk threshold.' };
  };

  const getLuckyStatus = (level) => {
    if (level > ZONE_THRESHOLDS.lucky.ramp) {
      return { label: 'RAMP CLOSED', color: '#d32f2f', context: 'Pump Dependent: If pumps fail, flooding occurs regardless of tide.' };
    }
    return { label: 'LOW TIDAL RISK', color: '#56768C', context: 'Below risk threshold.' };
  };

  const calculateClosureTimes = (predictions, surge) => {
    const times = { manzanita: null, tamHigh: null, safeway: null, lucky: null };
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
            setRiseRate(newest - oldest);
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
    if (riseRate > 0.15) return { text: 'Rising rapidly', color: '#d32f2f', concern: 'Very concerning. Flooding likely sooner than expected.' };
    if (riseRate > 0.05) return { text: 'Rising moderately', color: '#f57c00', concern: 'Monitor closely.' };
    if (riseRate > 0) return { text: 'Rising slowly', color: '#f59e0b', concern: 'Normal tidal progression.' };
    if (riseRate < -0.05) return { text: 'Falling', color: '#56768C', concern: 'Water receding.' };
    return { text: 'Stable', color: '#56768C', concern: 'No significant change.' };
  };

  return (
    <div style={{ fontFamily: '"Source Sans 3", -apple-system, BlinkMacSystemFont, Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <header style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 1.5rem', borderRadius: '8px 8px 0 0', background: 'linear-gradient(90deg, #56768C 0%, #EFB993 100%)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center', color: 'white' }}>
        <h1 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: '1.75rem', lineHeight: '1.2', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>🔮 Mill Valley Flood Crystal Ball</h1>
        <p style={{ fontSize: '0.875rem', margin: '0 0 1rem 0', opacity: 0.95 }}>Predictive Model (Not a Live Camera) • Updated {lastUpdated.toLocaleTimeString()}</p>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', borderRadius: '0 0 8px 8px', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
        
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderLeft: '4px solid #56768C', borderRadius: '4px', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#2c3e50', margin: '0 0 0.5rem 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} /> Forecast Narrative
          </h2>
          <p style={{ color: '#334155', lineHeight: '1.6', margin: '0', fontSize: '0.95rem' }}>
            {sfActual ? (
              <>
                Current data from San Francisco indicates the tide is <strong>{riseRate > 0 ? 'rising' : 'falling'}</strong>. 
                Because water takes ~30 minutes to travel from the Golden Gate to Tam Junction, we can confirm that 
                water levels in Mill Valley will reach <strong>{smartLocalTide?.toFixed(2)} ft</strong> shortly. 
                {closureTimes.manzanita ? (
                  <span> <strong>Manzanita (Hwy 1)</strong> is projected to be impassable around <strong>{closureTimes.manzanita}</strong> today.</span>
                ) : (
                  <span> No major road closures are projected for the next 6 hours.</span>
                )}
              </>
            ) : 'Loading forecast data...'}
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: '1.5rem', lineHeight: '1.3', marginBottom: '1.5rem', color: '#2c3e50' }}>⏱️ Horizon 1: The Look-Ahead</h2>
          <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderTop: '3px solid #56768C', borderRadius: '8px' }}>
            {sfActual && (
              <>
                <p style={{ color: '#495057', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Reality (San Francisco)</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '2.5rem', color: '#2c3e50' }}>{sfActual.toFixed(2)} ft</strong>
                  <span style={{ color: getRiseRateContext()?.color, fontWeight: 'bold' }}>{getRiseRateContext()?.text}</span>
                </div>
                
                <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
                  <p style={{ color: '#1e40af', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>The Crystal Ball Effect:</p>
                  <p style={{ color: '#334155', fontSize: '0.95rem', margin: '0', lineHeight: '1.5' }}>
                    Because of the 30-minute tidal lag, this water is currently en route to Richardson Bay. 
                    It <strong>will</strong> arrive at Tam Junction at approximately <strong>{new Date(new Date().getTime() + 30 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong>.
                  </p>
                </div>
                
                <p style={{ color: '#495057', fontSize: '0.95rem' }}>
                  <strong>Predicted Mill Valley Depth:</strong> <strong style={{ fontSize: '1.25rem' }}>{smartLocalTide?.toFixed(2)} ft</strong>
                </p>
              </>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: '1.5rem', lineHeight: '1.3', marginBottom: '1rem', color: '#2c3e50' }}>📊 Horizon 2: The Commute (Next 6 Hours)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              { title: 'Zone 1: Manzanita (Hwy 1)', status: manzanitaStatus, closure: '7.2 ft', time: closureTimes.manzanita },
              { title: 'Zone 2: Miller Avenue', status: millerStatus, closure: '8.0-8.3 ft', time: closureTimes.tamHigh },
              { title: 'Zone 3: Lucky Drive & Hwy 101', status: luckyStatus, closure: '8.2 ft', time: closureTimes.lucky }
            ].map((zone, idx) => (
              <div key={idx} style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderTop: `3px solid ${zone.status?.color}`, borderRadius: '8px' }}>
                <p style={{ color: '#718096', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{zone.title}</p>
                <p style={{ color: zone.status?.color, fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{zone.status?.label}</p>
                <p style={{ color: '#495057', fontSize: '0.875rem', marginBottom: '1rem' }}>{zone.status?.context}</p>
                <div style={{ fontSize: '0.8rem', color: '#718096', lineHeight: '1.6', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ margin: '0.3rem 0' }}><strong>Current Level:</strong> {smartLocalTide?.toFixed(2)} ft</p>
                  {zone.time ? (
                     <p style={{ margin: '0.3rem 0', color: '#d32f2f', fontWeight: 'bold' }}>⚠️ Expected Closure: {zone.time}</p>
                  ) : (
                     <p style={{ margin: '0.3rem 0' }}>No closure predicted today</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: '1.5rem', lineHeight: '1.3', marginBottom: '1.5rem', color: '#2c3e50' }}>🔮 Horizon 3: Tomorrow's Outlook</h2>
          <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderTop: '3px solid #EFB993', borderRadius: '8px' }}>
            {nextHighTide && (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 'bold' }}>Next Major Peak</p>
                  <p style={{ color: '#333', fontSize: '1.5rem', marginBottom: '0.5rem' }}><strong>{nextHighTide.time}</strong> on <strong>{nextHighTide.date}</strong></p>
                  <p style={{ color: '#475569', fontSize: '1rem' }}>
                    Projected to hit <strong>{nextHighTide.localLevel.toFixed(2)} ft</strong> in Mill Valley.
                  </p>
                </div>

                <div style={{ padding: '1rem', backgroundColor: '#fff7ed', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <p style={{ color: '#9a3412', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Impact Forecast:</p>
                  <ul style={{ margin: '0', paddingLeft: '1.5rem', color: '#333', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    {nextHighTide.localLevel > 7.2 ? (
                      <li>⛔ <strong>Manzanita (Hwy 1)</strong> will likely be <strong>CLOSED</strong>. Plan an alternate route.</li>
                    ) : (
                      <li>✅ <strong>Manzanita</strong> should remain <strong>OPEN</strong>.</li>
                    )}
                    {nextHighTide.localLevel > 8.0 && <li>⚠️ <strong>Miller Avenue</strong> (Tam High) will likely be blocked.</li>}
                    {nextHighTide.localLevel > 8.3 && <li>⚠️ <strong>Safeway</strong> parking lot at risk.</li>}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '0.85rem', color: '#64748b' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>⚠️ Official Limitations & Disclaimers</p>
          <ul style={{ paddingLeft: '1rem', margin: '0', lineHeight: '1.6' }}>
            <li>This tool relies on a <strong>30-minute lag</strong> from SF data to predict local conditions.</li>
            <li><strong>Wind Factor:</strong> Strong South Winds can add +0.5-1.0 ft to these predictions.</li>
            <li><strong>Real-World Conditions:</strong> We cannot detect pump failures, clogged drains, or police closures.</li>
            <li>Always obey official road signs and barricades.</li>
          </ul>
        </div>

      </div>

      <footer style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem', textAlign: 'center', color: '#718096', fontSize: '0.875rem', position: 'relative' }}>
        <p style={{ margin: '0' }}>Mill Valley Flood Crystal Ball • Powered by NOAA Data & Local Physics</p>
      </footer>
    </div>
  );
}
