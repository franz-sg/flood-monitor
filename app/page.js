'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Droplet, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function Home() {
  const [waterLevel, setWaterLevel] = useState(6.8);
  const [historicalData, setHistoricalData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [floodStatus, setFloodStatus] = useState('normal');
  const [manzanitaStatus, setManzanitaStatus] = useState(null);
  const [millerAveStatus, setMillerAveStatus] = useState(null);

  const TAM_THRESHOLDS = {
    safe_threshold: 6.8,
    manzanita_flood: 7.2,
    miller_ave_flood: 8.0,
    lucky_drive_flood: 8.2,
    critical_peak: 8.63,
  };

  const getManzanitaStatus = (tamLevel) => {
    if (tamLevel >= TAM_THRESHOLDS.manzanita_flood) {
      return { label: 'FLOODING LIKELY', color: '#d32f2f' };
    }
    if (tamLevel >= TAM_THRESHOLDS.safe_threshold) {
      return { label: 'APPROACHING THRESHOLD', color: '#f57c00' };
    }
    return { label: 'LIKELY CLEAR', color: '#4caf50' };
  };

  const getMillerAveLuckyStatus = (tamLevel) => {
    if (tamLevel >= TAM_THRESHOLDS.lucky_drive_flood) {
      return { label: 'BOTH ZONES FLOODED', color: '#d32f2f' };
    }
    if (tamLevel >= TAM_THRESHOLDS.miller_ave_flood) {
      return { label: 'MILLER AVE FLOODED', color: '#d32f2f' };
    }
    if (tamLevel >= TAM_THRESHOLDS.manzanita_flood) {
      return { label: 'MONITORING', color: '#f57c00' };
    }
    return { label: 'LIKELY CLEAR', color: '#4caf50' };
  };

  const determineFloodStatus = (tamLevel) => {
    if (tamLevel >= TAM_THRESHOLDS.lucky_drive_flood) return 'critical';
    if (tamLevel >= TAM_THRESHOLDS.manzanita_flood) return 'critical';
    if (tamLevel >= TAM_THRESHOLDS.safe_threshold) return 'warning';
    return 'normal';
  };

  const getStatusColor = (status) => {
    const colors = { critical: '#d32f2f', warning: '#f57c00', normal: '#4caf50' };
    return colors[status] || colors.normal;
  };

  const getStatusLabel = (status) => {
    const labels = { critical: 'HIGH FLOOD RISK', warning: 'ELEVATED RISK', normal: 'NORMAL' };
    return labels[status] || 'NORMAL';
  };

  useEffect(() => {
    const fetchWaterData = async () => {
      try {
        const url = 'https://marin.onerain.com/sensor/?time_zone=US%2FPacific&site_id=8689&site=46602a15-53c4-4e20-bdd2-8a95d9372f09&device_id=1&device=d1a13e98-2636-49e7-89f4-932c7c4115a6&bin=86400&range=standard&markers=false&legend=true&thresholds=true&refresh=off&show_raw=true&show_quality=true';
        
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        
        const response = await fetch(proxyUrl);
        const html = await response.text();
        
        const levelMatch = html.match(/(\d+\.\d+)\s*ft/i);
        
        if (levelMatch) {
          const currentLevel = parseFloat(levelMatch[1]);
          
          if (currentLevel >= 5.0 && currentLevel <= 9.0) {
            setWaterLevel(currentLevel);
            setFloodStatus(determineFloodStatus(currentLevel));
            setManzanitaStatus(getManzanitaStatus(currentLevel));
            setMillerAveStatus(getMillerAveLuckyStatus(currentLevel));
            setLastUpdated(new Date());
          }
        }
      } catch (error) {
        console.log('OneRain scrape failed:', error.message);
      }
    };

    fetchWaterData();
    const interval = setInterval(fetchWaterData, 300000);
    return () => clearInterval(interval);
  }, []);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200 shadow-lg">
          <p className="text-sm font-semibold text-slate-900">{payload[0].payload.time}</p>
          <p className="text-sm text-slate-600">{payload[0].value.toFixed(2)} ft MLLW</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white">
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight">Mill Valley Flood Risk Monitor</h1>
              <p className="text-slate-400 text-sm mt-1">Tam Valley Water Level (MLLW) - Data Calibrated Jan 2026</p>
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
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">Current Status: Mill Valley</p>
                <p className="text-5xl font-light tracking-tight" style={{ color: getStatusColor(floodStatus) }}>
                  {getStatusLabel(floodStatus)}
                </p>
                {waterLevel !== null && (
                  <div className="mt-3">
                    <p className="text-sm text-slate-400 mb-1">Tam Valley Water Level (MLLW):</p>
                    <p className="text-3xl font-light text-slate-300">{waterLevel.toFixed(2)} <span className="text-xl">ft</span></p>
                    <p className="text-xs text-slate-500 mt-1">Safe baseline: 6.8 ft | Peak (Jan 3): 8.63 ft</p>
                  </div>
                )}
              </div>
              {(floodStatus === 'critical' || floodStatus === 'warning') && (
                <AlertTriangle className="w-12 h-12" style={{ color: getStatusColor(floodStatus) }} />
              )}
            </div>

            {waterLevel !== null && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Zone 1: Manzanita (Hwy 1)</p>
                  <p className="text-2xl font-light" style={{ color: manzanitaStatus?.color }}>{manzanitaStatus?.label}</p>
                  <p className="text-slate-400 text-xs mt-2">
                    {waterLevel >= TAM_THRESHOLDS.manzanita_flood 
                      ? "Flooding at Park & Ride and highway access." 
                      : waterLevel >= TAM_THRESHOLDS.safe_threshold 
                      ? "Water level approaching Manzanita threshold (7.2 ft)." 
                      : "Road conditions safe."}
                  </p>
                  <p className="text-slate-500 text-xs mt-3">Flood Threshold: 7.2 ft MLLW</p>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Zone 2 & 3: Miller Ave & Lucky Drive</p>
                  <p className="text-2xl font-light" style={{ color: millerAveStatus?.color }}>{millerAveStatus?.label}</p>
                  <p className="text-slate-400 text-xs mt-2">
                    {waterLevel >= TAM_THRESHOLDS.lucky_drive_flood 
                      ? "Both Miller Ave and Lucky Drive ramp are flooded." 
                      : waterLevel >= TAM_THRESHOLDS.miller_ave_flood 
                      ? "Miller Ave water on roadway; Lucky Drive approaching threshold." 
                      : waterLevel >= TAM_THRESHOLDS.manzanita_flood 
                      ? "High tide conditions; both zones approaching flood thresholds." 
                      : "Roads safe from tidal flooding."}
                  </p>
                  <p className="text-slate-500 text-xs mt-3">Miller: 8.0 ft | Lucky: 8.2 ft MLLW</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-light tracking-tight mb-4">Flood Thresholds (MLLW)</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <span className="text-slate-300">Safe Baseline</span>
                <span className="font-semibold">6.8 ft</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span className="text-slate-300">Manzanita (Hwy 1)</span>
                <span className="font-semibold">7.2 ft</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <span className="text-slate-300">Miller Ave</span>
                <span className="font-semibold">8.0 ft</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <span className="text-slate-300">Lucky Drive</span>
                <span className="font-semibold">8.2 ft</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-light tracking-tight mb-4">Data Source</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p><strong>Sensor:</strong> Tam Valley OneRain</p>
              <p><strong>Scale:</strong> MLLW (Mean Lower Low Water)</p>
              <p><strong>Range:</strong> 6.0 - 8.5 ft</p>
              <p><strong>Update Interval:</strong> Every 5 minutes</p>
              <p><strong>Calibrated:</strong> January 2026</p>
            </div>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-light tracking-tight mb-4">Recent Events</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p><strong>Peak (Jan 3):</strong> 8.63 ft</p>
              <p className="text-red-400">Widespread highway closures</p>
              <p className="text-slate-500 text-xs mt-3">SF Gauge correlation: SF lags ~19 min behind local readings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
