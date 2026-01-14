'use client';

import React, { useState, useEffect } from 'react';
import { Info, CheckCircle, Settings, ArrowRight, Clock } from 'lucide-react';

export default function Home() {
  const [sfActual, setSfActual] = useState(null);
  const [riseRate, setRiseRate] = useState(null);
  const [nextHighTide, setNextHighTide] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const CALIBRATION = {
    lagMinutes: 30,
    amplification: 0.4,
    threshold: 7.2
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
            const next = highs.find(p => new Date(p.t) > now);
            if (next) {
              setNextHighTide({
                time: new Date(next.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                val: parseFloat(next.v)
              });
            }
          }
        }
      } catch (err) { console.error(err); }
    };
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const localEst = sfActual ? sfActual + CALIBRATION.amplification : null;
  const headroom = localEst ? CALIBRATION.threshold - localEst : null;
  const isDanger = localEst > 6.8;
  const arrivalTime = new Date(lastUpdated.getTime() + CALIBRATION.lagMinutes * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      <header style={{ backgroundColor: '#1e293b', color: 'white', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', fontFamily: 'Georgia, serif', margin: '0 0 0.5rem 0' }}>Mill Valley Flood Watch</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Settings size={12} /> Calibrated Model Active</span>
              <span style={{ backgroundColor: '#0f172a', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', color: '#cbd5e1' }}>Lag: +{CALIBRATION.lagMinutes}m</span>
              <span style={{ backgroundColor: '#0f172a', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', color: '#cbd5e1' }}>Amp: +{CALIBRATION.amplification}ft</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0' }}>{localEst ? localEst.toFixed(2) : '--'} ft</p>
             <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', margin: '0' }}>Est. Local Depth</p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem' }}>
        
        <div style={{
          borderRadius: '0.5rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          border: `1px solid ${isDanger ? '#fecaca' : '#e2e8f0'}`,
          padding: '1.5rem',
          marginBottom: '1.5rem',
          backgroundColor: isDanger ? '#fef2f2' : 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontWeight: 'bold', fontSize: '1.25rem', color: isDanger ? '#991b1b' : '#166534', margin: '0 0 0.5rem 0' }}>
                {isDanger ? '⚠️ Flood Risk Active' : '🟢 Conditions Normal'}
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0' }}>
                {isDanger 
                  ? "Tides are approaching the 7.2 ft flood threshold." 
                  : "Water levels are comfortably below flood stage."}
              </p>
            </div>
            {!isDanger && <CheckCircle size={48} style={{ color: '#22c55e', opacity: 0.2 }} />}
          </div>

          <div style={{ backgroundColor: '#f1f5f9', borderRadius: '0.5rem', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              <span>Current Depth</span>
              <span style={{ fontWeight: '600', color: '#475569' }}>Flood Threshold (7.2 ft)</span>
            </div>
            
            <div style={{ width: '100%', height: '16px', backgroundColor: '#cbd5e1', borderRadius: '9999px', overflow: 'hidden', position: 'relative', marginBottom: '0.5rem' }}>
              <div 
                style={{
                  height: '100%',
                  transition: 'all 1s ease',
                  backgroundColor: isDanger ? '#ef4444' : '#22c55e',
                  width: `${Math.min((localEst / 8.0) * 100, 100)}%`
                }}
              ></div>
              <div style={{ position: 'absolute', right: '10%', top: '0', bottom: '0', width: '2px', backgroundColor: '#f87171' }}></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
               <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.5' }}>
                  Data Source: NOAA SF ({sfActual?.toFixed(2)}ft) <br/>
                  <span style={{ color: '#475569', fontWeight: '500' }}>Applied Offset: +{CALIBRATION.amplification} ft</span>
               </div>
               <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#1e293b', margin: '0' }}>{headroom?.toFixed(1)} ft Headroom</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0' }}>Before spillover</p>
               </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
             <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem 0' }}>
                <Clock size={16} /> Tidal Timing
             </h3>
             <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem', margin: '0 0 0.75rem 0' }}>
                SF Gauge currently reads <strong>{sfActual?.toFixed(2)} ft</strong>.
             </p>
             <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowRight size={16} />
                <span>
                   Applying <strong>30m lag</strong>: Water arrives at Tam Junction at <strong>{arrivalTime}</strong>.
                </span>
             </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
             <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.75rem', margin: '0 0 0.75rem 0' }}>Next Peak Forecast</h3>
             {nextHighTide ? (
                <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: '300', color: '#0f172a' }}>{nextHighTide.time}</span>
                      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Today</span>
                   </div>
                   <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>
                      Projected Mill Valley Peak: <strong>{(nextHighTide.val + CALIBRATION.amplification).toFixed(2)} ft</strong>
                   </p>
                   <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0' }}>
                      (SF Peak: {nextHighTide.val.toFixed(2)} ft)
                   </p>
                </div>
             ) : <span style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>Loading forecast...</span>}
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', lineHeight: '1.6' }}>
          <p style={{ fontWeight: '600', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>Methodology & Calibration:</p>
          <p style={{ margin: '0' }}>
            This tool applies local calibration based on field observations: 
            <strong> +{CALIBRATION.amplification} ft amplification</strong> (creek geography) and 
            <strong> +{CALIBRATION.lagMinutes} min lag</strong> (Golden Gate to Tam travel time). 
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>

      </main>
    </div>
  );
}
