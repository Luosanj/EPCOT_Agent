import React, { useState } from 'react';

const ArchitectureDiagram = () => {
  const [activeLayer, setActiveLayer] = useState(null);
  const [hoveredComponent, setHoveredComponent] = useState(null);

  const componentDetails = {
    browser: {
      title: 'User Browser',
      description: 'Researchers interact with the platform through a web interface',
      tech: 'Modern browsers (Chrome, Firefox, Safari)',
      color: '#4A5568'
    },
    frontend: {
      title: 'React Frontend',
      description: 'TypeScript application with chat interface, result cards, and visualization panels',
      tech: 'React • TypeScript • TailwindCSS • Vercel',
      color: '#3182CE'
    },
    parlant: {
      title: 'Parlant Agent',
      description: 'Intent detection, tool orchestration, and natural language interaction',
      tech: 'Parlant Framework • AWS EC2 m7i.large',
      color: '#805AD5'
    },
    llm: {
      title: 'LLM Layer',
      description: 'Interpretation and explanation only — never sees raw genomic data',
      tech: 'LLaMA 3 (primary) • OpenAI API (fallback)',
      color: '#D53F8C'
    },
    fastapi: {
      title: 'FastAPI Backend',
      description: 'Validation, job submission, status polling, and result packaging',
      tech: 'FastAPI • Python • AWS EC2 m7i.xlarge',
      color: '#38A169'
    },
    sqs: {
      title: 'Job Queue',
      description: 'Async job handling to avoid timeouts and maximize GPU utilization',
      tech: 'AWS SQS',
      color: '#DD6B20'
    },
    hpc: {
      title: 'Lighthouse HPC',
      description: 'GPU-accelerated genomic inference using EPCOT framework',
      tech: 'Slurm • V100 / L40 / L40S / H100',
      color: '#E53E3E'
    },
    postgres: {
      title: 'PostgreSQL',
      description: 'Chat sessions, query metadata, evaluation runs, provenance tracking',
      tech: 'AWS RDS db.m7g.large',
      color: '#2B6CB0'
    },
    s3: {
      title: 'Object Storage',
      description: 'Exports, reports, web-safe artifacts, and logs',
      tech: 'AWS S3',
      color: '#C05621'
    },
    labstorage: {
      title: 'Lab Storage',
      description: 'Active working data, long-term project files, archival backups',
      tech: 'Turbo • projectup/ • Data Den',
      color: '#744210'
    }
  };

  const Component = ({ id, x, y, width, height, label, sublabel }) => {
    const details = componentDetails[id];
    const isHovered = hoveredComponent === id;
    
    return (
      <g
        onMouseEnter={() => setHoveredComponent(id)}
        onMouseLeave={() => setHoveredComponent(null)}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx="8"
          fill={isHovered ? details.color : `${details.color}E6`}
          stroke={isHovered ? '#FFF' : details.color}
          strokeWidth={isHovered ? 3 : 2}
          style={{
            transition: 'all 0.2s ease',
            filter: isHovered ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' : 'none'
          }}
        />
        <text
          x={x + width / 2}
          y={y + height / 2 - (sublabel ? 6 : 0)}
          textAnchor="middle"
          fill="white"
          fontSize="13"
          fontWeight="600"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {label}
        </text>
        {sublabel && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize="10"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {sublabel}
          </text>
        )}
      </g>
    );
  };

  const Arrow = ({ x1, y1, x2, y2, dashed = false }) => (
    <g>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#718096" />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#718096"
        strokeWidth="2"
        strokeDasharray={dashed ? "5,5" : "none"}
        markerEnd="url(#arrowhead)"
      />
    </g>
  );

  const BidirectionalArrow = ({ x1, y1, x2, y2 }) => (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#718096"
        strokeWidth="2"
      />
      <polygon
        points={`${x2-5},${y2-5} ${x2+5},${y2} ${x2-5},${y2+5}`}
        fill="#718096"
      />
      <polygon
        points={`${x1+5},${y1-5} ${x1-5},${y1} ${x1+5},${y1+5}`}
        fill="#718096"
      />
    </g>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            🧬 Genomic Foundation Model Platform
          </h1>
          <p className="text-slate-400 text-sm">
            System Architecture — Phase 0 Planning
          </p>
        </div>

        {/* Main Diagram */}
        <div className="bg-slate-800/50 rounded-2xl p-6 backdrop-blur border border-slate-700/50 mb-6">
          <svg viewBox="0 0 800 600" className="w-full h-auto">
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Layer Labels */}
            <text x="20" y="45" fill="#94A3B8" fontSize="11" fontWeight="500" fontFamily="system-ui">PRESENTATION</text>
            <text x="20" y="165" fill="#94A3B8" fontSize="11" fontWeight="500" fontFamily="system-ui">AGENT LAYER</text>
            <text x="20" y="295" fill="#94A3B8" fontSize="11" fontWeight="500" fontFamily="system-ui">ORCHESTRATION</text>
            <text x="20" y="425" fill="#94A3B8" fontSize="11" fontWeight="500" fontFamily="system-ui">COMPUTE</text>
            <text x="20" y="545" fill="#94A3B8" fontSize="11" fontWeight="500" fontFamily="system-ui">STORAGE</text>

            {/* Layer dividers */}
            <line x1="0" y1="80" x2="800" y2="80" stroke="#475569" strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
            <line x1="0" y1="200" x2="800" y2="200" stroke="#475569" strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
            <line x1="0" y1="330" x2="800" y2="330" stroke="#475569" strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
            <line x1="0" y1="460" x2="800" y2="460" stroke="#475569" strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>

            {/* Components */}
            {/* Presentation Layer */}
            <Component id="browser" x={300} y={20} width={200} height={50} label="User Browser" />
            
            {/* Frontend */}
            <Component id="frontend" x={300} y={100} width={200} height={50} label="React Frontend" sublabel="Vercel" />

            {/* Agent Layer */}
            <Component id="parlant" x={300} y={220} width={200} height={50} label="Parlant Agent" sublabel="EC2 CPU" />
            <Component id="llm" x={560} y={220} width={160} height={50} label="LLM" sublabel="LLaMA 3 / OpenAI" />

            {/* Orchestration Layer */}
            <Component id="fastapi" x={300} y={350} width={200} height={50} label="FastAPI Backend" sublabel="EC2 CPU" />
            <Component id="sqs" x={560} y={350} width={160} height={50} label="AWS SQS" sublabel="Job Queue" />

            {/* Compute Layer */}
            <Component id="hpc" x={300} y={480} width={200} height={50} label="Lighthouse HPC" sublabel="GPU Inference" />

            {/* Storage Layer */}
            <Component id="postgres" x={120} y={550} width={150} height={40} label="PostgreSQL" sublabel="RDS" />
            <Component id="s3" x={320} y={550} width={150} height={40} label="S3" sublabel="Exports/Logs" />
            <Component id="labstorage" x={520} y={550} width={150} height={40} label="Lab Storage" sublabel="Turbo/Data Den" />

            {/* Arrows - Main Flow */}
            <Arrow x1={400} y1={70} x2={400} y2={98} />
            <Arrow x1={400} y1={150} x2={400} y2={218} />
            <Arrow x1={400} y1={270} x2={400} y2={348} />
            <Arrow x1={400} y1={400} x2={400} y2={478} />

            {/* Parlant to LLM */}
            <Arrow x1={500} y1={245} x2={558} y2={245} />
            <Arrow x1={558} y1={255} x2={500} y2={255} dashed={true} />

            {/* FastAPI to SQS */}
            <Arrow x1={500} y1={375} x2={558} y2={375} />

            {/* SQS to HPC */}
            <Arrow x1={640} y1={400} x2={640} y2={440} />
            <line x1={640} y1={440} x2={500} y2={440} stroke="#718096" strokeWidth="2" />
            <Arrow x1={500} y1={440} x2={500} y2={478} />

            {/* Storage connections */}
            <Arrow x1={350} y1={530} x2={195} y2={548} dashed={true} />
            <Arrow x1={400} y1={530} x2={395} y2={548} dashed={true} />
            <Arrow x1={450} y1={530} x2={595} y2={548} dashed={true} />

            {/* Security Badge */}
            <g transform="translate(650, 100)">
              <rect x="0" y="0" width="130" height="80" rx="8" fill="#1E293B" stroke="#EF4444" strokeWidth="2" strokeDasharray="4,2"/>
              <text x="65" y="20" textAnchor="middle" fill="#EF4444" fontSize="10" fontWeight="600">🔒 AI BOUNDARY</text>
              <text x="65" y="38" textAnchor="middle" fill="#94A3B8" fontSize="9">No raw sequences</text>
              <text x="65" y="52" textAnchor="middle" fill="#94A3B8" fontSize="9">No matrices</text>
              <text x="65" y="66" textAnchor="middle" fill="#94A3B8" fontSize="9">Summaries only</text>
            </g>

            {/* Data flow legend */}
            <g transform="translate(50, 480)">
              <rect x="0" y="0" width="120" height="70" rx="6" fill="#1E293B" stroke="#475569"/>
              <text x="60" y="18" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="500">Data Flow</text>
              <line x1="15" y1="35" x2="45" y2="35" stroke="#718096" strokeWidth="2" markerEnd="url(#arrowhead)"/>
              <text x="55" y="38" fill="#94A3B8" fontSize="9">Request</text>
              <line x1="15" y1="55" x2="45" y2="55" stroke="#718096" strokeWidth="2" strokeDasharray="5,5"/>
              <text x="55" y="58" fill="#94A3B8" fontSize="9">Response</text>
            </g>
          </svg>
        </div>

        {/* Component Details Panel */}
        {hoveredComponent && (
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/50 backdrop-blur animate-fade-in">
            <div className="flex items-start gap-4">
              <div 
                className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: componentDetails[hoveredComponent].color }}
              />
              <div>
                <h3 className="text-white font-semibold text-lg">
                  {componentDetails[hoveredComponent].title}
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  {componentDetails[hoveredComponent].description}
                </p>
                <p className="text-slate-500 text-xs mt-2 font-mono">
                  {componentDetails[hoveredComponent].tech}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Reference Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
              <span className="text-lg">✓</span> MVP Tasks
            </h3>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• EFP — Epigenomic Feature Prediction</li>
              <li>• GEP — Gene Expression Prediction</li>
              <li>• EAP — Enhancer Activity Prediction</li>
            </ul>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
              <span className="text-lg">✗</span> AI Never Sees
            </h3>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• Raw DNA sequences</li>
              <li>• Contact matrices</li>
              <li>• Patient-level data</li>
            </ul>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
              <span className="text-lg">⟳</span> Every Response Has
            </h3>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• Confidence metrics</li>
              <li>• Known limitations</li>
              <li>• Model provenance</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 text-xs">
          Phase 0 — Planning Document • Hover over components for details
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ArchitectureDiagram;
