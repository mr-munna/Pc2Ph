import React, { useState } from 'react';
import { Clipboard, Send, Copy, Check, Lock, ExternalLink, ShieldCheck } from 'lucide-react';
import { EncryptedClipboardItem } from '../types';

interface TextTransferProps {
  onSendText: (text: string) => void;
  receivedTextItems: EncryptedClipboardItem[];
}

export const TextTransfer: React.FC<TextTransferProps> = ({
  onSendText,
  receivedTextItems
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendText(inputText.trim());
      setInputText('');
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Check if string looks like a URL
  const isUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="bg-[#121418] border border-slate-800/50 rounded-2xl p-6 shadow-xl space-y-4 mb-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center space-x-2">
          <Clipboard className="w-4 h-4 text-emerald-400" />
          <h2 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Encrypted Clipboard & Text Sync
          </h2>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-widest">
          E2E AES-256
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste text, URLs, OTPs, WiFi passwords, or phone numbers to sync instantly..."
            className="w-full bg-[#0A0B0D] border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none font-sans"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted with AES-256-GCM before transmission</span>
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-900/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send to Phone</span>
          </button>
        </div>
      </form>

      {/* Received Text History */}
      {receivedTextItems.length > 0 && (
        <div className="pt-4 border-t border-slate-800/60 space-y-3">
          <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Synced Text History ({receivedTextItems.length})
          </h3>

          <div className="space-y-2">
            {receivedTextItems.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-[#0A0B0D] border border-slate-800/60 rounded-xl flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
                    <span className="text-emerald-400 font-semibold">{item.senderName}</span>
                    <span>•</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <p className="text-xs text-slate-200 break-words font-mono bg-[#121418] p-2 rounded border border-slate-800/80">
                    {item.decryptedText}
                  </p>
                </div>

                <div className="flex items-center space-x-1 shrink-0 pt-1">
                  {item.decryptedText && isUrl(item.decryptedText) && (
                    <a
                      href={item.decryptedText}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Open URL in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() => item.decryptedText && handleCopy(item.id, item.decryptedText)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Copy Text"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
