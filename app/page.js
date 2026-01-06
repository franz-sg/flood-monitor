'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Droplet, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function Home() {
  const [waterLevel, setWaterLevel] = useState(3.8);
  const [localLevel, setLocalLevel] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [floodStatus, setFloodStatus] = useState('normal');
  const [hasRainAdvisory, setHasRainAdvisory] = useState(false);
  const [manzanitaStatus, setManzanitaStatus] = useState(null);
  const [millerAveStatus, setMillerAveStatus] = useState(null);

  const SF_THRESHOLDS = {
    low: 6.7,
    manzanita_limit: 7.0,
    high_flood: 7.2,
  };

  const RAIN_OVERRIDE_THRESHOLD = 5.5;

  const getLocalTidalPhase = (sfTimestamp) => {
    return new Date(new Date(sfTimestamp).getTime() + 30 * 60000);
  };

  const getEstimatedLocalLevel = (sfLevel) => {
    if (sfLevel >= 7.0) {
      return sfLevel + 0.8;
    } else if (sfLevel >= 6.7) {
      return sfLevel + 0.5;
    }
    return sfLevel;
  };

  const getManzanitaStatus = (sfLevel, hasRain) => {
    if (hasRain && sfLevel > RAIN_OVERRIDE_THRESHOLD) {
      return { status: 'critical', label: 'LIKELY FLOODED', color: '#d32f2f' };
    }
    if (sfLevel > SF_THRESHOLDS.manzanita_limit) {
      return { status: 'critical', label: 'LIKELY IMPASSABLE', color: '#d32f2f' };
    }
    if (sfLevel >= SF_THRESHOLDS.low) {
      return { status: 'warning', label: 'POSSIBLE FLOODING', color: '#f57c00' };
    }
    return { status: 'normal', label: 'LIKELY CLEAR', color: '#4caf50' };
  };

  const getMillerAveLuckyStatus = (sfLevel, hasRain) => {
    if (hasRain && sfLevel > RAIN_OVERRIDE_THRESHOLD) {
      return { status: 'critical', label: 'FLOOD RISK', color: '#d32f2f' };
    }
    if (sfLevel > SF_THRESHOLDS.high_flood) {
      return { status: 'critical', label: 'FLOOD RISK', color: '#d32f2f' };
    }
    if (sfLevel >= SF_THRESHOLDS.manzanita_limit) {
      return { status: 'warning', label: 'MONITORING', color: '#f57c00' };
    }
    return { status: 'normal', label: 'LIKELY CLEAR', color: '#4caf50' };
  };

  const determineFloodStatus = (sfLevel, hasRain) => {
    if (hasRain && sfLevel > RAIN_OVERRIDE_THRESHOLD) return 'critical';
    if (sfLevel > SF_THRESHOLDS.manzanita_limit) return 'critical';
    if (sfLevel >= SF_THRESHOLDS.low) return 'warning';
    return 'normal';
  };

  const getStatusColor = (status) => {
    const colors = {
      critical: '#d32f2f',
      warning: '#f57c00',
      alert: '#fbc02d',
      caution: '#ff9800',
      normal: '#4caf50'
    };
    return colors[status] || colors.normal;
  };

  const getStatusLabel = (status) => {
    const labels = {
      critical: 'HIGH FLOOD RISK',
      warning: 'ELEVATED RISK',
      alert: 'MONITORING',
      caution: 'ADVISORY',
      normal: 'NORMAL'
    };
    return labels[status] || 'NORMAL';
  };

  useEffect(() => {
    const now = new Date();
    const mockSFLevel = 3.8;
    const mockLocalLevel = getEstimatedLocalLevel(mockSFLevel);
    
    setWaterLevel(mockSFLevel);
    setLocalLevel(mockLocalLevel);
    setFloodStatus(determineFloodStatus(mockSFLevel, false));
    setManzanitaStatus(getManzanitaStatus(mockSFLevel, false));
    setMillerAveStatus(getMillerAveLuckyStatus(mockSFLevel, false));
    setLastUpdated(now);

    const mockData = [];
    for (let i = 0; i < 36; i++) {
      const time = new Date(now - (35 - i) * 600000);
      mockData.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        level: 3.2 + Math.sin(i * 0.3) * 0.8,
        timestamp: time
      });
    }
    setHistoricalData(mockData);

    const nextHighTime = new Date(now.getTime() + 4 * 3600000);
    setPredictions({
      nextHighLevel: 5.2,
      nextHighTime: nextHighTime,
      predictedStatus: 'normal'
    });

    const fetchWaterData = async () => {
      try {
        const waterResponse = await fetch(
          `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=water_level&date=latest&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=millvalleybriefing`
        );

        const waterData = await waterResponse.json();
        if (waterData.data && waterData.data.length > 0) {
          const latest = waterData.data[waterData.data.length - 1];
          const currentLevel = parseFloat(latest.v);
          const localEstimate = getEstimatedLocalLevel(currentLevel);
          
          setWaterLevel(currentLevel);
          setLocalLevel(localEstimate);
          setFloodStatus(determineFloodStatus(currentLevel, hasRainAdvisory));
          setManzanitaStatus(getManzanitaStatus(currentLevel, hasRainAdvisory));
          setMillerAveStatus(getMillerAveLuckyStatus(currentLevel, hasRainAdvisory));
          setLastUpdated(new Date(latest.t));
        }
      } catch (error) {
        console.log('NOAA API unavailable, using mock data');
      }
    };

    fetchWaterData();
    const interval = setInterval(fetchWaterData, 300000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day} ${hours}${minutes}`;
  };

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
              <p className="text-slate-400 text-sm mt-1">Real-time Inference from SF Tide Gauge (NOAA 9414290)</p>
            </div>
            {lastUpdated && (
              <div className="text-right text-slate-400 text-xs">
                <div className="flex items-center gap-2 justify-end">
                  <Clock className="w-4 h-4" />
                  <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                </div>
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
                    <p className="text-sm text-slate-400 mb-1">SF Tide Gauge:</p>
                    <p className="text-3xl font-light text-slate-300">
                      {waterLevel.toFixed(2)} <span className="text-xl">ft</span>
                    </p>
                    {localLevel !== null && (
                      <>
                        <p className="text-sm text-slate-400 mt-2 mb-1">Estimated Local:</p>
                        <p className="text-3xl font-light text-slate-300">
                          {localLevel.toFixed(2)} <span className="text-xl">ft</span>
                        </p>
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
                  <p className="text-2xl font-light" style={{ color: manzanitaStatus?.color }}>
                    {manzanitaStatus?.label}
                  </p>
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
                  <p className="text-2xl font-light" style={{ color: millerAveStatus?.color }}>
                    {millerAveStatus?.label}
                  </p>
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
            <h3 className="text-lg font-light tracking-tight mb-4">Inference Methodology</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p><strong>Data:</strong> NOAA SF Tide Gauge</p>
              <p><strong>Time Lag:</strong> +30 minutes to Mill Valley</p>
              <p><strong>Amplification:</strong> Worst-case scenario</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
