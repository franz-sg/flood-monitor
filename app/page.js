'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

export default function Home() {
  const [nextHighTide, setNextHighTide] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const CALIBRATION = {
    amplification: 0.4,
  };

  const ZONES = {
    manzanita: { name: 'Manzanita (Hwy 1)', threshold: 7.2 },
    miller: { name: 'Miller Avenue (Tam High)', threshold: 8.0 },
    lucky: { name: 'Lucky Drive & Hwy 101', threshold: 8.2 }
  };

  const getStatus = (millValleyLevel, threshold) => {
    if (millValleyLevel >= threshold) {
      return { status: 'IMPASSABLE', color: '#d32f2f', bg: '#fef2f2', icon: '🚫' };
    }
    return { status: 'PASSABLE', color: '#16a34a', bg: '#f0fdf4', icon: '✅' };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 86400000);
        
        // Format dates properly for NOAA API
        const formatDate = (d) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hour = String(d.getHours()).padStart(2, '0');
          const minute = String(d.getMinutes()).padStart(2, '0');
          return `${year}${month}${day}%20${hour}:${minute}`;
        };
        
        const beginDate = formatDate(now);
        const endDate = formatDate(tomorrow);
        
        const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=predictions&begin_date=${beginDate}&end_date=${endDate}&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json&application=millvalleybriefing`;
        
        console.log('Fetching from:', url);
        
        const predResponse = await fetch(url);
        const predData = await predResponse.json();
        
        console.log('Response:', predData);
        
        if (predData.predictions && predData.predictions.length > 0) {
          const highs = predData.predictions.filter(p => p.type === 'H');
          const nextHigh = highs.find(p => new Date(p.t) > now);
          
          if (nextHigh) {
            const sfPeak = parseFloat(nextHigh.v);
            const millValleyPeak = sfPeak + CALIBRATION.amplification;
            
            setNextHighTide({
              time: new Date(nextHigh.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              sfLevel: sfPeak,
              mvLevel: millValleyPeak,
              fullDate: new Date(nextHigh.t)
            });
          } else {
            setError('No future high tide found');
          }
        } else {
          setError('No predictions returned from API');
        }
        
        setLastUpdated(new Date());
      } catch (err) { 
        console.error('Error:', err);
        setError(`Error: ${err.message}`);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      <header style={{ backgroundColor: '#1e293b', color: 'white', padding: '2rem 1rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Georgia, serif', margin: '0 0 1rem 0' }}>
          🌊 Mill Valley Flood Watch
        </h1>
        
        {nextHighTide && (
          <div style={{ fontSize: '1.2rem', color: '#cbd5e1' }}>
            <Clock size={20} style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Next High Tide: <strong>{nextHighTide.time}</strong>
          </div>
        )}
        
        {error && (
          <div style={{ fontSize: '0.9rem', color: '#fca5a5', marginTop: '1rem' }}>
            {error}
          </div>
        )}
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {nextHighTide && (
          <>
            <section style={{ marginBottom: '2rem', backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', margin: '0 0 1rem 0' }}>
                Predicted Peak Water Levels
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>San Francisco</p>
                  <p style={{ fontSize: '2rem', fontWeight: '300', color: '#0f172a', margin: '0' }}>
                    {nextHighTide.sfLevel.toFixed(2)} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ft</span>
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Mill Valley (Estimated)</p>
                  <p style={{ fontSize: '2rem', fontWeight: '300', color: '#0f172a', margin: '0' }}>
                    {nextHighTide.mvLevel.toFixed(2)} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ft</span>
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '1rem 0 0 0' }}>
                (SF reading + {CALIBRATION.amplification} ft local amplification)
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 1rem 0' }}>
                Will These Areas Be Passable?
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {Object.entries(ZONES).map(([key, zone]) => {
                  const status = getStatus(nextHighTide.mvLevel, zone.threshold);
                  const difference = nextHighTide.mvLevel - zone.threshold;
                  
                  return (
                    <div key={key} style={{
                      backgroundColor: status.bg,
                      border: `2px solid ${status.color}`,
                      borderRadius: '0.75rem',
                      padding: '1.5rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '2rem' }}>{status.icon}</span>
                        <p style={{ fontSize: '1.1rem', fontWeight: '600', color: status.color, margin: '0' }}>
                          {status.status}
                        </p>
                      </div>
                      
                      <p style={{ fontSize: '0.95rem', color: '#0f172a', margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                        {zone.name}
                      </p>
                      
                      <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '0.75rem' }}>
                        <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0' }}>
                          Threshold: {zone.threshold} ft
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0.25rem 0 0 0' }}>
                          Predicted: {nextHighTide.mvLevel.toFixed(2)} ft
                        </p>
                      </div>
                      
                      {difference >= 0 ? (
                        <p style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: '600' }}>
                          ⚠️ Will be {difference.toFixed(2)} ft underwater
                        </p>
                      ) : (
                        <p style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '600' }}>
                          ✓ {Math.abs(difference).toFixed(2)} ft clearance
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', lineHeight: '1.6' }}>
              <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Data Source & Method:</p>
              <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
                <li>NOAA San Francisco Gauge (Station 9414290)</li>
                <li>Mill Valley estimate = SF level + {CALIBRATION.amplification} ft</li>
              </ul>
            </div>
          </>
        )}

        {!nextHighTide && !error && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            <p>Loading forecast data...</p>
          </div>
        )}
      </main>
    </div>
  );
}
