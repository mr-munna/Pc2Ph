import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Smartphone, ShieldCheck, QrCode as QrIcon } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  secretKey: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  roomId,
  secretKey
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  // Construct pairing URL with Hash Fragment containing the encryption key
  // Hash fragment (#key=...) is NEVER sent to the HTTP server in browser GET requests!
  const pairingUrl = `${window.location.origin}/?room=${roomId}#key=${encodeURIComponent(secretKey)}`;

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, pairingUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0a0b0d',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error('Error rendering QR Code:', err);
      });
    }
  }, [isOpen, pairingUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pairingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0B0D]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121418] border border-slate-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
            <Smartphone className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Scan to Pair Phone</h3>
          <p className="text-xs text-slate-400">
            Open camera app on your iPhone or Android to pair instantly.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-2xl shadow-inner flex flex-col items-center justify-center mx-auto w-max mb-6">
          <canvas ref={canvasRef} className="rounded-lg" />
          <div className="mt-2 text-[10px] font-mono font-semibold text-slate-700 uppercase tracking-widest flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Zero-Knowledge Direct Link</span>
          </div>
        </div>

        {/* Room PIN & Quick Link */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-[#0A0B0D] p-3 rounded-xl border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold tracking-widest">Room PIN</span>
              <span className="font-mono font-bold text-slate-200 text-base tracking-widest">{roomId}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#121418] hover:bg-slate-800 text-slate-200 border border-slate-800/80 rounded-lg text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            The encryption key is embedded in the link hash fragment (<span className="font-mono text-emerald-400">#key=...</span>), ensuring it is never transmitted to any server.
          </p>
        </div>

      </div>
    </div>
  );
};
