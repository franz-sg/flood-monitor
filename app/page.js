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
    if (riseRate > 0.15) return { text: 'Rising rapidly', color: '#d32f2f', concern: 'Very concerning. Flooding could occur faster than expected.' };
    if (riseRate > 0.05) return { text: 'Rising moderately', color: '#f57c00', concern: 'Monitor closely. Plan for potential zone closures.' };
    if (riseRate > 0) return { text: 'Rising slowly', color: '#f59e0b', concern: 'Normal tidal progression. Follow standard forecasts.' };
    if (riseRate < -0.05) return { text: 'Falling', color: '#56768C', concern: 'Water receding. Conditions improving.' };
    return { text: 'Stable', color: '#56768C', concern: 'No significant change in water level.' };
  };

  return (
    <div style={{ fontFamily: '"Source Sans 3", -apple-system, BlinkMacSystemFont, Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <header style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 1.5rem', borderRadius: '8px 8px 0 0', background: 'linear-gradient(90deg, #56768C 0%, #EFB993 100%)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center', color: 'white' }}>
        <h1 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: '1.75rem', lineHeight: '1.2', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>🔮 Mill Valley Flood Crystal Ball</h1>
        <p style={{ fontSize: '0.875rem', margin: '0 0 1rem 0', opacity: 0.95 }}>Predictive Model (Not a Live Camera) • Updated {lastUpdated.toLocaleTimeString()}</p>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', borderRadius: '0 0 8px 8px', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'rgba(86, 118, 140, 0.05)', border: '1px solid rgba(86, 118, 140, 0.2)', borderRadius: '6px', marginBottom: '2rem' }}>
          <p style={{ margin: '0', color: '#333', fontSize: '0.95rem' }}><strong>What This Is:</strong> A predictive model projecting future water conditions based on SF Bay tide data. Not a live camera. Use for planning only.</p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: '1.5rem', lineHeight: '1.3', marginBottom: '1.5rem', color: '#2c3e50' }}>⏱️ Horizon 1: The Imminent</h2>
          <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderTop: '3px solid #56768C', borderRadius: '8px' }}>
            {sfActual && (
              <>
                <p style={{ color: '#333', marginBottom: '1rem' }}>SF Gauge currently reads <strong style={{ fontSize: '1.5rem' }}>{sfActual.toFixed(2)} ft</strong></p>
                <p style={{ color: '#495057', marginBottom: '1rem', fontSize: '0.95rem' }}><strong>Expected in Mill Valley:</strong> Around <strong>{new Date(new Date().getTime() + 30 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong>, water should reach <strong style={{ fontSize: '1.25rem' }}>{smartLocalTide?.toFixed(2)} ft</strong>.</p>
                <div style={{ paddingTop: '1rem', borderTop: '1px solid #e2e8f0', marginTop: '1rem' }}>
                  <p style={{ color: '#495057', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>How Fast Is It Rising?</p>
                  {riseRate !== null && getRiseRateContext() && (
                    <>
                      <p style={{ color: '#333', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Past hour: <span style={{ color: getRiseRateContext().color, fontWeight: 'bold' }}>{getRiseRateContext().text} ({riseRate > 0 ? '+' : ''}{riseRate.toFixed(3)} ft/hour)</span></p>
                      <p style={{ color: '#495057', marginBottom: '0.5rem', fontSize: '0.95rem' }}>{getRiseRateContext().concern}</p>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: '1.5rem', lineHeight: '1.3', marginBottom: '1rem', color: '#2c3e50' }}>📊 Horizon 2: The Commute</h2>
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
                <div style={{ fontSize: '0.8rem', color: '#718096', lineHeight: '1.6' }}>
                  <p style={{ margin: '0.3rem 0' }}><strong>Current:</strong> {smartLocalTide?.toFixed(2)} ft</p>
                  <p style={{ margin: '0.3rem 0' }}><strong>Closure:</strong> {zone.closure}</p>
                  {zone.time && <p style={{ margin: '0.3rem 0', color: '#d32f2f' }}><strong>Expected:</strong> {zone.time}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: '1.5rem', lineHeight: '1.3', marginBottom: '1.5rem', color: '#2c3e50' }}>🔮 Horizon 3: The Outlook</h2>
          <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderTop: '3px solid #EFB993', borderRadius: '8px' }}>
            {nextHighTide && (
              <>
                <p style={{ color: '#333', fontSize: '1.25rem', marginBottom: '1.5rem' }}><strong>{nextHighTide.time}</strong> on <strong>{nextHighTide.date}</strong></p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                    <p style={{ color: '#718096', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>SF Peak</p>
                    <p style={{ color: '#333', fontSize: '1.5rem', fontWeight: 'bold', margin: '0' }}>{nextHighTide.sfLevel.toFixed(2)} ft</p>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                    <p style={{ color: '#718096', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Mill Valley Peak</p>
                    <p style={{ color: '#333', fontSize: '1.5rem', fontWeight: 'bold', margin: '0' }}>{nextHighTide.localLevel.toFixed(2)} ft</p>
                  </div>
                </div>
                <div style={{ paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#495057', fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 'bold' }}>Zone Status at Peak:</p>
                  <ul style={{ margin: '0', paddingLeft: '1.5rem', color: '#333', fontSize: '0.95rem', lineHeight: '1.8' }}>
                    {nextHighTide.localLevel > 7.2 && <li><strong>Manzanita:</strong> LIKELY IMPASSABLE</li>}
                    {nextHighTide.localLevel > 8.0 && <li><strong>Miller Avenue:</strong> At Risk</li>}
                    {nextHighTide.localLevel > 8.3 && <li><strong>Safeway:</strong> HIGH RISK</li>}
                    {nextHighTide.localLevel > 8.2 && <li><strong>Lucky Drive:</strong> RAMP CLOSED</li>}
                    {nextHighTide.localLevel <= 7.2 && <li>No major closures expected</li>}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: '#f5f5f5', border: '1px solid #e2e8f0', borderLeft: '4px solid #d32f2f', borderRadius: '6px' }}>
          <h3 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: '1.1rem', color: '#d32f2f', marginBottom: '1rem', fontWeight: 'bold' }}>⚠️ Critical Limitations</h3>
          <ul style={{ margin: '0', paddingLeft: '1.5rem', color: '#495057', fontSize: '0.9rem', lineHeight: '1.8' }}>
            <li><strong>Cannot Predict:</strong> Pump failures, clogged drains, or flash floods.</li>
            <li><strong>Wind Factor:</strong> South winds can add 0.5-1.0 ft above predictions.</li>
            <li><strong>Trust Authorities:</strong> Police barricades always override this app.</li>
            <li><strong>Not Real-Time:</strong> Always look before you go.</li>
          </ul>
        </div>
      </div>

      <footer style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem', textAlign: 'center', color: '#718096', fontSize: '0.875rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '0', left: '0', right: '0', height: '3px', background: 'linear-gradient(90deg, #56768C 0%, #EFB993 100%)' }}></div>
        <p style={{ marginTop: '1.5rem', margin: '0' }}>Mill Valley Flood Crystal Ball • Predictive planning tool powered by NOAA Bay data</p>
      </footer>
    </div>
  );
}
