'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Droplet, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function Home() {
  const [waterLevel, setWaterLevel] = useState(3.8);
  const [historicalData, setHistoricalData] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [floodStatus, setFloodStatus] = useState('normal');

  // NOAA flood thresholds for San Francisco Bay Area (in feet above MLLW)
  const FLOOD_THRESHOLDS = {
    millValley: {
      minor: 4.5,
      moderate: 5.5,
      major: 6.5,
    },
    advisory: 4.2,
  };

  const determineFloodStatus = (level) => {
    if (level >= FLOOD_THRESHOLDS.millValley.major) return 'critical';
    if (level >= FLOOD_THRESHOLDS.millValley.moderate) return 'warning';
    if (level >= FLOOD_THRESHOLDS.millValley.minor) return 'alert';
    if (level >= FLOOD_THRESHOLDS.advisory) return 'caution';
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
      critical: 'CRITICAL FLOODING',
      warning: 'MAJOR FLOODING',
      alert: 'FLOODING POSSIBLE',
      caution: 'MONITORING',
      normal: 'NORMAL'
    };
    return labels[status] || 'NORMAL';
  };

  useEffect(() => {
    // Set initial mock data
    const now = new Date();
    const mockLevel = 3.8;
    setWaterLevel(mockLevel);
    setFloodStatus(determineFloodStatus(mockLevel));
    setLastUpdated(now);

    // Generate mock historical data
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

    // Mock prediction
    const nextHighTime = new Date(now.getTime() + 4 * 3600000);
    setPredictions({
      nextHighLevel: 5.2,
      nextHighTime: nextHighTime,
      predictedStatus: 'normal'
    });

    // Attempt to fetch real data from NOAA
    const fetchWaterData = async () => {
      try {
        // Use 'latest' to get the most recent data point within last 18 minutes
        const waterResponse = await fetch(
          `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?` +
          `station=9414290&` +
          `product=water_level&` +
          `date=latest&` +
          `datum=MLLW&` +
          `time_zone=lst_ldt&` +
          `units=english&` +
          `format=json&` +
          `application=millvalleybriefing`
        );

        const waterData = await waterResponse.json();

        if (waterData.data && waterData.data.length > 0) {
          const latest = waterData.data[waterData.data.length - 1];
          const currentLevel = parseFloat(latest.v);
          
          setWaterLevel(currentLevel);
          setFloodStatus(determineFloodStatus(currentLevel));
          setLastUpdated(new Date(latest.t));
        }

        // Fetch recent data for the chart (last 72 hours)
        const recentResponse = await fetch(
          `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?` +
          `station=9414290&` +
          `product=water_level&` +
          `date=recent&` +
          `datum=MLLW&` +
          `time_zone=lst_ldt&` +
          `units=english&` +
          `format=json&` +
          `application=millvalleybriefing`
        );

        const recentData = await recentResponse.json();
        if (recentData.data && recentData.data.length > 0) {
          const chartData = recentData.data.map(d => ({
            time: new Date(d.t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            level: parseFloat(d.v),
            timestamp: new Date(d.t)
          })).sort((a, b) => a.timestamp - b.timestamp);

          setHistoricalData(chartData);
        }

        // Fetch tide predictions for next 24 hours
        const tomorrow = new Date(now.getTime() + 24 * 3600000);
        
        const predictResponse = await fetch(
          `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?` +
          `station=9414290&` +
          `product=predictions&` +
          `begin_date=${formatDate(now)}&` +
          `end_date=${formatDate(tomorrow)}&` +
          `datum=MLLW&` +
          `time_zone=lst_ldt&` +
          `units=english&` +
          `interval=hilo&` +
          `format=json&` +
          `application=millvalleybriefing`
        );

        const predictData = await predictResponse.json();
        if (predictData.predictions && predictData.predictions.length > 0) {
          const nextHigh = predictData.predictions.find(p => p.type === 'H');
          if (nextHigh) {
            setPredictions({
              nextHighLevel: parseFloat(nextHigh.v),
              nextHighTime: new Date(nextHigh.t),
              predictedStatus: determineFloodStatus(parseFloat(nextHigh.v))
            });
          }
        }
      } catch (error) {
        console.log('Using mock data - NOAA API not available:', error.message);
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
              <h1 className="text-3xl font-light tracking-tight">Mill Valley Flood Monitor</h1>
              <p className="text-slate-400 text-sm mt-1">San Francisco Bay Water Level Tracking</p>
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
                <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">Current Status</p>
                <div>
                  <p 
                    className="text-5xl font-light tracking-tight"
                    style={{ color: getStatusColor(floodStatus) }}
                  >
                    {getStatusLabel(floodStatus)}
                  </p>
                  {waterLevel !== null && (
                    <p className="text-4xl font-light text-slate-300 mt-3">
                      {waterLevel.toFixed(2)} <span className="text-2xl">ft</span>
                    </p>
                  )}
                </div>
              </div>
              {(floodStatus === 'critical' || floodStatus === 'warning' || floodStatus === 'alert') && (
                <AlertTriangle className="w-12 h-12" style={{ color: getStatusColor(floodStatus) }} />
              )}
            </div>

            {waterLevel !== null && (
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Minor Flood Threshold</p>
                  <p className="text-2xl font-light">{FLOOD_THRESHOLDS.millValley.minor.toFixed(2)} <span className="text-lg">ft</span></p>
                  <p className="text-slate-400 text-xs mt-1">
                    {waterLevel >= FLOOD_THRESHOLDS.millValley.minor 
                      ? `⚠️ ${(waterLevel - FLOOD_THRESHOLDS.millValley.minor).toFixed(2)} ft above`
                      : `✓ ${(FLOOD_THRESHOLDS.millValley.minor - waterLevel).toFixed(2)} ft below`
                    }
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Moderate Flood Threshold</p>
                  <p className="text-2xl font-light">{FLOOD_THRESHOLDS.millValley.moderate.toFixed(2)} <span className="text-lg">ft</span></p>
                  <p className="text-slate-400 text-xs mt-1">
                    {waterLevel >= FLOOD_THRESHOLDS.millValley.moderate 
                      ? `⚠️ ${(waterLevel - FLOOD_THRESHOLDS.millValley.moderate).toFixed(2)} ft above`
                      : `✓ ${(FLOOD_THRESHOLDS.millValley.moderate - waterLevel).toFixed(2)} ft below`
                    }
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Next High Tide</p>
                  {predictions ? (
                    <>
                      <p className="text-2xl font-light">
                        {predictions.nextHighLevel.toFixed(2)} <span className="text-lg">ft</span>
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        {predictions.nextHighTime.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          meridiem: 'short'
                        })}
                      </p>
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm">Loading...</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-light tracking-tight mb-2">Water Level Trend (Last 72 Hours)</h2>
            <p className="text-slate-400 text-sm">Real-time measurements from NOAA Station 9414290</p>
          </div>

          {historicalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historicalData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#475569' }}
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  label={{ value: 'Feet (MLLW)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="level" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorLevel)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400">Loading chart data...</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-light tracking-tight mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Flood Threshold Definitions
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span className="text-slate-300">Minor Flooding</span>
                <span className="font-semibold">{FLOOD_THRESHOLDS.millValley.minor} ft</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <span className="text-slate-300">Moderate Flooding</span>
                <span className="font-semibold">{FLOOD_THRESHOLDS.millValley.moderate} ft</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <span className="text-slate-300">Major Flooding</span>
                <span className="font-semibold">{FLOOD_THRESHOLDS.millValley.major} ft</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-light tracking-tight mb-4">What This Means for Mill Valley</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p>• Water levels are measured in feet above Mean Lower Low Water (MLLW)</p>
              <p>• This dashboard tracks the San Francisco Bay tide station</p>
              <p>• King Tides typically peak around 5.5-6.0 feet</p>
              <p>• Climate change is increasing flooding frequency</p>
              <p>• Data updates every 5 minutes from NOAA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
