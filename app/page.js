'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

export default function Home() {
  const [sfLevel, setSfLevel] = useState(null);
  const [tamLevel, setTamLevel] = useState(2.438);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [floodStatus, setFloodStatus] = useState('normal');
  const [manzanitaStatus, setManzanitaStatus] = useState(null);
  const [millerAveStatus, setMillerAveStatus] = useState(null);

  const TAM_THRESHOLDS = {
    manzanita_flood: 7.2,
    miller_ave_flood: 8.0,
    lucky_drive_flood: 8.2,
  };

  const convertSfToTam = (sfLevel) => {
    // Variable amplification based on calibration points:
    // SF 6.9 → Tam 7.2 (amp: 0.3)
    // SF 7.6 → Tam 8.0 (amp: 0.4)
    // SF 7.8 → Tam 8.2 (amp: 0.4)
    // Linear interpolation between points
    
    if (sfLevel <= 6.9) {
      return sfLevel + 0.3;
    } else if (sfLevel <= 7.8) {
      // Interpolate between 6.9/0.3 and 7.8/0.4
      const amp = 0.3 + ((sfLevel - 6.9) / (7.8 - 6.9)) * (0.4 - 0.3);
      return sfLevel + amp;
    } else {
      return sfLevel + 0.4;
    }
  };

  const getManzanitaStatus = (tamLevel) => {
    if (tamLevel >= TAM_THRESHOLDS.manzanita_flood) {
      return { label: 'CLOSED', color: '#d32f2f' };
    }
    return { label: 'OPEN', color: '#4caf50' };
  };

  const getMillerAveLuckyStatus = (tamLevel) => {
    if (tamLevel >= TAM_THRESHOLDS.lucky_drive_flood) {
      return { label: 'BOTH CLOSED', color: '#d32f2f' };
    }
    if (tamLevel >= TAM_THRESHOLDS.miller_ave_flood) {
      return { label: 'MILLER CLOSED', color: '#d32f2f' };
    }
    return { label: 'OPEN', color: '#4caf50' };
  };

  const determineFloodStatus = (tamLevel) => {
    if (tamLevel >= TAM_THRESHOLDS.manzanita_flood) return 'critical';
    return 'normal';
  };

  const getStatusColor = (status) => {
    const colors = { critical: '#d32f2f', normal: '#4caf50' };
    return colors[status] || colors.normal;
  };

  const getStatusLabel = (status) => {
    return status === 'critical' ? 'FLOOD ALERT' : 'NORMAL';
  };

  useEffect(() => {
    const fetchWaterData = async () => {
      try {
        const waterResponse = await fetch(
          `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=water_level&date=latest&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=millvalleybriefing`
        );

        const waterData = await waterResponse.json();
        if (waterData.data && waterData.data.length > 0) {
          const latest = waterData.data[waterData.data.length - 1];
          const sf = parseFloat(latest.v);
          const tam = convertSfToTam(sf);
          
          setSfLevel(sf);
          setTamLevel(tam);
          setFloodStatus(determineFloodStatus(tam));
          setManzanitaStatus(getManzanitaStatus(tam));
          setMillerAveStatus(getMillerAveLuckyStatus(tam));
          setLastUpdated(new Date(latest.t));
        }
      } catch (error) {
        console.log('NOAA API error:', error.message);
      }
    };

    fetchWaterData();
    const interval = setInterval(fetchWaterData, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white">
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight">Mill Valley Flood Monitor</h1>
              <p className="text-slate-400 text-sm mt-1">Real-time water level tracking</p>
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
        <div className="mb-8">
          <div 
            className="rounded-2xl p-8 backdrop-blur-sm border transition-all duration-300"
            style={{
              backgroundColor: `${getStatusColor(floodStatus)}15`,
              borderColor: `${getStatusColor(floodStatus)}40`,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-5xl font-light tracking-tight" style={{ color: getStatusColor(floodStatus) }}>
                  {getStatusLabel(floodStatus)}
                </p>
                {sfLevel !== null && (
                  <div className="mt-6">
                    <p className="text-sm text-slate-400 mb-1">SF Water Level (MLLW):</p>
                    <p className="text-4xl font-light text-slate-300">{sfLevel.toFixed(2)} ft</p>
                    <p className="text-xs text-slate-500 mt-3">Inferred Mill Valley: {tamLevel.toFixed(2)} ft</p>
                  </div>
                )}
              </div>
              {floodStatus === 'critical' && (
                <AlertTriangle className="w-12 h-12" style={{ color: getStatusColor(floodStatus) }} />
              )}
            </div>

            {tamLevel !== null && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Manzanita (Hwy 1)</p>
                  <p className="text-2xl font-light" style={{ color: manzanitaStatus?.color }}>{manzanitaStatus?.label}</p>
                  <p className="text-slate-500 text-xs mt-3">Closes at: 7.2 ft</p>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Miller Ave & Lucky Drive</p>
                  <p className="text-2xl font-light" style={{ color: millerAveStatus?.color }}>{millerAveStatus?.label}</p>
                  <p className="text-slate-500 text-xs mt-3">Miller: 8.0 ft | Lucky: 8.2 ft</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-light tracking-tight mb-4">Closure Thresholds</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span>Manzanita</span>
                <span className="font-semibold">7.2 ft</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <span>Miller Ave</span>
                <span className="font-semibold">8.0 ft</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <span>Lucky Drive</span>
                <span className="font-semibold">8.2 ft</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-light tracking-tight mb-4">How It Works</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p><strong>Data:</strong> NOAA SF Tide Gauge</p>
              <p><strong>Method:</strong> Infer Mill Valley level</p>
              <p><strong>Lag:</strong> -19 min (SF first)</p>
              <p><strong>Formula:</strong> Variable amplification</p>
            </div>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-light tracking-tight mb-4">Calibration Points</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p>SF 6.9 ft → MV 7.2 ft</p>
              <p>SF 7.6 ft → MV 8.0 ft</p>
              <p>SF 7.8 ft → MV 8.2 ft</p>
              <p className="text-red-400 text-xs mt-3">Peak: 8.63 ft (Jan 3)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
