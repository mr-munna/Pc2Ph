import React, { useState } from 'react';
import { Smartphone, Monitor, ShieldCheck, QrCode, ArrowRight, CheckCircle2, Copy, KeyRound, Zap } from 'lucide-react';
import { RoomState } from '../types';

interface PairingBannerProps {
  roomState: RoomState;
  onJoinRoom: (pin: string) => void;
  onOpenQRModal: () => void;
}

export const PairingBanner: React.FC<PairingBannerProps> = ({
  roomState,
  onJoinRoom,
  onOpenQRModal
}) => {
  const [pinInput, setPinInput] = useState('');
  const isPaired = roomState.peers.length > 1;

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim().length === 6) {
      onJoinRoom(pinInput.trim().toUpperCase());
    }
  };

  return (
    <div className="bg-[#121418] border border-slate-800/50 rounded-2xl p-4 sm:p-6 shadow-xl mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Left: Active Devices */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center space-x-2">
              <span>PAIRED DEVICES</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                {roomState.peers.length} active
              </span>
            </h2>
            <button
              onClick={onOpenQRModal}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Show QR Code</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roomState.peers.map((peer) => {
              const isSelf = peer.id === roomState.selfPeerId;
              const isPhone = peer.deviceType === 'phone';

              return (
                <div
                  key={peer.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelf
                      ? 'bg-emerald-500/5 border-emerald-500/30 text-white'
                      : 'bg-[#0A0B0D] border-slate-800/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isPhone ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {isPhone ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold flex items-center space-x-1.5">
                        <span>{peer.deviceName}</span>
                        {isSelf && (
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                            THIS DEVICE
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        <span>Ready for transfer</span>
                      </div>
                    </div>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
              );
            })}

            {/* Waiting for partner placeholder if only 1 device */}
            {!isPaired && (
              <div
                onClick={onOpenQRModal}
                className="p-3.5 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-300 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
                    <Smartphone className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-300">
                      Scan to Pair Phone
                    </div>
                    <div className="text-xs text-slate-400">
                      Tap to open QR code scanner
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
          </div>
        </div>

        {/* Right: Security Fingerprint & PIN Switcher */}
        <div className="lg:col-span-5 bg-[#0D0F13] p-4 rounded-xl border border-slate-800/60 space-y-4">
          
          {/* High-Speed Transfer Mode Tip */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start space-x-2.5">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-emerald-400 block mb-0.5">
                ⚡ Super Fast Local Transfer (100 MB/s P2P)
              </span>
              <span>
                PC এবং Mobile-কে একই Wi-Fi বা Mobile Hotspot-এ কানেক্ট রাখলে Internet Speed কম হলেও **Direct P2P LAN Protocol** দিয়ে সর্বোচ্চ গতিতে File Transfer হবে (কোন MB/Data কাটবে না)!
              </span>
            </div>
          </div>

          {/* Key Fingerprint Verification */}
          {roomState.keyFingerprint && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center space-x-1">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Key Verification Code</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  AES-256 Match
                </span>
              </div>

              {/* Emoji & Word Safety Matrix */}
              <div className="bg-[#0A0B0D] p-2.5 rounded-lg border border-slate-800/60 space-y-2">
                <div className="flex items-center justify-between text-lg tracking-widest bg-[#121418] py-1 px-3 rounded text-center border border-slate-800/40">
                  {roomState.keyFingerprint.emojis.map((emoji, idx) => (
                    <span key={idx} className="scale-110 hover:scale-125 transition-transform">{emoji}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 px-1">
                  {roomState.keyFingerprint.words.map((word, idx) => (
                    <span key={idx} className="bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/40 text-slate-200">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 text-center">
                Compare code on PC and Phone to confirm E2E key match
              </p>
            </div>
          )}

          {/* Join Another Room Form */}
          <form onSubmit={handleJoinSubmit} className="pt-2 border-t border-slate-800/60">
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">
              Enter 6-Digit Room PIN to Join:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                placeholder="e.g. 849201"
                className="flex-1 bg-[#0A0B0D] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 uppercase"
              />
              <button
                type="submit"
                disabled={pinInput.trim().length !== 6}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white disabled:text-slate-600 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 shadow-md shadow-emerald-900/20"
              >
                <span>Join</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
