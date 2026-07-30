import React, { useEffect, useState } from 'react';
import { X, Download, FileText, Image as ImageIcon, Film, Music, ShieldCheck } from 'lucide-react';
import { TransferFileItem } from '../types';

interface FilePreviewModalProps {
  item: TransferFileItem | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  item,
  onClose
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (item && item.blobUrl && (item.type.startsWith('text/') || item.type.includes('json') || item.name.endsWith('.txt') || item.name.endsWith('.md'))) {
      fetch(item.blobUrl)
        .then(res => res.text())
        .then(text => setTextContent(text.substring(0, 10000))) // Limit preview size
        .catch(err => console.error('Error reading text file preview:', err));
    } else {
      setTextContent(null);
    }
  }, [item]);

  if (!item) return null;

  const isImage = item.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.name);
  const isVideo = item.type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(item.name);
  const isAudio = item.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(item.name);

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0B0D]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121418] border border-slate-800/80 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-4">
          <div className="min-w-0 pr-4">
            <h3 className="text-base font-bold text-white truncate">{item.name}</h3>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
              <span>{item.type || 'Decrypted File'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-mono text-[11px] flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Decrypted AES-256
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {item.blobUrl && (
              <a
                href={item.blobUrl}
                download={item.name}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-md shadow-emerald-900/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Preview Container */}
        <div className="flex-1 overflow-auto bg-[#0A0B0D] rounded-xl border border-slate-800/80 p-4 flex items-center justify-center min-h-[300px]">
          {isImage && item.blobUrl && (
            <img
              src={item.blobUrl}
              alt={item.name}
              className="max-h-[60vh] w-auto object-contain rounded-lg shadow-lg"
            />
          )}

          {isVideo && item.blobUrl && (
            <video
              src={item.blobUrl}
              controls
              className="max-h-[60vh] w-full rounded-lg"
            />
          )}

          {isAudio && item.blobUrl && (
            <div className="w-full max-w-md p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <Music className="w-8 h-8" />
              </div>
              <audio src={item.blobUrl} controls className="w-full" />
            </div>
          )}

          {textContent !== null && (
            <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed w-full h-full overflow-auto p-2">
              {textContent}
            </pre>
          )}

          {!isImage && !isVideo && !isAudio && textContent === null && (
            <div className="text-center space-y-3 py-8 text-slate-400">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm">Preview not available for this file type.</p>
              <p className="text-xs text-slate-500">Click "Save" above to download file to your device.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
