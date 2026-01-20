'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function Home() {
  const [sfActual, setSfActual] = useState(null);
  const [nextHighTide, setNextHighTide] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Calibration from your field research
  const CALIBRATION = {
    amplification: 0.4,
    lagMinutes: 30
  };

  // Zone thresholds
  const ZONES = {
    manzanita: { name: 'Manzanita (Hwy 1)', threshold: 7.2 },
    miller: { name: 'Miller Avenue', threshold: 8.0 },
    lucky: { name: 'Lucky Drive & Hwy 101', threshold: 8.2 }
  };

  const getStatus = (localLevel, threshold) => {
    const headroom = threshold - localLevel;
    if (localLevel >= threshold) {
      return { status: 'IMPASSABLE', color: '#d32f2f', bg: '#fef2f2', icon: '🚫', text: `CLOSED - Water at ${localLevel.toFixed(2)} ft` };
    }
    if (headroom < 0.5) {
      return { status: 'AT RISK', color: '#f57c00', bg: '#fffbf0', icon: '⚠️', text: `At Risk - ${headroom.toFixed(2)} ft until closure` };
    }
    return { status: 'PASSABLE', color: '#16a34a', bg: '#f0fdf4', icon: '✅', text: `Safe - ${headroom.toFixed(2)} ft clearance` };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Current water level
        const actualResponse = await fetch(
          `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=water_level&date=latest&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=millvalleybriefing`
        );
        const actualData = await actualResponse.json();
        
        if (actualData.data && actualData.data.length > 0) {
          const latest = actualData.data[actualData.data.length - 1];
          const actual = parseFloat(latest.v);
          setSfActual(actual);
          setLastUpdated(new Date(latest.t));

          // Predictions (next high/low tides)
          const now = new Date();
          const tomorrow = new Date(now.getTime() + 24 * 3600000);
          const predResponse = await fetch(
            `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=predictions&begin_date=${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}&end_date=${tomorrow.getFullYear()}${String(tomorrow.getMonth() + 1).padStart(2, '0')}${String(tomorrow.getDate()).padStart(2, '0')} ${String(tomorrow.getHours()).padStart(2, '0')}${String(tomorrow.getMinutes()).padStart(2, '0')}&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json&application=millvalleybriefing`
          );
          const predData = await predResponse.json();
          if (predData.predictions) {
            const highs = predData.predictions.filter(p => p.type === 'H');
            const nextHigh = highs.find(p => new Date(p.t) > now);
            if (nextHigh) {
              setNextHighTide({
                time: new Date(nextHigh.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                val: parseFloat(nextHigh.v),
                fullTime: new Date(nextHigh.t)
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
  const nextLocalEst = nextHighTide ? nextHighTide.val + CALIBRATION.amplification : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      {/* HEADER */}
      <header style={{ backgroundColor: '#1e293b', color: 'white', padding: '2rem 1rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Georgia, serif', margin: '0 0 0.5rem 0' }}>
          🌊 Mill Valley Flood Watch
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#cbd5e1', margin: '0' }}>
          Current Status & Next High Tide Impact
        </p>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {/* CURRENT CONDITIONS */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
              {/* SF Current */}
              <div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', margin: '0 0 0.5rem 0' }}>
                  San Francisco (Now)
                </p>
                <p style={{ fontSize: '2.5rem', fontWeight: '300', color: '#0f172a', margin: '0' }}>
                  {sfActual ? sfActual.toFixed(2) : '--'} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>ft</span>
                </p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>
                  Updated: {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Mill Valley Current (Calculated) */}
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '2rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', margin: '0 0 0.5rem 0' }}>
                  Mill Valley (Estimated)
                </p>
                <p style={{ fontSize: '2.5rem', fontWeight: '300', color: '#0f172a', margin: '0' }}>
                  {localEst ? localEst.toFixed(2) : '--'} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>ft</span>
                </p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>
                  (SF + {CALIBRATION.amplification} ft)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* THREE ZONES - CURRENT */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 1rem 0' }}>
            Current Status (Right Now)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {Object.entries(ZONES).map(([key, zone]) => {
              const status = getStatus(localEst, zone.threshold);
              return (
                <div key={key} style={{
                  backgroundColor: status.bg,
                  border: `2px solid ${status.color}`,
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{status.icon}</span>
                    <p style={{ fontSize: '1.1rem', fontWeight: '600', color: status.color, margin: '0' }}>
                      {status.status}
                    </p>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: '#0f172a', margin: '0 0 1rem 0', fontWeight: '500' }}>
                    {zone.name}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0', lineHeight: '1.5' }}>
                    {status.text}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.75rem 0 0 0' }}>
                    Threshold: {zone.threshold} ft
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* NEXT HIGH TIDE SECTION */}
        {nextHighTide && (
          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 1rem 0' }}>
              Next High Tide: {nextHighTide.time}
            </h2>
            <div style={{ backgroundColor: '#f0f9ff', borderRadius: '0.75rem', padding: '1.5rem', border: '2px solid #0ea5e9', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: '#0369a1', margin: '0' }}>
                <Clock size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                Predicted water level at peak: <strong>{nextHighTide.val.toFixed(2)} ft SF</strong> = <strong>{nextLocalEst?.toFixed(2)} ft Mill Valley</strong>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {Object.entries(ZONES).map(([key, zone]) => {
                const status = getStatus(nextLocalEst, zone.threshold);
                return (
                  <div key={key} style={{
                    backgroundColor: status.bg,
                    border: `2px solid ${status.color}`,
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{status.icon}</span>
                      <p style={{ fontSize: '1.1rem', fontWeight: '600', color: status.color, margin: '0' }}>
                        {status.status}
                      </p>
                    </div>
                    <p style={{ fontSize: '0.95rem', color: '#0f172a', margin: '0 0 1rem 0', fontWeight: '500' }}>
                      {zone.name}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0', lineHeight: '1.5' }}>
                      {status.text}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.75rem 0 0 0' }}>
                      Threshold: {zone.threshold} ft
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* FOOTER */}
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', lineHeight: '1.6' }}>
          <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>How This Works:</p>
          <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
            <li>Data source: NOAA San Francisco Gauge (Station 9414290)</li>
            <li>Mill Valley estimate: SF level + {CALIBRATION.amplification} ft (local geography amplification)</li>
            <li>Thresholds based on field observations, not official surveys</li>
            <li>Updates every 5 minutes</li>
          </ul>
        </div>

      </main>
    </div>
  );
}
