import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Line } from '@react-three/drei';

function CoordinateAxes() {
  return (
    <group>
      {/* X Axis - Red */}
      <Line points={[[-10, 0, 0], [10, 0, 0]]} color="red" lineWidth={2} />
      <Text position={[10.5, 0, 0]} color="red" fontSize={0.5}>X</Text>
      
      {/* Y Axis - Green */}
      <Line points={[[0, -10, 0], [0, 10, 0]]} color="green" lineWidth={2} />
      <Text position={[0, 10.5, 0]} color="green" fontSize={0.5}>Y</Text>
      
      {/* Z Axis - Blue */}
      <Line points={[[0, 0, -10], [0, 0, 10]]} color="blue" lineWidth={2} />
      <Text position={[0, 0, 10.5]} color="blue" fontSize={0.5}>Z</Text>
    </group>
  );
}

function RotatingShape({ geometryType, color, wireframe }) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  const getGeometry = () => {
    switch (geometryType) {
      case 'cube': return <boxGeometry args={[4, 4, 4]} />;
      case 'sphere': return <sphereGeometry args={[3, 32, 32]} />;
      case 'pyramid': return <coneGeometry args={[3, 4, 4]} />;
      case 'cylinder': return <cylinderGeometry args={[2, 2, 5, 32]} />;
      case 'torus': return <torusGeometry args={[2, 0.8, 16, 100]} />;
      case 'cone': return <coneGeometry args={[3, 5, 32]} />;
      case 'dodecahedron': return <dodecahedronGeometry args={[3]} />;
      case 'icosahedron': return <icosahedronGeometry args={[3]} />;
      default: return <boxGeometry args={[4, 4, 4]} />;
    }
  };

  return (
    <mesh ref={meshRef}>
      {getGeometry()}
      <meshStandardMaterial color={color || '#6366f1'} wireframe={wireframe} />
    </mesh>
  );
}

// ── 3D Rotating Geometry Visual ─────────────────────────────────────
export function RotatingGeometryVisual({ visual }) {
  return (
    <div className="three-ds-container" style={{ width: '100%', height: '400px', background: '#111827', borderRadius: '8px', overflow: 'hidden' }}>
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls makeDefault enableZoom autoRotate autoRotateSpeed={0.5} />
        <RotatingShape 
          geometryType={visual.geometry_type} 
          color={visual.color} 
          wireframe={visual.wireframe} 
        />
      </Canvas>
    </div>
  );
}

// ── 3D Coordinate System Visual ─────────────────────────────────────
export function CoordinateSystemVisual({ visual }) {
  return (
    <div className="three-ds-container" style={{ width: '100%', height: '400px', background: '#111827', borderRadius: '8px', overflow: 'hidden' }}>
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        <ambientLight intensity={1} />
        <OrbitControls makeDefault enableZoom />
        
        {/* XY, XZ, YZ grids mapping out the planes */}
        <Grid position={[0, -0.01, 0]} args={[20, 20]} cellSize={1} cellThickness={0.5} cellColor="#6b7280" sectionSize={5} sectionThickness={1} sectionColor="#9ca3af" fadeDistance={30} />
        <Grid rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.01]} args={[20, 20]} cellSize={1} cellThickness={0.5} cellColor="#6b7280" fadeDistance={30} fadeStrength={1} />
        
        <CoordinateAxes />
      </Canvas>
    </div>
  );
}
