'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Droplet, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function Home() {
  const [waterLevel, setWaterLevel] = useState(2.456);
  const [localLevel, setLocalLevel] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [floodStatus, setFloodStatus] = useState('normal');
  const [manzanitaStatus, setManzanitaStatus] = useState(null);
  const [millerAveStatus, setMillerAveStatus] = useState(null);

  const SF_THRESHOLDS = {
    low: 6.7,
    manzanita_limit: 7.0,
    high_flood: 7.2,
  };

  const getEstimatedLocalLevel = (sfLevel) => {
    if (sfLevel >= 7.0) return sfLevel + 0.8;
    if (sfLevel >= 6.7) return sfLevel + 0.5;
    return sfLevel;
  };

  const getManzanitaStatus = (sfLevel) => {
    if (sfLevel > SF_THRESHOLDS.manzanita_limit) {
      return { label: 'LIKELY IMPASSABLE', color: '#d32f2f' };
    }
    if (sfLevel >= SF_THRESHOLDS.low) {
      return { label: 'POSSIBLE FLOODING', color: '#f57c00' };
    }
    return { label: 'LIKELY CLEAR', color: '#4caf50' };
  };

  const getMillerAveLuckyStatus = (sfLevel) => {
    if (sfLevel > SF_THRESHOLDS.high_flood) {
      return { label: 'FLOOD RISK', color: '#d32f2f' };
    }
    if (sfLevel >= SF_THRESHOLDS.manzanita_limit) {
      return { label: 'MONITORING', color: '#f57c00' };
    }
    return { label: 'LIKELY CLEAR', color: '#4caf50' };
  };

  const determineFloodStatus = (sfLevel) => {
    if (sfLevel > SF_THRESHOLDS.manzanita_limit) return 'critical';
    if (sfLevel >= SF_THRESHOLDS.low) return 'warning';
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
          const localEstimate = getEstimatedLocalLevel(currentLevel);
          
          setWaterLevel(currentLevel);
          setLocalLevel(localEstimate);
          setFloodStatus(determineFloodStatus(currentLevel));
          setManzanitaStatus(getManzanitaStatus(currentLevel));
          setMillerAveStatus(getMillerAveLuckyStatus(currentLevel));
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.log('OneRain scrape failed, using default data:', error.message);
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
          <p className="text-sm text-slate-600">{payload[0].value.toFixed(2)} ft</p>
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
              <p className="text-slate-400 text-sm mt-1">Real-time Data from Tam Valley (OneRain)</p>
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
                    <p className="text-sm text-slate-400 mb-1">Tam Valley Water Level:</p>
                    <p className="text-3xl font-light text-slate-300">{waterLevel.toFixed(2)} <span className="text-xl">ft</span></p>
                    {localLevel !== null && (
                      <>
                        <p className="text-sm text-slate-400 mt-2 mb-1">Estimated Local (w/ Amplification):</p>
                        <p className="text-3xl font-light text-slate-300">{localLevel.toFixed(2)} <span className="text-xl">ft</span></p>
                      </>
                    )}
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
                    {waterLevel > SF_THRESHOLDS.manzanita_limit 
                      ? "High confidence of flooding at Park & Ride." 
                      : waterLevel >= SF_THRESHOLDS.low 
                      ? "Tide approaching critical threshold." 
                      : "Road conditions likely passable."}
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Zone 2 & 3: Miller Ave & Lucky Drive</p>
                  <p className="text-2xl font-light" style={{ color: millerAveStatus?.color }}>{millerAveStatus?.label}</p>
                  <p className="text-slate-400 text-xs mt-2">
                    {waterLevel > SF_THRESHOLDS.high_flood 
                      ? "Water likely on roadway." 
                      : waterLevel >= SF_THRESHOLDS.manzanita_limit 
                      ? "Tides high enough to threaten low-lying lanes." 
                      : "Roads likely clear of tidal flooding."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-light tracking-tight mb-4">Zone Risk Reference</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span className="text-slate-300">Manzanita Alert</span>
                <span className="font-semibold">&gt; 7.0 ft</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <span className="text-slate-300">Miller Ave Alert</span>
                <span className="font-semibold">&gt; 7.2 ft</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-light tracking-tight mb-4">Data Source</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p><strong>Sensor:</strong> Tam Valley OneRain</p>
              <p><strong>Location:</strong> Mill Valley, CA</p>
              <p><strong>Updates:</strong> Every 5 minutes</p>
              <p><strong>Amplification:</strong> Worst-case scenario</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}