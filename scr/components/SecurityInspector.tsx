import React, { useState } from 'react';
import { X, ShieldCheck, Cpu, KeyRound, Lock, FileCode, CheckCircle2, Activity } from 'lucide-react';
import { SecurityFingerprint } from '../types';

interface SecurityInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  fingerprint?: SecurityFingerprint;
  rawPayloadLogs: Array<{ id: string; timestamp: number; direction: 'sent' | 'received'; payloadType: string; encryptedSnippet: string }>;
}

export const SecurityInspector: React.FC<SecurityInspectorProps> = ({
  isOpen,
  onClose,
  fingerprint,
  rawPayloadLogs
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'logs'>('architecture');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0B0D]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121418] border border-slate-800/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <span>E2EE Security & Technical Inspector</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-widest">
                Zero-Knowledge
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Proof that files are encrypted before leaving your browser
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800/60 pb-3 mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'architecture' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Encryption Specs</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'logs' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Encrypted Payloads Stream ({rawPayloadLogs.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {activeTab === 'architecture' ? (
            <div className="space-y-4">
              
              {/* Specs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-[#0A0B0D] border border-slate-800/80 rounded-xl space-y-1">
                  <span className="text-slate-400 font-medium">Cipher Algorithm</span>
                  <div className="font-mono text-emerald-400 font-bold text-sm">AES-256-GCM</div>
                  <p className="text-[10px] text-slate-500">
                    Galois/Counter Mode provides authenticated encryption with 128-bit integrity tag.
                  </p>
                </div>

                <div className="p-3 bg-[#0A0B0D] border border-slate-800/80 rounded-xl space-y-1">
                  <span className="text-slate-400 font-medium">Key Derivation Function</span>
                  <div className="font-mono text-emerald-400 font-bold text-sm">PBKDF2-HMAC-SHA256</div>
                  <p className="text-[10px] text-slate-500">
                    100,000 hashing iterations using Web Crypto API (`crypto.subtle`).
                  </p>
                </div>

                <div className="p-3 bg-[#0A0B0D] border border-slate-800/80 rounded-xl space-y-1">
                  <span className="text-slate-400 font-medium">Key Isolation Model</span>
                  <div className="font-mono text-emerald-400 font-bold text-sm">Hash Fragment (#key=...)</div>
                  <p className="text-[10px] text-slate-500">
                    Key resides strictly in URL location hash fragment which is never sent in HTTP headers.
                  </p>
                </div>

                <div className="p-3 bg-[#0A0B0D] border border-slate-800/80 rounded-xl space-y-1">
                  <span className="text-slate-400 font-medium">Relay Server Storage</span>
                  <div className="font-mono text-emerald-400 font-bold text-sm">0 Bytes Saved (Zero Persistence)</div>
                  <p className="text-[10px] text-slate-500">
                    Server acts purely as an encrypted memory relay. No databases, logs, or disk writes.
                  </p>
                </div>
              </div>

              {/* Security Fingerprint */}
              {fingerprint && (
                <div className="p-4 bg-[#0A0B0D] border border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                      <span>Derived Key Safety Fingerprint</span>
                    </span>
                    <span className="font-mono text-emerald-400 text-xs">{fingerprint.hashHex}</span>
                  </div>

                  <div className="flex items-center justify-between bg-[#121418] p-2 rounded-lg text-xs font-mono text-slate-200 border border-slate-800/60">
                    {fingerprint.words.map((w, i) => (
                      <span key={i} className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 bg-[#0A0B0D] p-2.5 rounded-lg border border-slate-800/80">
                Below is the raw ciphertext broadcasted over the wire. Notice that file contents, text, and filenames are completely encrypted with high entropy prior to transmission.
              </div>

              {rawPayloadLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No encrypted transfers logged yet. Send a file or text snippet to view raw stream!
                </div>
              ) : (
                <div className="space-y-2 font-mono text-[11px]">
                  {rawPayloadLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-[#0A0B0D] border border-slate-800/80 rounded-lg space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className={`font-semibold ${log.direction === 'sent' ? 'text-emerald-400' : 'text-purple-400'}`}>
                          [{log.direction.toUpperCase()}] {log.payloadType}
                        </span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-emerald-400/90 break-all bg-[#121418] p-1.5 rounded border border-slate-800/80">
                        {log.encryptedSnippet}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
