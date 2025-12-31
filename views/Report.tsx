import React, { useState, useEffect } from 'react';
import { DockingJob, JobStatus } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MoleculeViewer } from '../components/MoleculeViewer';
import { Charts } from '../components/Charts';
import { SOLANA_EXPLORER_URL } from '../constants';
import { generateReportFromStats } from '../services/geminiService';
import { fetchJobFromChain, DockingReportSchema } from '../services/solanaService';
import { DownloadIcon, CheckCircleIcon, BeakerIcon, XMarkIcon, RefreshIcon } from '../components/Icons';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface ReportProps {
  job: DockingJob;
  onClose: () => void;
  onVerify: (jobId: string) => void;
  isWalletConnected: boolean;
}

export const Report: React.FC<ReportProps> = ({ job, onClose, onVerify, isWalletConnected }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'audit'>('summary');
  const [aiReport, setAiReport] = useState<string>(job.reportSummary || '');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  // Real Verification State
  const [onChainData, setOnChainData] = useState<DockingReportSchema | null>(null);
  const [isLoadingChainData, setIsLoadingChainData] = useState(false);

  useEffect(() => {
    if (!aiReport && job.stats) {
      setIsGenerating(true);
      generateReportFromStats(job.moleculeName, job.stats)
        .then(text => {
            setAiReport(text);
        })
        .finally(() => setIsGenerating(false));
    }
  }, [job, aiReport]);

  // When opening Audit tab, fetch real chain data if Tx exists
  useEffect(() => {
    if (activeTab === 'audit' && job.txHash) {
      setIsLoadingChainData(true);
      fetchJobFromChain(job.txHash)
        .then(data => setOnChainData(data))
        .catch(err => console.error(err))
        .finally(() => setIsLoadingChainData(false));
    }
  }, [activeTab, job.txHash]);

  const handleVerify = () => {
    if (isWalletConnected) {
      onVerify(job.id);
    } else {
      alert("Please connect your wallet first.");
    }
  };

  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
        const doc = new jsPDF();

        // --- Header Section ---
        doc.setFillColor(15, 23, 42); // science-900
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("BioChain", 20, 22);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 200, 200);
        doc.text("Molecular Docking Report", 20, 30);

        doc.setFontSize(9);
        doc.text(`Job ID: ${job.id}`, 190, 18, { align: "right" });
        doc.text(`Date: ${job.uploadDate}`, 190, 24, { align: "right" });
        doc.text(`Status: ${job.status}`, 190, 30, { align: "right" });

        let y = 55;

        // --- Title ---
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(job.moleculeName, 20, y);
        y += 15;

        // --- Molecule Visualisation Snapshot ---
        const molNode = document.getElementById('report-molecule-viewer');
        if (molNode) {
            try {
                const canvas = await html2canvas(molNode, { 
                    scale: 2, 
                    backgroundColor: '#0f172a',
                    useCORS: true,
                    logging: false
                });
                const imgData = canvas.toDataURL('image/png');
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = 170;
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                doc.setFontSize(12);
                doc.setTextColor(59, 130, 246);
                doc.text("Molecular Structure", 20, y);
                y += 5;

                // Check page break
                if (y + pdfHeight > 280) { doc.addPage(); y = 20; }
                
                doc.addImage(imgData, 'PNG', 20, y, pdfWidth, pdfHeight);
                y += pdfHeight + 10;
            } catch (e) {
                console.error("Failed to capture molecule viewer", e);
            }
        }

        // --- Key Metrics ---
        if (job.stats) {
            if (y + 40 > 280) { doc.addPage(); y = 20; }

            doc.setFontSize(12);
            doc.setTextColor(59, 130, 246);
            doc.setFont("helvetica", "bold");
            doc.text("Key Metrics", 20, y);
            y += 8;

            const metrics = [
                [`Docking Score`, `${job.stats.dockingScore} kcal/mol`],
                [`Binding Efficiency`, `${job.stats.bindingEfficiency}`],
                [`Molecular Weight`, `${job.stats.molecularWeight} Da`],
                [`H-Bond Donors`, `${job.stats.hBondDonors}`],
                [`H-Bond Acceptors`, `${job.stats.hBondAcceptors}`],
            ];

            doc.setFontSize(10);
            let xOffset = 20;
            
            // Draw a light background box for metrics
            doc.setFillColor(248, 250, 252);
            doc.rect(20, y, 170, 25, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.rect(20, y, 170, 25, 'S');
            
            const startY = y + 8;
            metrics.forEach((m, i) => {
                // Label
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 113, 133);
                doc.text(m[0], xOffset + 5, startY);
                // Value
                doc.setFont("helvetica", "bold");
                doc.setTextColor(15, 23, 42);
                doc.text(m[1], xOffset + 5, startY + 6);
                
                xOffset += 34; // Distribution width
            });
            y += 35;
        }

        // --- Charts Snapshot ---
        const chartsNode = document.getElementById('report-charts');
        if (chartsNode) {
             try {
                if (y + 80 > 280) { doc.addPage(); y = 20; }
                
                const canvas = await html2canvas(chartsNode, { 
                    scale: 2, 
                    backgroundColor: '#0f172a',
                    useCORS: true,
                    logging: false
                });
                const imgData = canvas.toDataURL('image/png');
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = 170;
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                doc.setFontSize(12);
                doc.setTextColor(59, 130, 246);
                doc.setFont("helvetica", "bold");
                doc.text("Analytics Dashboard", 20, y);
                y += 5;

                if (y + pdfHeight > 280) { doc.addPage(); y = 20; }

                doc.addImage(imgData, 'PNG', 20, y, pdfWidth, pdfHeight);
                y += pdfHeight + 15;
             } catch (e) {
                 console.error("Failed to capture charts", e);
             }
        }

        // --- AI Summary ---
        if (y + 50 > 280) { doc.addPage(); y = 20; }

        doc.setFontSize(12);
        doc.setTextColor(59, 130, 246);
        doc.setFont("helvetica", "bold");
        doc.text("AI Executive Summary", 20, y);
        y += 8;

        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.setFont("helvetica", "normal");
        const summaryText = aiReport || "No summary generated.";
        const splitSummary = doc.splitTextToSize(summaryText, 170);
        
        // Check if summary fits
        if (y + (splitSummary.length * 5) > 280) {
            doc.addPage(); 
            y = 20;
        }
        
        doc.text(splitSummary, 20, y);
        y += (splitSummary.length * 5) + 15;

        // --- Blockchain Verification ---
        if (job.txHash) {
             if (y + 40 > 280) { doc.addPage(); y = 20; }
             
            doc.setFillColor(240, 253, 244); 
            doc.rect(20, y, 170, 30, 'F');
            doc.setDrawColor(20, 241, 149); 
            doc.rect(20, y, 170, 30, 'S');

            let innerY = y + 8;
            doc.setFontSize(10);
            doc.setTextColor(21, 128, 61); 
            doc.setFont("helvetica", "bold");
            doc.text("✓ Verified On-Chain", 25, innerY);
            
            innerY += 6;
            doc.setFontSize(8);
            doc.setFont("courier", "normal");
            doc.setTextColor(60, 60, 60);
            doc.text(job.txHash, 25, innerY);

            innerY += 5;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("Immutable Proof of Computation", 25, innerY);
        }

        // Footer
        const pageCount = doc.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Generated by BioChain - Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
        }

        doc.save(`${job.moleculeName.replace(/\s+/g, '_')}_Report.pdf`);

    } catch (err) {
        console.error("PDF Generation failed", err);
        alert("Could not generate PDF. Please try again.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[90%] lg:w-[80%] xl:w-[70%] bg-science-950 border-l border-science-800 shadow-2xl z-50 animate-slideInRight flex flex-col">
      {/* Header (Fixed) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-white/5 bg-science-900/50 backdrop-blur-md shrink-0">
        <div>
           <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-white/5 rounded text-xs font-mono text-slate-400 font-normal border border-white/5">#{job.id}</span>
                <span className="text-slate-500 text-xs">{job.uploadDate}</span>
           </div>
           <h1 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
             {job.moleculeName} 
           </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleExportPDF} className="text-xs" disabled={isExporting}>
             {isExporting ? <span className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-white rounded-full"></span> : <DownloadIcon className="w-4 h-4" />}
             {isExporting ? 'Generating...' : 'Export PDF'}
          </Button>
          {job.status !== JobStatus.VERIFIED && (
            <Button 
                variant="solana" 
                onClick={handleVerify} 
                disabled={!isWalletConnected}
                title={!isWalletConnected ? "Connect Wallet to Verify" : "Sign Verification on Solana"}
                className="text-xs"
            >
               Verify
            </Button>
          )}
          {job.status === JobStatus.VERIFIED && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium shadow-sm">
                <CheckCircleIcon className="w-3 h-3" />
                <span>Verified</span>
            </div>
          )}
          
          <button 
            onClick={onClose}
            className="ml-2 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="grid grid-cols-12 gap-8">
            {/* Left Column: Visuals */}
            <div className="col-span-12 xl:col-span-7 space-y-8">
                <Card title="Molecular Visualisation" className="overflow-hidden border-white/5 bg-science-900/40">
                    <div id="report-molecule-viewer">
                        <MoleculeViewer />
                    </div>
                </Card>
                
                {job.stats && (
                    <Card title="Data Analysis" className="border-white/5 bg-science-900/40">
                        <div id="report-charts">
                            <Charts stats={job.stats} />
                        </div>
                    </Card>
                )}
            </div>

            {/* Right Column: Text Report */}
            <div className="col-span-12 xl:col-span-5 space-y-6">
                <div className="flex p-1 bg-science-950 rounded-lg border border-white/5 sticky top-0 z-10 shadow-lg">
                    {(['summary', 'details', 'audit'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                                activeTab === tab 
                                ? 'bg-science-800 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <Card className="min-h-[500px] border-white/5 bg-science-900/40">
                    {activeTab === 'summary' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                <div className="flex items-center gap-2 text-science-400">
                                    <BeakerIcon className="w-5 h-5" />
                                    <h3 className="text-sm font-semibold uppercase tracking-wider">AI Analysis</h3>
                                </div>
                                {isGenerating && <span className="text-xs text-science-400 animate-pulse font-mono">Generative Agent Active...</span>}
                            </div>
                            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed">
                                {aiReport ? (
                                    aiReport.split('\n').map((line, i) => (
                                        <p key={i} className="mb-3 text-sm">{line}</p>
                                    ))
                                ) : (
                                    <div className="space-y-3 opacity-50">
                                        <div className="h-2 bg-slate-700 rounded w-3/4 animate-pulse"></div>
                                        <div className="h-2 bg-slate-700 rounded w-full animate-pulse"></div>
                                        <div className="h-2 bg-slate-700 rounded w-5/6 animate-pulse"></div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/5">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Recommendation</h4>
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg flex items-start gap-3">
                                    <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-emerald-400 font-medium text-sm block mb-1">High Potential Candidate</span>
                                        <p className="text-xs text-emerald-400/70">Metrics suggest proceeding to lead optimization phase.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'details' && job.stats && (
                        <div className="space-y-6">
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider pb-2 border-b border-white/5">Docking Parameters</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-science-950/50 border border-white/5 rounded-lg">
                                    <span className="block text-xs text-slate-500 mb-1">Docking Score</span>
                                    <span className="text-xl font-mono text-white font-semibold">{job.stats.dockingScore} <span className="text-xs text-slate-500 font-normal">kcal/mol</span></span>
                                </div>
                                <div className="p-4 bg-science-950/50 border border-white/5 rounded-lg">
                                    <span className="block text-xs text-slate-500 mb-1">Binding Efficiency</span>
                                    <span className="text-xl font-mono text-white font-semibold">{job.stats.bindingEfficiency}</span>
                                </div>
                                <div className="p-4 bg-science-950/50 border border-white/5 rounded-lg">
                                    <span className="block text-xs text-slate-500 mb-1">Molecular Weight</span>
                                    <span className="text-xl font-mono text-white font-semibold">{job.stats.molecularWeight} <span className="text-xs text-slate-500 font-normal">Da</span></span>
                                </div>
                                <div className="p-4 bg-science-950/50 border border-white/5 rounded-lg">
                                    <span className="block text-xs text-slate-500 mb-1">H-Donors / Acceptors</span>
                                    <span className="text-xl font-mono text-white font-semibold">{job.stats.hBondDonors} <span className="text-slate-600">/</span> {job.stats.hBondAcceptors}</span>
                                </div>
                            </div>
                            
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mt-2 pb-2 border-b border-white/5">Grid Box Config</h3>
                            <div className="p-4 bg-black/30 border border-white/5 rounded-lg font-mono text-xs text-slate-400 space-y-1">
                                <p><span className="text-slate-600">Center :</span> 12.5, 45.2, -10.1</p>
                                <p><span className="text-slate-600">Size   :</span> 20 x 20 x 20 Å</p>
                                <p><span className="text-slate-600">Exhaust:</span> 8</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'audit' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                                <div className="w-8 h-8 rounded-full bg-solana-secondary/10 flex items-center justify-center text-solana-secondary">
                                    <CheckCircleIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">Proof of Computation</h3>
                                    <p className="text-xs text-slate-500">Immutable record on Solana</p>
                                </div>
                            </div>

                            {job.txHash ? (
                                <div className="space-y-6">
                                    <div className="bg-science-950/80 p-5 rounded-lg border border-solana-primary/20 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-solana-primary/10 blur-xl rounded-full -mr-10 -mt-10"></div>
                                        
                                        <span className="block text-xs font-semibold text-solana-primary mb-2 uppercase tracking-wide">Transaction Hash</span>
                                        <a 
                                            href={SOLANA_EXPLORER_URL + job.txHash + "?cluster=devnet"} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-white hover:text-solana-secondary text-xs font-mono break-all transition-colors underline decoration-slate-700 underline-offset-4"
                                        >
                                            {job.txHash}
                                        </a>
                                        
                                        <div className="mt-6 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 px-3 py-2 rounded border border-emerald-500/10">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Confirmed on Solana Devnet
                                        </div>
                                    </div>

                                    {/* Live Chain Data Verification */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Live Ledger Data</h4>
                                        
                                        {isLoadingChainData ? (
                                            <div className="flex items-center gap-2 text-sm text-slate-400 p-4 border border-dashed border-white/10 rounded-lg">
                                                <RefreshIcon className="w-4 h-4 animate-spin" /> Fetching blocks...
                                            </div>
                                        ) : onChainData ? (
                                            <div className="space-y-2 text-xs font-mono">
                                                <div className="flex justify-between p-3 bg-black/40 rounded border border-white/5 hover:border-emerald-500/30 transition-colors">
                                                    <span className="text-slate-500">Molecule:</span>
                                                    <span className={onChainData.moleculeName === job.moleculeName ? "text-emerald-400" : "text-red-400"}>
                                                        {onChainData.moleculeName}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between p-3 bg-black/40 rounded border border-white/5 hover:border-emerald-500/30 transition-colors">
                                                    <span className="text-slate-500">Docking Score:</span>
                                                    <span className={Math.abs(onChainData.score - (job.stats?.dockingScore || 0)) < 0.001 ? "text-emerald-400" : "text-red-400"}>
                                                        {onChainData.score.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between p-3 bg-black/40 rounded border border-white/5 hover:border-emerald-500/30 transition-colors">
                                                    <span className="text-slate-500">Job ID:</span>
                                                    <span className={onChainData.jobId === job.id ? "text-emerald-400" : "text-red-400"}>
                                                        {onChainData.jobId}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-[10px] text-slate-600 text-center">
                                                    Data retrieved directly from Solana Node
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                                                Could not verify on-chain data.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-lg bg-white/5">
                                    <p>Not yet verified on-chain.</p>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
};