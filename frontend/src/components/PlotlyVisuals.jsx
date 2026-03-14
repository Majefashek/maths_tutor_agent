import React from 'react';
import Plot from 'react-plotly.js';
import * as math from 'mathjs';

// ── 3D Surface Plot ───────────────────────────────────────────────
export function SurfacePlotVisual({ visual }) {
  const xRange = visual.x_range || [-5, 5];
  const yRange = visual.y_range || [-5, 5];
  const exprStr = visual.expression || 'sin(x)*cos(y)';

  const steps = 40;
  const xStart = xRange[0], xEnd = xRange[1];
  const yStart = yRange[0], yEnd = yRange[1];
  
  const xData = [];
  const yData = [];
  const zData = [];
  
  try {
    const expr = math.compile(exprStr);
    
    // Generate grid
    for (let i = 0; i <= steps; i++) {
        const y = yStart + (yEnd - yStart) * (i / steps);
        yData.push(y);
        const zRow = [];
        
        for (let j = 0; j <= steps; j++) {
            const x = xStart + (xEnd - xStart) * (j / steps);
            if (i === 0) xData.push(x);
            
            try {
                const z = expr.evaluate({ x, y });
                zRow.push(z);
            } catch (e) {
                zRow.push(null);
            }
        }
        zData.push(zRow);
    }
  } catch (err) {
      console.error("Error evaluating surface plot expression", err);
  }

  return (
    <div className="plotly-container" style={{ width: '100%', height: '400px' }}>
      <Plot
        data={[
          {
            z: zData,
            x: xData,
            y: yData,
            type: 'surface',
            colorscale: 'Viridis',
          }
        ]}
        layout={{
          title: visual.title || 'Surface Plot',
          autosize: true,
          margin: { l: 0, r: 0, b: 0, t: 30 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: '#e5e7eb' },
          scene: {
            xaxis: { gridcolor: '#374151', zerolinecolor: '#6b7280' },
            yaxis: { gridcolor: '#374151', zerolinecolor: '#6b7280' },
            zaxis: { gridcolor: '#374151', zerolinecolor: '#6b7280' },
          }
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        config={{ displayModeBar: false }}
      />
    </div>
  );
}

// ── Vector Field Visual (2D) ───────────────────────────────────────
export function VectorFieldVisual({ visual }) {
    const range = visual.range || [-5, 5];
    const exprUStr = visual.expression_u || 'y';
    const exprVStr = visual.expression_v || '-x';
    
    const steps = 15;
    const xData = [];
    const yData = [];
    const uData = []; // x components
    const vData = []; // y components
    
    try {
        const exprU = math.compile(exprUStr);
        const exprV = math.compile(exprVStr);
        
        for (let i = 0; i <= steps; i++) {
            const y = range[0] + (range[1] - range[0]) * (i / steps);
            for (let j = 0; j <= steps; j++) {
                const x = range[0] + (range[1] - range[0]) * (j / steps);
                
                try {
                    const u = exprU.evaluate({ x, y });
                    const v = exprV.evaluate({ x, y });
                    
                    xData.push(x);
                    yData.push(y);
                    uData.push(u);
                    vData.push(v);
                } catch (e) {}
            }
        }
    } catch (err) {
        console.error("Error evaluating vector field", err);
    }

    return (
        <div className="plotly-container" style={{ width: '100%', height: '400px' }}>
            <Plot
                data={[
                    {
                        type: 'cone',
                        x: xData,
                        y: yData,
                        u: uData,
                        v: vData,
                        sizemode: 'absolute',
                        sizeref: 0.1,
                        colorscale: 'Jet',
                    }
                ]}
                layout={{
                    title: visual.title || 'Vector Field',
                    autosize: true,
                    margin: { l: 40, r: 40, b: 40, t: 40 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { color: '#e5e7eb' },
                    xaxis: { gridcolor: '#374151', zerolinecolor: '#6b7280' },
                    yaxis: { gridcolor: '#374151', zerolinecolor: '#6b7280' },
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
            />
        </div>
    );
}

// ── Scatter Plot (2D or 3D) ────────────────────────────────────────
export function ScatterPlotVisual({ visual }) {
    const dataPoints = visual.data || [];
    const is3D = visual.is_3d || false;
    
    const x = dataPoints.map(d => d.x);
    const y = dataPoints.map(d => d.y);
    const z = dataPoints.map(d => d.z !== undefined ? d.z : 0);
    const text = dataPoints.map(d => d.label || '');
    const markerColors = dataPoints.map(d => d.color || '#6366f1');
    
    return (
        <div className="plotly-container" style={{ width: '100%', height: '400px' }}>
            <Plot
                data={[
                    {
                        x: x,
                        y: y,
                        z: is3D ? z : undefined,
                        text: text,
                        mode: 'markers+text',
                        type: is3D ? 'scatter3d' : 'scatter',
                        marker: { color: markerColors, size: is3D ? 5 : 8 },
                        textposition: 'top center',
                    }
                ]}
                layout={{
                    title: visual.title || 'Scatter Plot',
                    autosize: true,
                    margin: is3D ? { l: 0, r: 0, b: 0, t: 30 } : { l: 40, r: 40, b: 40, t: 40 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { color: '#e5e7eb' },
                    xaxis: { gridcolor: '#374151', zerolinecolor: '#6b7280' },
                    yaxis: { gridcolor: '#374151', zerolinecolor: '#6b7280' },
                    scene: is3D ? {
                        xaxis: { gridcolor: '#374151', zerolinecolor: '#6b7280' },
                        yaxis: { gridcolor: '#374151', zerolinecolor: '#6b7280' },
                        zaxis: { gridcolor: '#374151', zerolinecolor: '#6b7280' },
                    } : undefined
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
            />
        </div>
    );
}
