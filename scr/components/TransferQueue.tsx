import React from 'react';
import { Download, Eye, FileText, CheckCircle2, Clock, AlertTriangle, X, ShieldCheck, ArrowUpRight, ArrowDownLeft, FileIcon, ImageIcon, Film, Music } from 'lucide-react';
import { TransferFileItem } from '../types';

interface TransferQueueProps {
  items: TransferFileItem[];
  onCancelTransfer: (id: string) => void;
  onPreviewFile: (item: TransferFileItem) => void;
  onClearQueue: () => void;
}

export const TransferQueue: React.FC<TransferQueueProps> = ({
  items,
  onCancelTransfer,
  onPreviewFile,
  onClearQueue
}) => {
  if (items.length === 0) {
    return null;
  }

  // Format bytes to readable size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format speed to KB/s or MB/s
  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec <= 0) return '0 KB/s';
    return formatBytes(bytesPerSec) + '/s';
  };

  // Get file type icon
  const getFileIcon = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (type.startsWith('image/') || ['jpg', 'png', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4 text-purple-400" />;
    }
    if (type.startsWith('video/') || ['mp4', 'mov', 'mkv', 'webm'].includes(ext || '')) {
      return <Film className="w-4 h-4 text-blue-400" />;
    }
    if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) {
      return <Music className="w-4 h-4 text-emerald-400" />;
    }
    return <FileIcon className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div className="bg-[#121418] border border-slate-800/50 rounded-2xl p-6 shadow-xl space-y-4 mb-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Transfer Queue ({items.length})
          </h2>
        </div>

        <button
          onClick={onClearQueue}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Clear Finished
        </button>
      </div>

      {/* Transfer Items List */}
      <div className="space-y-3">
        {items.map((item) => {
          const isOutgoing = item.direction === 'outgoing';
          const isCompleted = item.status === 'completed';
          const isError = item.status === 'error';
          const isCancelled = item.status === 'cancelled';
          const isProcessing = ['encrypting', 'transferring', 'decrypting'].includes(item.status);

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                isCompleted
                  ? 'bg-[#0A0B0D] border-emerald-500/30'
                  : isError
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-[#0A0B0D] border-slate-800/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                
                {/* File Icon & Info */}
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="p-2.5 rounded-xl bg-[#121418] border border-slate-800/60 shrink-0">
                    {getFileIcon(item.type, item.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                        {item.name}
                      </h3>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-medium ${
                        isOutgoing ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {isOutgoing ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownLeft className="w-3 h-3 mr-0.5" />}
                        {isOutgoing ? 'OUTGOING' : 'INCOMING'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                      <span>{formatBytes(item.size)}</span>
                      <span>•</span>
                      <span className="font-mono text-emerald-400 text-[11px]">
                        {item.status === 'encrypting' && 'Encrypting (AES-256)...'}
                        {item.status === 'decrypting' && 'Decrypting (AES-256)...'}
                        {item.status === 'transferring' && `${formatBytes(item.transferredBytes)} / ${formatBytes(item.size)}`}
                        {item.status === 'completed' && 'Decrypted & Verified 🔒'}
                        {item.status === 'error' && 'Failed'}
                        {item.status === 'cancelled' && 'Cancelled'}
                      </span>
                      {isProcessing && item.speedBytesPerSec > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-mono text-[11px]">
                            {formatSpeed(item.speedBytesPerSec)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center space-x-2 shrink-0">
                  {isCompleted && item.blobUrl && (
                    <>
                      <button
                        onClick={() => onPreviewFile(item)}
                        className="px-2.5 py-1.5 bg-[#121418] hover:bg-slate-800 text-slate-200 border border-slate-800/80 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
                        title="Preview File"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>

                      <a
                        href={item.blobUrl}
                        download={item.name}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 shadow-md shadow-emerald-900/20"
                        title="Save to Device"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </a>
                    </>
                  )}

                  {isProcessing && (
                    <button
                      onClick={() => onCancelTransfer(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Cancel Transfer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>

              {/* Progress Bar */}
              <div className="space-y-1 mt-2">
                <div className="w-full bg-[#121418] rounded-full h-2 overflow-hidden border border-slate-800/60">
                  <div
                    className={`h-full transition-all duration-200 ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : isError
                        ? 'bg-red-500'
                        : 'bg-emerald-500 animate-pulse'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                  />
                </div>
                {isProcessing && (
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Processing chunk {item.processedChunks} of {item.totalChunks}</span>
                    <span>{Math.round(item.progress)}%</span>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
