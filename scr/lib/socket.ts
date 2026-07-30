import { PeerInfo } from '../types';

type MessageCallback = (data: any) => void;

export class SignalingSocket {
  private ws: WebSocket | null = null;
  private url: string = '';
  private messageListeners: Set<MessageCallback> = new Set();
  private isConnected: boolean = false;
  private reconnectTimer: any = null;
  private currentRoomId: string = '';
  private deviceType: 'pc' | 'phone' | 'browser' = 'browser';
  private deviceName: string = '';

  public selfPeerId: string | null = null;

  constructor() {
    // Detect default device type
    const ua = navigator.userAgent.toLowerCase();
    if (/android|iphone|ipad|ipod|mobile/i.test(ua)) {
      this.deviceType = 'phone';
      this.deviceName = /iphone|ipad|ipod/i.test(ua) ? 'Apple iPhone' : 'Android Mobile';
    } else {
      this.deviceType = 'pc';
      this.deviceName = navigator.platform.includes('Mac') ? 'Mac Workstation' : 'Windows PC';
    }
  }

  public connect(roomId: string, customDeviceType?: 'pc' | 'phone' | 'browser'): Promise<void> {
    this.currentRoomId = roomId;
    if (customDeviceType) this.deviceType = customDeviceType;

    return new Promise((resolve, reject) => {
      this.close();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      this.url = `${protocol}//${host}/ws?room=${encodeURIComponent(roomId)}&device=${this.deviceType}&name=${encodeURIComponent(this.deviceName)}`;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnected = true;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ROOM_JOINED') {
              this.selfPeerId = data.selfId;
            }
            this.notifyListeners(data);
          } catch (err) {
            console.error('Error parsing WS event:', err);
          }
        };

        this.ws.onerror = (err) => {
          console.error('WebSocket Error:', err);
          if (!this.isConnected) {
            reject(err);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.notifyListeners({ type: 'DISCONNECTED' });
          // Auto reconnect if room is set
          if (this.currentRoomId && !this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.connect(this.currentRoomId, this.deviceType).catch(() => {});
            }, 3000);
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  public send(data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  public onMessage(callback: MessageCallback): () => void {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  private notifyListeners(data: any) {
    for (const listener of this.messageListeners) {
      try {
        listener(data);
      } catch (e) {
        console.error('Error in WS listener callback:', e);
      }
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const socketService = new SignalingSocket();
