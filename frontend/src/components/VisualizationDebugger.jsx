import React, { useState } from 'react';
import VisualEngine from './VisualEngine';

const VISUAL_TYPES = [
  'graph_function',
  'geometry_shape',
  'number_line',
  'equation_steps',
  'bar_chart',
];

export default function VisualizationDebugger() {
  const [visualType, setVisualType] = useState(VISUAL_TYPES[0]);
  const [concept, setConcept] = useState('');
  const [parameters, setParameters] = useState('{}');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsedParams = JSON.parse(parameters);
      const response = await fetch('http://localhost:9000/api/debug-visual/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visual_type: visualType,
          concept,
          parameters: parsedParams,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate visualization');
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="debug-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-primary)' }}>Visualization Agent Debugger</h1>
        <p style={{ color: 'var(--text-muted)' }}>Test the visualization agent in isolation.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <section className="debug-form" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Visual Type</label>
            <select 
              value={visualType} 
              onChange={(e) => setVisualType(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              {VISUAL_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Concept</label>
            <input 
              type="text" 
              value={concept} 
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g., plot y = x^2"
              style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Parameters (JSON)</label>
            <textarea 
              value={parameters} 
              onChange={(e) => setParameters(e.target.value)}
              rows={5}
              style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
            />
          </div>

          <button 
            onClick={handleGenerate} 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              borderRadius: 'var(--radius-sm)', 
              background: 'var(--color-primary)', 
              color: 'white', 
              border: 'none', 
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Generating...' : 'Generate Visualization'}
          </button>

          {error && (
            <div style={{ marginTop: '1rem', color: 'var(--color-error)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-error)' }}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </section>

        <section className="debug-preview">
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Preview</h2>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VisualEngine visual={result} />
            </div>
          </div>

          {result && (
            <div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Raw JSON</h2>
              <pre style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', maxHeight: '300px', overflow: 'auto', fontSize: '0.8rem' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
