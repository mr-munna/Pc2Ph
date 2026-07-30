import React, { useEffect, useState, useRef } from 'react';
import { socketService } from './lib/socket';
import { webRTCService } from './lib/webrtc';
import {
  deriveEncryptionKey,
  generateRandomPassphrase,
  generateRoomPin,
  calculateSecurityFingerprint,
  encryptChunk,
  decryptChunk,
  encryptText,
  decryptText,
  CHUNK_SIZE
} from './lib/crypto';
import { RoomState, PeerInfo, TransferFileItem, EncryptedClipboardItem, SecurityFingerprint } from './types';

// UI Components
import { Header } from './components/Header';
import { PairingBanner } from './components/PairingBanner';
import { QRModal } from './components/QRModal';
import { FileDropzone } from './components/FileDropzone';
import { TransferQueue } from './components/TransferQueue';
import { TextTransfer } from './components/TextTransfer';
import { SecurityInspector } from './components/SecurityInspector';
import { FilePreviewModal } from './components/FilePreviewModal';

export default function App() {
  // Room & Encryption State
  const [roomState, setRoomState] = useState<RoomState>({
    roomId: '',
    secretKey: '',
    peers: [],
    selfPeerId: null,
    isConnected: false,
    isJoinedRoom: false,
    transportMode: 'p2p_webrtc'
  });

  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [fingerprint, setFingerprint] = useState<SecurityFingerprint | undefined>(undefined);

  // Transfers & Clipboard State
  const [transferItems, setTransferItems] = useState<TransferFileItem[]>([]);
  const [clipboardItems, setClipboardItems] = useState<EncryptedClipboardItem[]>([]);

  // Modals
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isSecurityInspectorOpen, setIsSecurityInspectorOpen] = useState(false);
  const [previewFileItem, setPreviewFileItem] = useState<TransferFileItem | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Raw Encrypted Traffic Logs for Technical Inspector
  const [rawPayloadLogs, setRawPayloadLogs] = useState<Array<{
    id: string;
    timestamp: number;
    direction: 'sent' | 'received';
    payloadType: string;
    encryptedSnippet: string;
  }>>([]);

  // Buffer storage for incoming file chunks and throttled state updates
  const incomingChunksMap = useRef<Map<string, ArrayBuffer[]>>(new Map());
  const lastRxStateUpdateMap = useRef<Map<string, number>>(new Map());

  // Initialize or Parse Room & Encryption Keys on mount
  useEffect(() => {
    initSession();
  }, []);

  const initSession = async (targetRoomId?: string, targetKey?: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));

    const roomId = targetRoomId || urlParams.get('room') || generateRoomPin();
    const passphrase = targetKey || hashParams.get('key') || generateRandomPassphrase();

    // Derive CryptoKey using PBKDF2
    const key = await deriveEncryptionKey(passphrase, roomId);
    setCryptoKey(key);

    // Compute visual fingerprint
    const fp = await calculateSecurityFingerprint(key, passphrase);
    setFingerprint(fp);

    // Sync URL without triggering full page refresh
    const newUrl = `${window.location.pathname}?room=${roomId}#key=${encodeURIComponent(passphrase)}`;
    window.history.replaceState(null, '', newUrl);

    setRoomState(prev => ({
      ...prev,
      roomId,
      secretKey: passphrase,
      keyFingerprint: fp
    }));

    // Connect WebSocket
    connectToRoom(roomId);
  };

  const connectToRoom = async (roomId: string) => {
    try {
      await socketService.connect(roomId);
      setRoomState(prev => ({
        ...prev,
        isConnected: true,
        isJoinedRoom: true,
        selfPeerId: socketService.selfPeerId
      }));
    } catch (err) {
      console.error('Failed to connect to room socket:', err);
    }
  };

  // Listen to WebSocket & WebRTC Messages
  useEffect(() => {
    const unsubscribeSocket = socketService.onMessage((data) => {
      handleIncomingMessage(data);
    });

    webRTCService.setOnDataReceived((data) => {
      handleIncomingMessage(data);
    });

    return () => {
      unsubscribeSocket();
    };
  }, [cryptoKey, roomState.selfPeerId]);

  const logRawPayload = (direction: 'sent' | 'received', type: string, snippet: string) => {
    setRawPayloadLogs(prev => [
      {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        direction,
        payloadType: type,
        encryptedSnippet: snippet.substring(0, 100) + '...'
      },
      ...prev.slice(0, 30) // Keep last 30 logs
    ]);
  };

  const handleIncomingMessage = async (data: any) => {
    if (!cryptoKey) return;

    if (data.type === 'PEER_LIST_UPDATE') {
      setRoomState(prev => ({
        ...prev,
        peers: data.peers,
        selfPeerId: data.selfId
      }));

      // If new peer joins, attempt WebRTC P2P connection
      const otherPeers = (data.peers as PeerInfo[]).filter(p => p.id !== data.selfId);
      if (otherPeers.length > 0) {
        webRTCService.connectToPeer(otherPeers[0].id);
      }
    } else if (data.type === 'FILE_TRANSFER_START') {
      // Incoming file transfer initialization
      incomingChunksMap.current.set(data.transferId, []);

      const newItem: TransferFileItem = {
        id: data.transferId,
        name: data.fileName,
        size: data.fileSize,
        type: data.fileType,
        senderPeerId: data.senderPeerId,
        senderName: data.senderName || 'Peer',
        status: 'transferring',
        progress: 0,
        speedBytesPerSec: 0,
        transferredBytes: 0,
        totalChunks: data.totalChunks,
        processedChunks: 0,
        direction: 'incoming',
        isEncrypted: true,
        startTime: Date.now()
      };

      setTransferItems(prev => [newItem, ...prev.filter(i => i.id !== data.transferId)]);
      logRawPayload('received', 'FILE_TRANSFER_START', JSON.stringify(data));
    } else if (data.type === 'ENCRYPTED_CHUNK') {
      // Incoming encrypted chunk
      const { transferId, chunkIndex, encryptedBase64, ivBase64 } = data;
      
      // Log payload conditionally to prevent CPU overload during fast transfers
      if (chunkIndex % 10 === 0) {
        logRawPayload('received', `ENCRYPTED_CHUNK #${chunkIndex}`, encryptedBase64);
      }

      try {
        // Decrypt chunk on the fly with Web Crypto API
        const decryptedBuffer = await decryptChunk(encryptedBase64, ivBase64, cryptoKey);
        const existingChunks = incomingChunksMap.current.get(transferId) || [];
        existingChunks[chunkIndex] = decryptedBuffer;
        incomingChunksMap.current.set(transferId, existingChunks);

        // Throttle receiver state update (~100ms) to ensure smooth 60 FPS UI without main thread blocking
        const now = Date.now();
        const lastRxUpdate = lastRxStateUpdateMap.current.get(transferId) || 0;

        if (now - lastRxUpdate > 100 || existingChunks.length === data.totalChunks) {
          lastRxStateUpdateMap.current.set(transferId, now);

          setTransferItems(prev =>
            prev.map(item => {
              if (item.id === transferId) {
                const processed = existingChunks.filter(Boolean).length;
                const transferred = Math.min(item.size, processed * CHUNK_SIZE);
                const progress = Math.min(100, (processed / item.totalChunks) * 100);

                const elapsedSec = (now - (item.startTime || now)) / 1000;
                const speed = elapsedSec > 0 ? transferred / elapsedSec : 0;

                return {
                  ...item,
                  status: 'transferring',
                  processedChunks: processed,
                  transferredBytes: transferred,
                  progress,
                  speedBytesPerSec: speed
                };
              }
              return item;
            })
          );
        }
      } catch (err) {
        console.error('Failed to decrypt incoming chunk:', err);
      }
    } else if (data.type === 'FILE_TRANSFER_END') {
      // Finalize incoming file transfer
      const { transferId } = data;
      const chunks = incomingChunksMap.current.get(transferId);

      if (chunks) {
        setTransferItems(prev =>
          prev.map(item => {
            if (item.id === transferId) {
              const blob = new Blob(chunks, { type: item.type || 'application/octet-stream' });
              const blobUrl = URL.createObjectURL(blob);

              return {
                ...item,
                status: 'completed',
                progress: 100,
                blobUrl,
                endTime: Date.now()
              };
            }
            return item;
          })
        );
        incomingChunksMap.current.delete(transferId);
        lastRxStateUpdateMap.current.delete(transferId);
      }
    } else if (data.type === 'ENCRYPTED_TEXT') {
      // Decrypt incoming clipboard snippet
      const { ciphertextBase64, ivBase64, senderPeerId, senderName, timestamp } = data;
      logRawPayload('received', 'ENCRYPTED_TEXT', ciphertextBase64);

      try {
        const decryptedText = await decryptText(ciphertextBase64, ivBase64, cryptoKey);
        const newSnippet: EncryptedClipboardItem = {
          id: Math.random().toString(36).substring(2, 9),
          senderPeerId,
          senderName: senderName || 'Peer Device',
          ciphertextHex: ciphertextBase64,
          ivHex: ivBase64,
          decryptedText,
          timestamp: timestamp || Date.now()
        };

        setClipboardItems(prev => [newSnippet, ...prev]);
      } catch (e) {
        console.error('Failed to decrypt text snippet:', e);
      }
    }
  };

  // Send files with E2EE chunking
  const handleSendFiles = async (files: File[], targetPeerId?: string) => {
    if (!cryptoKey) return;

    for (const file of files) {
      const transferId = 'transfer_' + Math.random().toString(36).substring(2, 9);
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const selfPeer = roomState.peers.find(p => p.id === roomState.selfPeerId);

      // Create outgoing item in queue
      const newItem: TransferFileItem = {
        id: transferId,
        name: file.name,
        size: file.size,
        type: file.type,
        senderPeerId: roomState.selfPeerId || '',
        senderName: selfPeer?.deviceName || 'This Device',
        recipientPeerId: targetPeerId,
        status: 'encrypting',
        progress: 0,
        speedBytesPerSec: 0,
        transferredBytes: 0,
        totalChunks,
        processedChunks: 0,
        direction: 'outgoing',
        isEncrypted: true,
        startTime: Date.now(),
        fileObject: file
      };

      setTransferItems(prev => [newItem, ...prev]);

      // Helper to dispatch payload via WebRTC or WebSocket
      const sendPayload = (payload: any) => {
        if (webRTCService.isDirectP2PAvailable()) {
          webRTCService.sendData(payload);
        } else {
          socketService.send({
            ...payload,
            targetPeerId
          });
        }
      };

      // Notify recipient of file start
      sendPayload({
        type: 'FILE_TRANSFER_START',
        transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks,
        senderPeerId: roomState.selfPeerId,
        senderName: selfPeer?.deviceName
      });

      // Read & encrypt file in chunks
      let offset = 0;
      let chunkIndex = 0;
      let lastTxStateUpdate = Date.now();

      while (offset < file.size) {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const arrayBuffer = await slice.arrayBuffer();

        // Encrypt chunk using AES-GCM
        const { encryptedBase64, ivBase64 } = await encryptChunk(arrayBuffer, cryptoKey);
        
        if (chunkIndex % 10 === 0 || chunkIndex === totalChunks - 1) {
          logRawPayload('sent', `ENCRYPTED_CHUNK #${chunkIndex}`, encryptedBase64);
        }

        sendPayload({
          type: 'ENCRYPTED_CHUNK',
          transferId,
          chunkIndex,
          encryptedBase64,
          ivBase64
        });

        offset += CHUNK_SIZE;
        chunkIndex++;

        // Throttle React state update (~100ms interval) to keep UI ultra responsive
        const now = Date.now();
        if (now - lastTxStateUpdate > 100 || chunkIndex === totalChunks) {
          lastTxStateUpdate = now;
          const progress = Math.min(100, (chunkIndex / totalChunks) * 100);
          const transferredBytes = Math.min(file.size, offset);
          const elapsedSec = (now - newItem.startTime!) / 1000;
          const speed = elapsedSec > 0 ? transferredBytes / elapsedSec : 0;

          setTransferItems(prev =>
            prev.map(item => {
              if (item.id === transferId) {
                return {
                  ...item,
                  status: 'transferring',
                  progress,
                  processedChunks: chunkIndex,
                  transferredBytes,
                  speedBytesPerSec: speed
                };
              }
              return item;
            })
          );
        }

        // WebRTC flow control or microtask yield for maximum speed without memory clogging
        if (webRTCService.isDirectP2PAvailable()) {
          await webRTCService.waitForBufferDrain(4 * 1024 * 1024);
        } else {
          if (chunkIndex % 8 === 0) {
            await new Promise(r => setTimeout(r, 0));
          }
        }
      }

      // Notify completion
      sendPayload({
        type: 'FILE_TRANSFER_END',
        transferId
      });

      // Also create Blob for local sender preview
      const localBlobUrl = URL.createObjectURL(file);

      setTransferItems(prev =>
        prev.map(item => {
          if (item.id === transferId) {
            return {
              ...item,
              status: 'completed',
              progress: 100,
              blobUrl: localBlobUrl,
              endTime: Date.now()
            };
          }
          return item;
        })
      );
    }
  };

  // Send Encrypted Clipboard Text
  const handleSendText = async (text: string) => {
    if (!cryptoKey) return;

    const selfPeer = roomState.peers.find(p => p.id === roomState.selfPeerId);
    const { ciphertextBase64, ivBase64 } = await encryptText(text, cryptoKey);
    logRawPayload('sent', 'ENCRYPTED_TEXT', ciphertextBase64);

    const payload = {
      type: 'ENCRYPTED_TEXT',
      ciphertextBase64,
      ivBase64,
      senderPeerId: roomState.selfPeerId,
      senderName: selfPeer?.deviceName,
      timestamp: Date.now()
    };

    if (webRTCService.isDirectP2PAvailable()) {
      webRTCService.sendData(payload);
    } else {
      socketService.send(payload);
    }

    // Add to local history
    const localSnippet: EncryptedClipboardItem = {
      id: Math.random().toString(36).substring(2, 9),
      senderPeerId: roomState.selfPeerId || '',
      senderName: selfPeer?.deviceName || 'This Device',
      ciphertextHex: ciphertextBase64,
      ivHex: ivBase64,
      decryptedText: text,
      timestamp: Date.now()
    };

    setClipboardItems(prev => [localSnippet, ...prev]);
  };

  const handleCancelTransfer = (id: string) => {
    setTransferItems(prev =>
      prev.map(item => (item.id === id ? { ...item, status: 'cancelled' } : item))
    );
  };

  const handleClearQueue = () => {
    setTransferItems(prev => prev.filter(item => item.status === 'transferring' || item.status === 'encrypting'));
  };

  const handleCopyPairingLink = () => {
    const url = `${window.location.origin}/?room=${roomState.roomId}#key=${encodeURIComponent(roomState.secretKey)}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleStartNewSession = () => {
    const newRoom = generateRoomPin();
    const newKey = generateRandomPassphrase();
    initSession(newRoom, newKey);
  };

  const handleJoinRoom = (pin: string) => {
    initSession(pin, roomState.secretKey);
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-slate-200 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Navbar Header */}
      <Header
        roomState={roomState}
        onOpenQR={() => setIsQRModalOpen(true)}
        onOpenSecurityInspector={() => setIsSecurityInspectorOpen(true)}
        onNewSession={handleStartNewSession}
        onCopyLink={handleCopyPairingLink}
        isCopied={isCopied}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Pairing Status & Room PIN */}
        <PairingBanner
          roomState={roomState}
          onJoinRoom={handleJoinRoom}
          onOpenQRModal={() => setIsQRModalOpen(true)}
        />

        {/* Main Grid: File Transfer & Text Transfer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* File Transfer Column */}
          <div className="lg:col-span-7 space-y-6">
            <FileDropzone
              onSendFiles={handleSendFiles}
              peers={roomState.peers}
              selfPeerId={roomState.selfPeerId}
              isPaired={roomState.peers.length > 1}
            />

            <TransferQueue
              items={transferItems}
              onCancelTransfer={handleCancelTransfer}
              onPreviewFile={(item) => setPreviewFileItem(item)}
              onClearQueue={handleClearQueue}
            />
          </div>

          {/* Text / Clipboard Transfer Column */}
          <div className="lg:col-span-5">
            <TextTransfer
              onSendText={handleSendText}
              receivedTextItems={clipboardItems}
            />
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/40 bg-[#0D0F13] py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-widest">Mavxon Share E2EE Engine Active</span>
          </div>
          <div className="text-[11px] text-slate-400">
            End-to-End Encrypted via Web Crypto API (<span className="font-mono text-emerald-400">AES-256-GCM</span>)
          </div>
        </div>
      </footer>

      {/* Modals */}
      <QRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        roomId={roomState.roomId}
        secretKey={roomState.secretKey}
      />

      <SecurityInspector
        isOpen={isSecurityInspectorOpen}
        onClose={() => setIsSecurityInspectorOpen(false)}
        fingerprint={fingerprint}
        rawPayloadLogs={rawPayloadLogs}
      />

      <FilePreviewModal
        item={previewFileItem}
        onClose={() => setPreviewFileItem(null)}
      />

    </div>
  );
}
