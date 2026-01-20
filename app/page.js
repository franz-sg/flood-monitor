'use client';

import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Info, Settings, CheckCircle } from 'lucide-react';

export default function Home() {
  const [sfActual, setSfActual] = useState(null);
  const [riseRate, setRiseRate] = useState(null);
  const [nextHighTide, setNextHighTide] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [closureTimes, setClosureTimes] = useState({});

  const CALIBRATION = {
    lagMinutes: 30,
    amplification: 0.4,
    manzanita: 7.2,
    millerTam: 8.0,
    millerSafeway: 8.3,
    lucky: 8.2
  };

  const getZoneStatus = (localLevel, threshold) => {
    if (localLevel >= threshold) return { label: 'IMPASSABLE', color: '#d32f2f', bg: '#fef2f2', border: '#fecaca' };
    if (localLevel >= threshold - 0.4) return { label: 'AT RISK', color: '#f57c00', bg: '#fffbf0', border: '#fed7aa' };
    return { label: 'PASSABLE', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
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
          setSfActual(actual);
          setLastUpdated(new Date(latest.t));

          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 3600000);
          const trendResponse = await fetch(
            `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=water_level&begin_date=${oneHourAgo.getFullYear()}${String(oneHourAgo.getMonth() + 1).padStart(2, '0')}${String(oneHourAgo.getDate()).padStart(2, '0')} ${String(oneHourAgo.getHours()).padStart(2, '0')}${String(oneHourAgo.getMinutes()).padStart(2, '0')}&end_date=${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=millvalleybriefing`
          );
          const trendData = await trendResponse.json();
          if (trendData.data && trendData.data.length > 1) {
            const first = parseFloat(trendData.data[0].v);
            const last = parseFloat(trendData.data[trendData.data.length - 1].v);
            setRiseRate(last - first);
          }

          const tomorrow = new Date(now.getTime() + 24 * 3600000);
          const predResponse = await fetch(
            `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=predictions&begin_date=${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}&end_date=${tomorrow.getFullYear()}${String(tomorrow.getMonth() + 1).padStart(2, '0')}${String(tomorrow.getDate()).padStart(2, '0')} ${String(tomorrow.getHours()).padStart(2, '0')}${String(tomorrow.getMinutes()).padStart(2, '0')}&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json&application=millvalleybriefing`
          );
          const predData = await predResponse.json();
          if (predData.predictions) {
            const highs = predData.predictions.filter(p => p.type === 'H');
            
            // Find the next high tide AFTER now
            const nextHigh = highs.find(p => {
              const predTime = new Date(p.t);
              return predTime > now;
            });
            
            if (nextHigh) {
              setNextHighTide({
                time: new Date(nextHigh.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                val: parseFloat(nextHigh.v)
              });
            }

            const times = { manzanita: null, tam: null, safeway: null, lucky: null };
            predData.predictions.forEach(p => {
              const localLevel = parseFloat(p.v) + CALIBRATION.amplification;
              const timeStr = new Date(p.t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              if (localLevel >= CALIBRATION.manzanita && !times.manzanita) times.manzanita = timeStr;
              if (localLevel >= CALIBRATION.millerTam && !times.tam) times.tam = timeStr;
              if (localLevel >= CALIBRATION.millerSafeway && !times.safeway) times.safeway = timeStr;
              if (localLevel >= CALIBRATION.lucky && !times.lucky) times.lucky = timeStr;
            });
            setClosureTimes(times);
          }
        }
      } catch (err) { console.error(err); }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const localEst = sfActual ? sfActual + CALIBRATION.amplification : null;
  const arrivalTime = new Date(lastUpdated.getTime() + CALIBRATION.lagMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isDanger = localEst > 6.8;
  const riseRateText = riseRate === null ? 'Loading...' : riseRate > 0.05 ? '↑ Rising' : riseRate < -0.05 ? '↓ Falling' : '→ Stable';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      <header style={{ backgroundColor: '#1e293b', color: 'white', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Georgia, serif', margin: '0 0 0.5rem 0' }}>🔮 Mill Valley Flood Watch</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: '#cbd5e1', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Settings size={14} /> Calibrated Model</span>
            <span style={{ backgroundColor: '#0f172a', padding: '0.25rem 0.75rem', borderRadius: '0.25rem' }}>Lag: +{CALIBRATION.lagMinutes}m</span>
            <span style={{ backgroundColor: '#0f172a', padding: '0.25rem 0.75rem', borderRadius: '0.25rem' }}>Amp: +{CALIBRATION.amplification}ft</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span>Est. Local: {localEst ? localEst.toFixed(2) : '--'} ft</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'Georgia, serif', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⏱️ Horizon 1: The Look-Ahead
          </h2>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem 0', textTransform: 'uppercase' }}>Current Reality (San Francisco)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '3rem', fontWeight: '300', color: '#0f172a', margin: '0' }}>{sfActual ? sfActual.toFixed(2) : '--'} <span style={{ fontSize: '1.25rem', color: '#94a3b8' }}>ft</span></p>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>{riseRateText}</p>
              </div>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>30-minute tidal lag means this water will arrive at Tam Junction at:</p>
                <p style={{ fontSize: '1.75rem', fontWeight: '600', color: '#16a34a', margin: '0' }}>{arrivalTime}</p>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>Predicted Mill Valley depth: <strong>{localEst?.toFixed(2)} ft</strong></p>
              </div>
            </div>
            <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '0.375rem', fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
              <strong>How we calculate this:</strong> NOAA SF reading ({sfActual?.toFixed(2)} ft) + local amplification ({CALIBRATION.amplification} ft) = estimated Mill Valley depth ({localEst?.toFixed(2)} ft)
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'Georgia, serif', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📊 Horizon 2: The Commute (Next 6 Hours)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {(() => {
              const status = getZoneStatus(localEst, CALIBRATION.manzanita);
              return (
                <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: `2px solid ${status.border}`, backgroundColor: status.bg }}>
                  <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Zone 1: Manzanita (Hwy 1)</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: status.color, margin: '0 0 0.5rem 0' }}>{status.label}</p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem 0' }}>Threshold: {CALIBRATION.manzanita} ft</p>
                  <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.6' }}>
                    <p style={{ margin: '0.3rem 0' }}><strong>Current:</strong> {localEst?.toFixed(2)} ft</p>
                    {closureTimes.manzanita && <p style={{ margin: '0.3rem 0', color: '#d32f2f', fontWeight: 'bold' }}>⚠️ Closure: {closureTimes.manzanita}</p>}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const status = getZoneStatus(localEst, CALIBRATION.millerTam);
              return (
                <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: `2px solid ${status.border}`, backgroundColor: status.bg }}>
                  <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Zone 2: Miller Avenue</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: status.color, margin: '0 0 0.5rem 0' }}>{status.label}</p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem 0' }}>Tam High: {CALIBRATION.millerTam} ft | Safeway: {CALIBRATION.millerSafeway} ft</p>
                  <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.6' }}>
                    <p style={{ margin: '0.3rem 0' }}><strong>Current:</strong> {localEst?.toFixed(2)} ft</p>
                    {closureTimes.tam && <p style={{ margin: '0.3rem 0', color: '#d32f2f', fontWeight: 'bold' }}>⚠️ Tam High: {closureTimes.tam}</p>}
                    {closureTimes.safeway && <p style={{ margin: '0.3rem 0', color: '#d32f2f', fontWeight: 'bold' }}>⚠️ Safeway: {closureTimes.safeway}</p>}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const status = getZoneStatus(localEst, CALIBRATION.lucky);
              return (
                <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: `2px solid ${status.border}`, backgroundColor: status.bg }}>
                  <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Zone 3: Lucky Drive & Hwy 101</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: status.color, margin: '0 0 0.5rem 0' }}>{status.label}</p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem 0' }}>Threshold: {CALIBRATION.lucky} ft</p>
                  <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.6' }}>
                    <p style={{ margin: '0.3rem 0' }}><strong>Current:</strong> {localEst?.toFixed(2)} ft</p>
                    {closureTimes.lucky && <p style={{ margin: '0.3rem 0', color: '#d32f2f', fontWeight: 'bold' }}>⚠️ Closure: {closureTimes.lucky}</p>}
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'Georgia, serif', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔮 Horizon 3: Tomorrow's Outlook
          </h2>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            {nextHighTide ? (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: '#64748b', margin: '0 0 0.5rem 0' }}>Next High Tide</p>
                  <p style={{ fontSize: '2rem', fontWeight: '300', color: '#0f172a', margin: '0' }}>{nextHighTide.time}</p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>
                    SF Peak: {nextHighTide.val.toFixed(2)} ft → Mill Valley Peak: <strong>{(nextHighTide.val + CALIBRATION.amplification).toFixed(2)} ft</strong>
                  </p>
                </div>
                <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '0.375rem', borderLeft: '4px solid #16a34a' }}>
                  <p style={{ fontSize: '0.875rem', color: '#166534', fontWeight: '600', margin: '0 0 0.5rem 0' }}>Impact Forecast:</p>
                  <ul style={{ fontSize: '0.875rem', color: '#166534', margin: '0', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                    {(nextHighTide.val + CALIBRATION.amplification) >= CALIBRATION.manzanita ? (
                      <li>⛔ Manzanita (Hwy 1) will be IMPASSABLE</li>
                    ) : (
                      <li>✅ Manzanita (Hwy 1) should remain passable</li>
                    )}
                    {(nextHighTide.val + CALIBRATION.amplification) >= CALIBRATION.millerTam && (
                      <li>⚠️ Miller Avenue (Tam High) will be blocked</li>
                    )}
                    {(nextHighTide.val + CALIBRATION.amplification) >= CALIBRATION.millerSafeway && (
                      <li>⚠️ Safeway parking at risk</li>
                    )}
                  </ul>
                </div>
              </>
            ) : (
              <p style={{ color: '#94a3b8' }}>Loading forecast data...</p>
            )}
          </div>
        </section>

        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', lineHeight: '1.6' }}>
          <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>📋 Methodology & Data Sources:</p>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            <strong>NOAA San Francisco Gauge (Station 9414290):</strong> Provides real-time water level data. 
            <strong> Local Calibration:</strong> We apply +{CALIBRATION.amplification} ft (geography-based amplification) and +{CALIBRATION.lagMinutes} min (travel time from Golden Gate). 
            <strong>Zone Thresholds:</strong> Based on field observations and historical flood patterns, not official surveys.
          </p>
          <p style={{ margin: '0' }}>
            <strong>Last Updated:</strong> {lastUpdated.toLocaleString()} 
            | Data refreshes every 5 minutes
          </p>
        </div>

      </main>
    </div>
  );
}
