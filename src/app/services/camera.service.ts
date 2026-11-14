import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/** Motivo de a câmera não ter aberto, para a interface escolher a mensagem certa. */
export type CameraErrorKind = 'denied' | 'notFound' | 'insecure' | 'busy' | 'unknown';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private streamSubject = new BehaviorSubject<MediaStream | null>(null);
  public stream$ = this.streamSubject.asObservable();
  private stream: MediaStream | null = null;
  private subscribers = 0;

  /** Classifica o erro do `getUserMedia` (ou a falta da API) em um motivo exibível. */
  static errorKind(err: unknown): CameraErrorKind {
    const name = (err as { name?: string } | null)?.name ?? '';
    const message = (err as { message?: string } | null)?.message ?? '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'denied';
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'notFound';
    if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'busy';
    if (/secure context/i.test(message)) return 'insecure';
    return 'unknown';
  }

  async startCamera(): Promise<MediaStream> {
    if (this.stream && this.stream.active) {
      this.subscribers++;
      return this.stream;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // A API só existe em contexto seguro (HTTPS ou localhost).
      throw new Error('Camera API not available (Secure Context required)');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    });

    // Outro pedido pode ter aberto a câmera enquanto este aguardava a permissão.
    if (this.stream && this.stream.active) {
      stream.getTracks().forEach(track => track.stop());
      this.subscribers++;
      return this.stream;
    }

    this.subscribers++;
    this.stream = stream;
    this.streamSubject.next(stream);

    // A faixa pode terminar sozinha (câmera desconectada, permissão revogada).
    const [track] = stream.getVideoTracks();
    if (track) {
      track.onended = () => {
        if (this.stream === stream) this.handleStreamEnd();
      };
    }

    return stream;
  }

  stopCamera() {
    this.subscribers--;

    if (this.subscribers <= 0) {
      this.forceStopCamera();
    }
  }

  private forceStopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.streamSubject.next(null);
    }
    this.subscribers = 0;
  }

  private handleStreamEnd() {
    this.stream = null;
    this.streamSubject.next(null);
    this.subscribers = 0;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }
}
