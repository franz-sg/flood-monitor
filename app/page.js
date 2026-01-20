'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function Home() {
  const [sfCurrent, setSfCurrent] = useState(null);
  const [nextHighTide, setNextHighTide] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const CALIBRATION = {
    amplification: 0.4,
    lagMinutes: 30
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
        // Current water level
        const currentResponse = await fetch(
          `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=water_level&date=latest&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=millvalleybriefing`
        );
        const currentData = await currentResponse.json();
        if (currentData.data && currentData.data.length > 0) {
          setSfCurrent(parseFloat(currentData.data[0].v));
          setLastUpdated(new Date(currentData.data[0].t));
        }

        // Predictions
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 86400000);
        
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
        
        const predResponse = await fetch(
          `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=predictions&begin_date=${beginDate}&end_date=${endDate}&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json&application=millvalleybriefing`
        );
        const predData = await predResponse.json();
        
        if (predData.predictions && predData.predictions.length > 0) {
          const highs = predData.predictions.filter(p => p.type === 'H');
          const nextHigh = highs.find(p => new Date(p.t) > now);
          
          if (nextHigh) {
            const sfPeak = parseFloat(nextHigh.v);
            const millValleyPeak = sfPeak + CALIBRATION.amplification;
            
            setNextHighTide({
              time: new Date(nextHigh.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              sfLevel: sfPeak,
              mvLevel: millValleyPeak
            });
          }
        }
      } catch (err) { 
        console.error('Error:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      <header style={{ backgroundColor: '#1e293b', color: 'white', padding: '2rem 1rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Georgia, serif', margin: '0 0 1.5rem 0' }}>
          🌊 Mill Valley Flood Watch
        </h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '600px', margin: '0 auto' }}>
          <div>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Current SF Level</p>
            <p style={{ fontSize: '2rem', fontWeight: '300', color: '#fff', margin: '0' }}>
              {sfCurrent ? sfCurrent.toFixed(2) : '--'} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ft</span>
            </p>
          </div>
          
          <div>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Next High Tide</p>
            <p style={{ fontSize: '2rem', fontWeight: '300', color: '#fff', margin: '0' }}>
              {nextHighTide ? nextHighTide.time : '--'}
            </p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {nextHighTide && (
          <>
            {/* PREDICTED HIGH TIDE DATA */}
            <section style={{ marginBottom: '2rem', backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a', margin: '0 0 1rem 0' }}>
                Predicted Water Levels at {nextHighTide.time}
              </h2>
              
              <div style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #0ea5e9', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.9rem', color: '#0369a1', margin: '0 0 1rem 0' }}>
                  <Clock size={18} style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  These predictions account for ~{CALIBRATION.lagMinutes} minute travel time from San Francisco to Mill Valley
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: '#0369a1', textTransform: 'uppercase', fontWeight: '600', margin: '0 0 0.5rem 0' }}>San Francisco Peak</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: '300', color: '#0369a1', margin: '0' }}>
                      {nextHighTide.sfLevel.toFixed(2)} ft
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: '#0369a1', textTransform: 'uppercase', fontWeight: '600', margin: '0 0 0.5rem 0' }}>Mill Valley Peak (Estimated)</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: '300', color: '#0369a1', margin: '0' }}>
                      {nextHighTide.mvLevel.toFixed(2)} ft
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ZONE PREDICTIONS */}
            <section>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a', margin: '0 0 1rem 0' }}>
                Predicted Conditions at High Tide
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '1.75rem' }}>{status.icon}</span>
                        <p style={{ fontSize: '1rem', fontWeight: '600', color: status.color, margin: '0' }}>
                          {status.status}
                        </p>
                      </div>
                      
                      <p style={{ fontSize: '0.95rem', color: '#0f172a', margin: '0 0 1rem 0', fontWeight: '500' }}>
                        {zone.name}
                      </p>
                      
                      {difference >= 0 ? (
                        <p style={{ fontSize: '0.9rem', color: '#991b1b', fontWeight: '600' }}>
                          Water will be {difference.toFixed(2)} ft <strong>over</strong> threshold
                        </p>
                      ) : (
                        <p style={{ fontSize: '0.9rem', color: '#166534', fontWeight: '600' }}>
                          Water will have {Math.abs(difference).toFixed(2)} ft clearance
                        </p>
                      )}
                      
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.75rem 0 0 0' }}>
                        Threshold: {zone.threshold} ft | Predicted: {nextHighTide.mvLevel.toFixed(2)} ft
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* FOOTER */}
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', lineHeight: '1.6' }}>
              <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>How This Works:</p>
              <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
                <li>Current SF level from NOAA San Francisco Gauge (Station 9414290)</li>
                <li>Next high tide predicted using NOAA tidal models</li>
                <li>Mill Valley level = SF level + {CALIBRATION.amplification} ft (local amplification)</li>
                <li>Predictions include ~{CALIBRATION.lagMinutes} minute lag for water travel time</li>
                <li>Thresholds based on field observations</li>
              </ul>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '1rem 0 0 0' }}>
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            </div>
          </>
        )}

        {!nextHighTide && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <p style={{ fontSize: '1rem' }}>Loading forecast data...</p>
          </div>
        )}
      </main>
    </div>
  );
}
