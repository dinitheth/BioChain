import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { 
  PlayIcon, 
  PauseIcon, 
  CubeIcon, 
  ZoomInIcon, 
  ZoomOutIcon, 
  RefreshIcon, 
  SwatchIcon,
  LinkIcon,
  HandIcon,
  ArrowsRightLeftIcon,
  CameraIcon
} from './Icons';

type BgColor = 'dark' | 'midnight' | 'light';
type InteractionMode = 'rotate' | 'pan';

export const MoleculeViewer: React.FC = () => {
  const [viewMode, setViewMode] = useState<'ribbon' | 'surface' | 'ball-stick'>('ribbon');
  const [isRotating, setIsRotating] = useState(true);
  
  // Transform State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // Rotation now tracks X (pitch) and Y (yaw) axes
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [bgMode, setBgMode] = useState<BgColor>('midnight');
  
  // Interaction State
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('rotate');
  const [showHBonds, setShowHBonds] = useState(false);

  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Background Styles
  const bgStyles: Record<BgColor, string> = {
    midnight: 'bg-gradient-to-b from-black to-science-950',
    dark: 'bg-[#0b0c10]',
    light: 'bg-[#e2e8f0]',
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation({ x: 0, y: 0 });
    setIsRotating(true);
    setShowHBonds(false);
    setInteractionMode('rotate');
  };

  const toggleBackground = () => {
    const modes: BgColor[] = ['midnight', 'dark', 'light'];
    const nextIndex = (modes.indexOf(bgMode) + 1) % modes.length;
    setBgMode(modes[nextIndex]);
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    // Pause auto-rotation immediately when user interacts
    if (isRotating) setIsRotating(false);
    
    dragStartRef.current = { 
        x: e.clientX, 
        y: e.clientY
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    e.preventDefault();

    if (interactionMode === 'pan') {
        setPan(prev => ({
            x: prev.x + e.movementX,
            y: prev.y + e.movementY
        }));
    } else {
        // Rotate: Update both X and Y axes
        // X axis rotation corresponds to vertical mouse movement (inverted for natural feel)
        // Y axis rotation corresponds to horizontal mouse movement
        const sensitivity = 0.5;
        setRotation(prev => ({
            x: Math.max(Math.min(prev.x - e.movementY * sensitivity, 90), -90), // Clamp X to avoid gimbal lock confusion
            y: (prev.y + e.movementX * sensitivity) % 360
        }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Wheel Handler for Zoom
  const handleWheel = (e: React.WheelEvent) => {
    // Prevent default scroll behavior if inside component
    if (Math.abs(e.deltaY) > 0) {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
    }
  };

  // Auto Rotation Effect
  useEffect(() => {
    let animationFrame: number;
    if (isRotating) {
        const animate = () => {
            // Only auto-rotate Y axis for a turntable effect
            setRotation(prev => ({ ...prev, y: (prev.y + 0.2) % 360 }));
            animationFrame = requestAnimationFrame(animate);
        };
        animationFrame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isRotating]);

  const handleSnapshot = async () => {
    if (!containerRef.current) return;
    
    try {
        const canvas = await html2canvas(containerRef.current, {
            useCORS: true,
            scale: 2,
            backgroundColor: null
        });
        const link = document.createElement('a');
        link.download = `molecule-view-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        console.error("Snapshot failed", e);
    }
  };

  return (
    <div 
        ref={containerRef}
        className={`relative w-full h-[400px] rounded-xl overflow-hidden border border-white/10 group shadow-2xl transition-colors duration-500 ${bgStyles[bgMode]}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : (interactionMode === 'pan' ? 'grab' : 'all-scroll') }}
    >
      {/* 3D Content Layer */}
      <div 
        className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
        style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
        }}
      >
          {/* Simulated Molecule Container with 3D Transform */}
          <div 
            className="relative w-full h-full"
            style={{ 
                transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                transformStyle: 'preserve-3d'
            }}
          >
             <img 
                src="https://picsum.photos/800/400?grayscale&blur=2" 
                alt="Molecular Structure" 
                className={`w-full h-full object-cover mix-blend-screen pointer-events-none ${bgMode === 'light' ? 'invert opacity-80' : 'opacity-40'}`}
                draggable={false}
                style={{ backfaceVisibility: 'hidden' }}
             />
             
             {/* Core Molecule Placeholder (Simulating the 3D Object center) */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
                <div className={`relative w-64 h-64 border rounded-full ${bgMode === 'light' ? 'border-slate-400/20' : 'border-science-500/20'}`} style={{ transform: 'translateZ(0)' }}>
                    
                    {/* SVG Layer for Bonds (Behind Atoms) */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ transform: 'translateZ(0)' }}>
                        {/* Standard Covalent Bonds (Structure backbone) */}
                        <line x1="33%" y1="25%" x2="50%" y2="50%" stroke={bgMode === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.2)'} strokeWidth="2" />
                        <line x1="75%" y1="66%" x2="50%" y2="50%" stroke={bgMode === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.2)'} strokeWidth="2" />

                        {/* Hydrogen Bond Visuals */}
                        {showHBonds && (
                            <>
                                {/* Covalent N-H Bond */}
                                <line 
                                    x1="75%" y1="66%" x2="60%" y2="55%" 
                                    stroke={bgMode === 'light' ? '#94a3b8' : 'rgba(255,255,255,0.4)'} 
                                    strokeWidth="1.5"
                                />
                                {/* Hydrogen Bond H...O (Dashed & Highlighted) */}
                                <line 
                                    x1="60%" y1="55%" x2="33%" y2="29%" 
                                    stroke="#facc15" 
                                    strokeWidth="3" 
                                    strokeDasharray="6,4"
                                    strokeLinecap="round"
                                    className="animate-pulse drop-shadow-[0_0_5px_rgba(250,204,21,0.6)]"
                                />
                            </>
                        )}
                    </svg>

                    {/* Simulated atoms */}
                    
                    {/* Oxygen (Red) - Acceptor */}
                    <div 
                        className={`absolute top-1/4 left-1/4 w-8 h-8 bg-red-500 rounded-full shadow-lg opacity-80 transition-all duration-300 ${showHBonds ? 'ring-4 ring-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.6)] scale-110 z-10' : ''}`}
                        style={{ transform: 'translateZ(20px)' }}
                    ></div>
                    
                    {/* Nitrogen (Blue) - Donor */}
                    <div 
                        className={`absolute bottom-1/3 right-1/4 w-10 h-10 bg-blue-500 rounded-full shadow-lg opacity-80 transition-all duration-300 ${showHBonds ? 'ring-4 ring-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.6)] scale-110 z-10' : ''}`}
                        style={{ transform: 'translateZ(-20px)' }}
                    ></div>
                    
                    {/* Carbon (Slate) - Neutral */}
                    <div 
                        className="absolute top-1/2 left-1/2 w-12 h-12 bg-slate-400 rounded-full shadow-lg -translate-x-1/2 -translate-y-1/2 opacity-90"
                        style={{ transform: 'translateZ(10px)' }}
                    ></div>

                    {/* Hydrogen (White) - Attached to Nitrogen (Visible only when H-Bonds shown) */}
                    <div 
                        className={`absolute w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${showHBonds ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-0'}`}
                        style={{ 
                            top: '55%', 
                            left: '60%',
                            transform: 'translate(-50%, -50%) translateZ(-10px)' 
                        }}
                    ></div>

                    {/* H-Bond Label (Conditional) */}
                    {showHBonds && (
                         <div 
                            className="absolute bg-black/80 backdrop-blur px-2 py-1 rounded border border-yellow-400/50 text-[10px] font-mono text-yellow-400 shadow-xl z-20" 
                            style={{ 
                                top: '40%', 
                                left: '46%', 
                                transform: 'translate(-50%, -50%) translateZ(30px)'
                            }}
                        >
                             2.8 Å
                         </div>
                    )}
                </div>
             </div>
          </div>
      </div>
      
      {/* Info Overlay (Static relative to screen) */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="flex items-center gap-2">
            <div className={`p-2 backdrop-blur-md rounded-lg border ${bgMode === 'light' ? 'bg-white/50 border-slate-300 text-slate-700' : 'bg-white/5 border-white/10 text-science-400'}`}>
                <CubeIcon className="w-5 h-5" />
            </div>
            <div>
                <h3 className={`text-xs font-bold tracking-wider uppercase ${bgMode === 'light' ? 'text-slate-700' : 'text-white'}`}>Interactive View</h3>
                <p className={`text-[10px] font-mono ${bgMode === 'light' ? 'text-slate-500' : 'text-science-300'}`}>
                    Zoom: {Math.round(zoom * 100)}% | {interactionMode === 'rotate' ? 'Rotation' : 'Pan'} Mode
                </p>
            </div>
        </div>
      </div>

      {/* View Mode Controls */}
      <div className="absolute bottom-4 left-4 flex gap-1 pointer-events-auto">
        <div className={`flex gap-1 backdrop-blur-md p-1 rounded-lg border ${bgMode === 'light' ? 'bg-white/60 border-slate-300' : 'bg-black/60 border-white/10'}`}>
          {(['ribbon', 'surface', 'ball-stick'] as const).map((mode) => (
             <button 
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider rounded transition-colors ${
                    viewMode === mode 
                    ? 'bg-science-600 text-white' 
                    : (bgMode === 'light' ? 'text-slate-500 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/5')
                }`}
            >
                {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Main Controls Toolbar (Right Side) */}
      <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-auto">
        
        {/* Play/Pause Rotation */}
        <button 
             onClick={() => setIsRotating(!isRotating)}
             className="p-2 bg-science-600 text-white rounded-lg hover:bg-science-500 transition-colors shadow-lg"
             title={isRotating ? "Pause Rotation" : "Auto Rotate"}
        >
             {isRotating ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
        </button>

        {/* Tools Group */}
        <div className={`flex items-center gap-1 p-1 rounded-lg border backdrop-blur-md shadow-lg ${bgMode === 'light' ? 'bg-white/60 border-slate-300' : 'bg-black/60 border-white/10'}`}>
            {/* Mode Switchers */}
            <button 
                onClick={() => setInteractionMode('rotate')}
                className={`p-1.5 rounded-md transition-colors ${
                    interactionMode === 'rotate'
                    ? (bgMode === 'light' ? 'bg-slate-200 text-slate-900' : 'bg-white/20 text-white')
                    : (bgMode === 'light' ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 hover:bg-white/10 hover:text-white')
                }`}
                title="Rotate Mode"
            >
                <ArrowsRightLeftIcon className="w-4 h-4" />
            </button>
            <button 
                onClick={() => setInteractionMode('pan')}
                className={`p-1.5 rounded-md transition-colors ${
                    interactionMode === 'pan'
                    ? (bgMode === 'light' ? 'bg-slate-200 text-slate-900' : 'bg-white/20 text-white')
                    : (bgMode === 'light' ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 hover:bg-white/10 hover:text-white')
                }`}
                title="Pan Mode"
            >
                <HandIcon className="w-4 h-4" />
            </button>
            
            <div className={`w-px h-4 mx-1 ${bgMode === 'light' ? 'bg-slate-300' : 'bg-white/10'}`}></div>

            <button 
                onClick={handleZoomIn}
                className={`p-1.5 rounded-md transition-colors ${bgMode === 'light' ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                title="Zoom In"
            >
                <ZoomInIcon className="w-4 h-4" />
            </button>
            <button 
                onClick={handleZoomOut}
                className={`p-1.5 rounded-md transition-colors ${bgMode === 'light' ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                title="Zoom Out"
            >
                <ZoomOutIcon className="w-4 h-4" />
            </button>
            
            <div className={`w-px h-4 mx-1 ${bgMode === 'light' ? 'bg-slate-300' : 'bg-white/10'}`}></div>

            <button 
                onClick={() => setShowHBonds(!showHBonds)}
                className={`p-1.5 rounded-md transition-colors ${
                    showHBonds 
                    ? 'bg-yellow-500/20 text-yellow-400' 
                    : (bgMode === 'light' ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 hover:bg-white/10 hover:text-white')
                }`}
                title="Toggle Hydrogen Bonds"
            >
                <LinkIcon className="w-4 h-4" />
            </button>

            <button 
                onClick={toggleBackground}
                className={`p-1.5 rounded-md transition-colors ${bgMode === 'light' ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                title="Switch Background"
            >
                <SwatchIcon className="w-4 h-4" />
            </button>

            <button 
                onClick={handleSnapshot}
                className={`p-1.5 rounded-md transition-colors ${bgMode === 'light' ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                title="Save Snapshot"
            >
                <CameraIcon className="w-4 h-4" />
            </button>
            
            <div className={`w-px h-4 mx-1 ${bgMode === 'light' ? 'bg-slate-300' : 'bg-white/10'}`}></div>

            <button 
                onClick={handleReset}
                className={`p-1.5 rounded-md transition-colors ${bgMode === 'light' ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                title="Reset View"
            >
                <RefreshIcon className="w-4 h-4" />
            </button>
        </div>
      </div>
      
      {/* Legend overlay */}
      <div className={`absolute top-4 right-4 backdrop-blur-md px-4 py-3 rounded-lg border shadow-lg ${bgMode === 'light' ? 'bg-white/60 border-slate-300' : 'bg-black/60 border-white/10'}`}>
          <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
              <span className={`text-[10px] font-medium uppercase tracking-wide ${bgMode === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Oxygen</span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              <span className={`text-[10px] font-medium uppercase tracking-wide ${bgMode === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Nitrogen</span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.5)]"></div>
              <span className={`text-[10px] font-medium uppercase tracking-wide ${bgMode === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Carbon</span>
          </div>
          {showHBonds && (
            <div className="flex items-center gap-2 pt-1 border-t border-white/10 mt-1">
                <div className="w-4 h-0.5 border-b border-dashed border-yellow-400"></div>
                <span className="text-[10px] font-medium uppercase tracking-wide text-yellow-400">H-Bond</span>
            </div>
          )}
      </div>
    </div>
  );
};