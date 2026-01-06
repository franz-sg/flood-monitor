export async function GET(request) {
  try {
    const url = 'https://marin.onerain.com/sensor/?time_zone=US%2FPacific&site_id=8689&site=46602a15-53c4-4e20-bdd2-8a95d9372f09&device_id=1&device=d1a13e98-2636-49e7-89f4-932c7c4115a6&bin=86400&range=standard&markers=false&legend=true&thresholds=true&refresh=off&show_raw=true&show_quality=true';
    
    const response = await fetch(url);
    const html = await response.text();
    
    const levelMatch = html.match(/(\d+\.\d+)\s*ft/i);
    
    if (levelMatch) {
      const waterLevel = parseFloat(levelMatch[1]);
      return new Response(JSON.stringify({
        success: true,
        waterLevel: waterLevel,
        timestamp: new Date().toISOString(),
        source: 'Tam Valley (OneRain)',
        unit: 'ft'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Could not parse water level'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}