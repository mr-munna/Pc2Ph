import { socketService } from './socket';

type DataChannelCallback = (data: any) => void;

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private targetPeerId: string | null = null;
  private onDataCallback: DataChannelCallback | null = null;
  private onStateChangeCallback: ((state: RTCPeerConnectionState) => void) | null = null;

  private isInitiator: boolean = false;

  constructor() {
    this.listenToSignaling();
  }

  public setOnDataReceived(callback: DataChannelCallback) {
    this.onDataCallback = callback;
  }

  public setOnStateChange(callback: (state: RTCPeerConnectionState) => void) {
    this.onStateChangeCallback = callback;
  }

  public async connectToPeer(remotePeerId: string) {
    this.targetPeerId = remotePeerId;
    this.isInitiator = true;
    this.createPeerConnection();

    if (!this.peerConnection) return;

    // Create Data Channel for P2P file transfers
    this.dataChannel = this.peerConnection.createDataChannel('cipherdrop_channel', {
      ordered: true
    });

    this.setupDataChannelEvents(this.dataChannel);

    // Create WebRTC Offer
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      socketService.send({
        type: 'WEBRTC_OFFER',
        targetPeerId: remotePeerId,
        sdp: offer
      });
    } catch (err) {
      console.warn('WebRTC offer error, falling back to WebSocket relay:', err);
    }
  }

  private createPeerConnection() {
    this.close();

    // Standard public STUN servers for WebRTC ICE traversal
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

    try {
      this.peerConnection = new RTCPeerConnection(config);

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.targetPeerId) {
          socketService.send({
            type: 'WEBRTC_ICE_CANDIDATE',
            targetPeerId: this.targetPeerId,
            candidate: event.candidate
          });
        }
      };

      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannelEvents(this.dataChannel);
      };

      this.peerConnection.onconnectionstatechange = () => {
        if (this.peerConnection && this.onStateChangeCallback) {
          this.onStateChangeCallback(this.peerConnection.connectionState);
        }
      };
    } catch (err) {
      console.warn('RTCPeerConnection not supported or failed:', err);
    }
  }

  private setupDataChannelEvents(channel: RTCDataChannel) {
    // 2MB buffer low threshold for high-speed streaming without backpressure bufferbloat
    channel.bufferedAmountLowThreshold = 2 * 1024 * 1024;

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onDataCallback) {
          this.onDataCallback(data);
        }
      } catch (e) {
        console.error('Error handling DataChannel message:', e);
      }
    };

    channel.onopen = () => {
      if (this.onStateChangeCallback && this.peerConnection) {
        this.onStateChangeCallback(this.peerConnection.connectionState);
      }
    };
  }

  public getBufferedAmount(): number {
    return this.dataChannel ? this.dataChannel.bufferedAmount : 0;
  }

  public async waitForBufferDrain(maxBufferedBytes = 4 * 1024 * 1024): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
    if (this.dataChannel.bufferedAmount < maxBufferedBytes) return;

    return new Promise((resolve) => {
      if (!this.dataChannel) return resolve();
      const onLow = () => {
        if (this.dataChannel) {
          this.dataChannel.removeEventListener('bufferedamountlow', onLow);
        }
        resolve();
      };
      this.dataChannel.addEventListener('bufferedamountlow', onLow, { once: true });
      setTimeout(onLow, 100); // 100ms fallback timeout
    });
  }

  private listenToSignaling() {
    socketService.onMessage(async (data) => {
      if (data.type === 'WEBRTC_OFFER') {
        this.targetPeerId = data.senderPeerId;
        this.isInitiator = false;
        this.createPeerConnection();

        if (this.peerConnection) {
          try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            socketService.send({
              type: 'WEBRTC_ANSWER',
              targetPeerId: data.senderPeerId,
              sdp: answer
            });
          } catch (e) {
            console.warn('Error handling WEBRTC_OFFER:', e);
          }
        }
      } else if (data.type === 'WEBRTC_ANSWER') {
        if (this.peerConnection) {
          try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
          } catch (e) {
            console.warn('Error handling WEBRTC_ANSWER:', e);
          }
        }
      } else if (data.type === 'WEBRTC_ICE_CANDIDATE') {
        if (this.peerConnection && data.candidate) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.warn('Error adding ICE candidate:', e);
          }
        }
      }
    });
  }

  public sendData(data: any): boolean {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(data));
        return true;
      } catch (e) {
        console.warn('DataChannel send failed, will use WebSocket fallback:', e);
      }
    }
    return false;
  }

  public isDirectP2PAvailable(): boolean {
    return !!(this.dataChannel && this.dataChannel.readyState === 'open');
  }

  public close() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

export const webRTCService = new WebRTCManager();
