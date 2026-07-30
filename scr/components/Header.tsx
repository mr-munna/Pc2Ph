import React from 'react';
import { ShieldCheck, QrCode, Lock, Cpu, Copy, Check, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { RoomState } from '../types';

interface HeaderProps {
  roomState: RoomState;
  onOpenQR: () => void;
  onOpenSecurityInspector: () => void;
  onNewSession: () => void;
  onCopyLink: () => void;
  isCopied: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roomState,
  onOpenQR,
  onOpenSecurityInspector,
  onNewSession,
  onCopyLink,
  isCopied
}) => {
  const connectedPeersCount = roomState.peers.length;
  const isPaired = connectedPeersCount > 1;

  return (
    <header className="bg-[#121418] border-b border-slate-800/50 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Encryption Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-slate-100 tracking-tight text-base">
                MAVXON SHARE
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3 mr-1" />
                E2E AES-256
              </span>
            </div>
          </div>
        </div>

        {/* Center Room PIN & Pairing status */}
        <div className="hidden md:flex items-center space-x-3 bg-[#0A0B0D] rounded-lg px-3 py-1.5 border border-slate-800/60">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
            PIN:
          </div>
          <div className="font-mono text-xs font-bold tracking-widest text-slate-200">
            {roomState.roomId}
          </div>
          <button
            onClick={onCopyLink}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Copy Pairing Link"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          
          <div className="h-3.5 w-px bg-slate-800 mx-1" />

          {/* Connection status pill */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className={`w-2 h-2 rounded-full ${isPaired ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-medium text-xs">
              {isPaired ? `${connectedPeersCount} Devices Paired` : 'Waiting for Device...'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* QR Code Button */}
          <button
            onClick={onOpenQR}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-all"
            title="Scan QR Code to Pair Phone"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">QR Pair</span>
          </button>

          {/* Security Proof Inspector */}
          <button
            onClick={onOpenSecurityInspector}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0A0B0D] hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-all"
            title="E2EE Security Proof & Live Traffic Inspector"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Security Proof</span>
          </button>

          {/* New Session */}
          <button
            onClick={onNewSession}
            className="p-1.5 rounded-lg bg-[#0A0B0D] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all"
            title="Start New Encrypted Session"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Mobile Sub-bar for Room PIN */}
      <div className="md:hidden bg-[#0A0B0D] px-4 py-2 border-t border-slate-800/50 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">PIN:</span>
          <span className="font-mono font-bold text-slate-200 tracking-widest">{roomState.roomId}</span>
          <button onClick={onCopyLink} className="text-slate-400 hover:text-white">
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className={`w-2 h-2 rounded-full ${isPaired ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-slate-300 text-xs">
            {isPaired ? `${connectedPeersCount} Devices` : 'Waiting...'}
          </span>
        </div>
      </div>
    </header>
  );
};
