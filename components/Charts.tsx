import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { MoleculeStats } from '../types';

interface ChartsProps {
  stats: MoleculeStats;
}

export const Charts: React.FC<ChartsProps> = ({ stats }) => {
  const barData = [
    { name: 'Docking Score', value: Math.abs(stats.dockingScore), fill: '#3b82f6' },
    { name: 'Binding Eff.', value: stats.bindingEfficiency * 10, fill: '#06b6d4' },
    { name: 'H-Donors', value: stats.hBondDonors, fill: '#8b5cf6' },
    { name: 'H-Acceptors', value: stats.hBondAcceptors, fill: '#ec4899' },
  ];

  const radarData = [
    { subject: 'Affinity', A: Math.abs(stats.dockingScore) * 10, fullMark: 150 },
    { subject: 'Solubility', A: 98, fullMark: 150 },
    { subject: 'Toxicity', A: 40, fullMark: 150 }, // Simulated
    { subject: 'Synthesizability', A: 85, fullMark: 150 }, // Simulated
    { subject: 'Stability', A: 110, fullMark: 150 }, // Simulated
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-64 bg-science-900/50 rounded-lg p-2 border border-science-700/30">
        <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider text-center">Key Metrics Analysis</h4>
        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={200}>
          <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" fontSize={10} />
            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={80} />
            <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
                itemStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="h-64 bg-science-900/50 rounded-lg p-2 border border-science-700/30 flex flex-col items-center">
        <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">ADMET Properties (Predicted)</h4>
        <ResponsiveContainer width="100%" height="90%" minHeight={200} minWidth={200}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
            <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#475569" fontSize={8} />
            <Radar name="Compound" dataKey="A" stroke="#14F195" fill="#14F195" fillOpacity={0.3} />
            <Tooltip 
                 contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};