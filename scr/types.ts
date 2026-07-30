export type DeviceType = 'pc' | 'phone' | 'browser';

export interface PeerInfo {
  id: string;
  deviceType: DeviceType;
  deviceName: string;
  joinedAt: number;
}

export interface SecurityFingerprint {
  hashHex: string;
  words: string[];
  emojis: string[];
  colorBlocks: string[];
}

export interface TransferFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  senderPeerId: string;
  senderName: string;
  recipientPeerId?: string;
  status: 'pending' | 'encrypting' | 'transferring' | 'decrypting' | 'completed' | 'error' | 'cancelled';
  progress: number; // 0 to 100
  speedBytesPerSec: number;
  transferredBytes: number;
  totalChunks: number;
  processedChunks: number;
  blobUrl?: string;
  fileObject?: File;
  error?: string;
  direction: 'outgoing' | 'incoming';
  isEncrypted: boolean;
  startTime?: number;
  endTime?: number;
}

export interface EncryptedClipboardItem {
  id: string;
  senderPeerId: string;
  senderName: string;
  ciphertextHex: string;
  ivHex: string;
  decryptedText?: string;
  timestamp: number;
}

export interface WebRTCStats {
  connectionState: RTCPeerConnectionState | 'disconnected';
  iceGatheringState: RTCIceGatheringState | 'new';
  transportMode: 'p2p_webrtc' | 'websocket_relay';
  roundTripTimeMs?: number;
}

export interface RoomState {
  roomId: string;
  secretKey: string; // Master passphrase or hash fragment
  keyFingerprint?: SecurityFingerprint;
  peers: PeerInfo[];
  selfPeerId: string | null;
  isConnected: boolean;
  isJoinedRoom: boolean;
  transportMode: 'p2p_webrtc' | 'websocket_relay';
}
