import React, { useRef, useState } from 'react';
import { Upload, FileUp, FolderUp, Lock, Send, Smartphone, Monitor, AlertCircle } from 'lucide-react';
import { PeerInfo } from '../types';

interface FileDropzoneProps {
  onSendFiles: (files: File[], targetPeerId?: string) => void;
  peers: PeerInfo[];
  selfPeerId: string | null;
  isPaired: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onSendFiles,
  peers,
  selfPeerId,
  isPaired
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedTargetPeerId, setSelectedTargetPeerId] = useState<string>('all');

  const otherPeers = peers.filter(p => p.id !== selfPeerId);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      const target = selectedTargetPeerId === 'all' ? undefined : selectedTargetPeerId;
      onSendFiles(filesArray, target);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const target = selectedTargetPeerId === 'all' ? undefined : selectedTargetPeerId;
      onSendFiles(filesArray, target);
      // reset input
      e.target.value = '';
    }
  };

  return (
    <div className="bg-[#121418] border border-slate-800/50 rounded-2xl p-6 shadow-xl space-y-4">
      
      {/* Dropzone Header & Recipient Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
        <div className="flex items-center space-x-2">
          <Upload className="w-4 h-4 text-emerald-400" />
          <h2 className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
            Encrypted File Sender
          </h2>
        </div>

        {/* Recipient Target Selector */}
        {otherPeers.length > 0 && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium">Recipient:</span>
            <select
              value={selectedTargetPeerId}
              onChange={(e) => setSelectedTargetPeerId(e.target.value)}
              className="bg-[#0A0B0D] border border-slate-700/80 text-white rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Paired Devices ({otherPeers.length})</option>
              {otherPeers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.deviceName} ({p.deviceType})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Drag & Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all relative group overflow-hidden ${
          isDragOver
            ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
            : 'border-slate-800/80 hover:border-emerald-500/50 bg-[#0A0B0D] hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="space-y-4 max-w-sm mx-auto pointer-events-none">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all shadow-lg shadow-emerald-500/10">
            <FileUp className="w-8 h-8" />
          </div>

          <div>
            <p className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Drag & Drop Files Here
            </p>
            <p className="text-xs text-slate-400 mt-1">
              or click to browse photos, documents, videos, or zips
            </p>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#121418] text-[11px] font-mono text-slate-300 border border-slate-800">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Chunked AES-256-GCM Encryption On-The-Fly</span>
          </div>
        </div>

      </div>

      {/* Auxiliary Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-900/20"
          >
            <FileUp className="w-4 h-4" />
            <span>Select Files</span>
          </button>

          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="px-3.5 py-2 bg-[#0A0B0D] hover:bg-slate-800 text-slate-300 rounded-xl font-medium border border-slate-800 transition-all flex items-center space-x-1.5"
          >
            <FolderUp className="w-4 h-4 text-amber-400" />
            <span>Select Folder</span>
          </button>
        </div>

        {!isPaired && (
          <div className="text-amber-400 text-xs flex items-center space-x-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Pair phone to send directly</span>
          </div>
        )}
      </div>

    </div>
  );
};
