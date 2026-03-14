/**
 * VisualEngine — Renders math visuals from VISUAL_READY JSON payloads.
 * Supports: graph_function, equation_steps, bar_chart, number_line, geometry_shape.
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceDot, Legend,
  PieChart, Pie
} from 'recharts';

import { RotatingGeometryVisual, CoordinateSystemVisual } from './ThreeVisuals';
import { SurfacePlotVisual, VectorFieldVisual, ScatterPlotVisual } from './PlotlyVisuals';

// ── Generate data points for a math expression ────────────────────
function evaluateExpression(expr, xMin, xMax, steps = 200) {
  const data = [];
  const dx = (xMax - xMin) / steps;

  // Simple expression evaluator — supports basic math ops
  const safeExpr = expr
    .replace(/\^/g, '**')
    .replace(/sin/g, 'Math.sin')
    .replace(/cos/g, 'Math.cos')
    .replace(/tan/g, 'Math.tan')
    .replace(/sqrt/g, 'Math.sqrt')
    .replace(/abs/g, 'Math.abs')
    .replace(/log/g, 'Math.log')
    .replace(/pi/gi, 'Math.PI')
    .replace(/e(?![a-z])/g, 'Math.E');

  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * dx;
    try {
      const y = new Function('x', `return ${safeExpr}`)(x);
      if (isFinite(y)) {
        data.push({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
      }
    } catch {
      // Skip invalid points
    }
  }
  return data;
}

// ── Graph Function Visual ─────────────────────────────────────────
function GraphVisual({ visual }) {
  const xRange = visual.x_range || [-10, 10];
  const functions = visual.functions || [];
  const highlights = visual.highlight_points || [];

  const colors = ['#6366f1', '#f59e0b', '#10b981', '#f87171', '#8b5cf6'];

  // Generate data for all functions
  const datasets = functions.map((fn, i) => ({
    data: evaluateExpression(fn.expression, xRange[0], xRange[1]),
    color: fn.color || colors[i % colors.length],
    label: fn.label || fn.expression,
  }));

  // Combine all data points with unique x values
  const mergedMap = new Map();
  datasets.forEach((ds, i) => {
    ds.data.forEach((point) => {
      if (!mergedMap.has(point.x)) {
        mergedMap.set(point.x, { x: point.x });
      }
      mergedMap.get(point.x)[`y${i}`] = point.y;
    });
  });
  const mergedData = Array.from(mergedMap.values()).sort((a, b) => a.x - b.x);

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={mergedData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
          <XAxis
            dataKey="x"
            stroke="var(--text-muted)"
            fontSize={12}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={12}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
            }}
          />
          <Legend />
          {datasets.map((ds, i) => (
            <Line
              key={i}
              type="monotone"
              dataKey={`y${i}`}
              name={ds.label}
              stroke={ds.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          ))}
          {highlights.map((pt, i) => (
            <ReferenceDot
              key={`hl-${i}`}
              x={pt.x}
              y={pt.y}
              r={6}
              fill={pt.color || '#f59e0b'}
              stroke="white"
              strokeWidth={2}
              label={{
                value: pt.label,
                position: 'top',
                fill: 'var(--text-primary)',
                fontSize: 12,
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Equation Steps Visual ─────────────────────────────────────────
function EquationStepsVisual({ visual }) {
  const steps = visual.steps || [];

  return (
    <div className="equation-steps">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          className="equation-step"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15, duration: 0.3 }}
        >
          <span className="step-number">{i + 1}</span>
          <span className="step-expression">{step.expression}</span>
          {step.annotation && (
            <span className="step-annotation">{step.annotation}</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ── Bar Chart Visual ──────────────────────────────────────────────
function BarChartVisual({ visual }) {
  const chartData = visual.data || [];
  const defaultColors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#34d399'];

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
          <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} />
          <YAxis stroke="var(--text-muted)" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color || defaultColors[i % defaultColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Pie Chart Visual ──────────────────────────────────────────────
function PieChartVisual({ visual }) {
  const chartData = visual.data || [];
  const defaultColors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

  return (
    <div className="chart-container" style={{ display: 'flex', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color || defaultColors[i % defaultColors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Number Line Visual ────────────────────────────────────────────
function NumberLineVisual({ visual }) {
  const range = visual.range || [0, 10];
  const points = visual.points || [];
  const regions = visual.regions || [];
  const width = 600;
  const height = 100;
  const padding = 40;
  const lineY = height / 2;

  const scale = (val) =>
    padding + ((val - range[0]) / (range[1] - range[0])) * (width - 2 * padding);

  const ticks = [];
  const step = (range[1] - range[0]) <= 20 ? 1 : Math.ceil((range[1] - range[0]) / 10);
  for (let v = range[0]; v <= range[1]; v += step) {
    ticks.push(v);
  }

  return (
    <div className="number-line-container">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
        {/* Regions */}
        {regions.map((r, i) => (
          <rect
            key={`region-${i}`}
            x={scale(r.start)}
            y={lineY - 15}
            width={scale(r.end) - scale(r.start)}
            height={30}
            fill={r.color || 'rgba(99, 102, 241, 0.2)'}
            rx={4}
          />
        ))}

        {/* Main line */}
        <line
          x1={padding}
          y1={lineY}
          x2={width - padding}
          y2={lineY}
          stroke="var(--text-muted)"
          strokeWidth={2}
        />

        {/* Arrow heads */}
        <polygon
          points={`${padding - 8},${lineY} ${padding},${lineY - 4} ${padding},${lineY + 4}`}
          fill="var(--text-muted)"
        />
        <polygon
          points={`${width - padding + 8},${lineY} ${width - padding},${lineY - 4} ${width - padding},${lineY + 4}`}
          fill="var(--text-muted)"
        />

        {/* Ticks */}
        {ticks.map((v) => (
          <g key={`tick-${v}`}>
            <line
              x1={scale(v)}
              y1={lineY - 6}
              x2={scale(v)}
              y2={lineY + 6}
              stroke="var(--text-muted)"
              strokeWidth={1.5}
            />
            <text
              x={scale(v)}
              y={lineY + 22}
              textAnchor="middle"
              fill="var(--text-secondary)"
              fontSize={11}
            >
              {v}
            </text>
          </g>
        ))}

        {/* Points */}
        {points.map((pt, i) => (
          <g key={`pt-${i}`}>
            <circle
              cx={scale(pt.value)}
              cy={lineY}
              r={6}
              fill={pt.color || '#6366f1'}
              stroke="white"
              strokeWidth={2}
            />
            <text
              x={scale(pt.value)}
              y={lineY - 14}
              textAnchor="middle"
              fill="var(--text-primary)"
              fontSize={11}
              fontWeight={600}
            >
              {pt.label || pt.value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Geometry Visual (SVG) ─────────────────────────────────────────
function GeometryVisual({ visual }) {
  const shapes = visual.shapes || [];
  const annotations = visual.annotations || [];

  return (
    <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
      <svg width="100%" viewBox="0 0 400 400" style={{ maxWidth: '400px' }}>
        {shapes.map((shape, i) => {
          const color = shape.color || '#6366f1';
          const p = shape.params || {};

          switch (shape.type) {
            case 'circle':
              return (
                <circle
                  key={i}
                  cx={p.cx || 200}
                  cy={p.cy || 200}
                  r={p.r || 80}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                />
              );
            case 'rectangle':
              return (
                <rect
                  key={i}
                  x={p.x || 100}
                  y={p.y || 100}
                  width={p.width || 200}
                  height={p.height || 150}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  rx={4}
                />
              );
            case 'triangle':
              const pts = p.points || '200,100 100,300 300,300';
              return (
                <polygon
                  key={i}
                  points={pts}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                />
              );
            case 'line':
              return (
                <line
                  key={i}
                  x1={p.x1 || 50}
                  y1={p.y1 || 50}
                  x2={p.x2 || 350}
                  y2={p.y2 || 350}
                  stroke={color}
                  strokeWidth={2}
                />
              );
            default:
              return null;
          }
        })}

        {annotations.map((ann, i) => (
          <text
            key={`ann-${i}`}
            x={ann.position?.x || 200}
            y={ann.position?.y || 20}
            textAnchor="middle"
            fill="var(--text-primary)"
            fontSize={13}
          >
            {ann.text}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Main Visual Engine ────────────────────────────────────────────
export default function VisualEngine({ visual, isLoading = false }) {
  return (
    <div className="visual-engine">
      <AnimatePresence mode="wait">
        {!visual && !isLoading ? (
          <motion.div
            key="placeholder"
            className="visual-placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="icon">📊</div>
            <p>Math visuals will appear here during your lesson</p>
            <p style={{ fontSize: '0.8rem', marginTop: '8px', opacity: 0.6 }}>
              The tutor will generate graphs, equations, and diagrams as needed
            </p>
          </motion.div>
        ) : !visual && isLoading ? (
          <motion.div
            key="loading"
            className="visual-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="visual-spinner" />
            <p className="visual-loading-text">Generating visualization…</p>
          </motion.div>
        ) : (
          <motion.div
            key="visual"
            className="visual-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            {visual.title && <h3 className="visual-title">{visual.title}</h3>}

            {console.log('VisualEngine rendering type:', visual.visual_type, visual)}

            {visual.visual_type === 'graph_function' && <GraphVisual visual={visual} />}
            {visual.visual_type === 'equation_steps' && <EquationStepsVisual visual={visual} />}
            {visual.visual_type === 'bar_chart' && <BarChartVisual visual={visual} />}
            {visual.visual_type === 'pie_chart' && <PieChartVisual visual={visual} />}
            {visual.visual_type === 'number_line' && <NumberLineVisual visual={visual} />}
            {visual.visual_type === 'geometry_shape' && <GeometryVisual visual={visual} />}
            {visual.visual_type === 'scatter_plot' && <ScatterPlotVisual visual={visual} />}
            
            {/* 3D and Advanced Vis */}
            {visual.visual_type === 'rotating_geometry' && <RotatingGeometryVisual visual={visual} />}
            {visual.visual_type === 'coordinate_system' && <CoordinateSystemVisual visual={visual} />}
            {visual.visual_type === 'surface_plot' && <SurfacePlotVisual visual={visual} />}
            {visual.visual_type === 'vector_field' && <VectorFieldVisual visual={visual} />}

            {visual.error && (
              <p style={{ color: 'var(--color-error)', textAlign: 'center' }}>
                ⚠️ {visual.error}
              </p>
            )}

            {/* Overlay spinner when updating an existing visual */}
            {isLoading && (
              <motion.div
                className="visual-loading-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="visual-spinner visual-spinner--sm" />
                <span>Updating…</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

