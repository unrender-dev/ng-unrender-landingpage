import { dict } from '../i18n/i18n.service';
import type { CameraErrorKind } from './camera.service';

/** Textos de câmera compartilhados pelas demonstrações que pedem acesso a ela. */
export const CAMERA_I18N = dict({
  pt: {
    start: 'Ligar câmera',
    stop: 'Parar câmera',
    retry: 'Tentar de novo',
    starting: 'Iniciando câmera…',
    privacy: 'O vídeo é processado no seu navegador e não sai do seu aparelho.',
    denied: 'Acesso à câmera negado. Libere a permissão nas configurações do navegador e tente de novo.',
    notFound: 'Nenhuma câmera encontrada neste aparelho.',
    insecure: 'A câmera só funciona em conexão segura (HTTPS).',
    busy: 'A câmera está em uso por outro aplicativo. Feche-o e tente de novo.',
    unknown: 'Não foi possível abrir a câmera. Tente de novo.',
  },
  en: {
    start: 'Turn on camera',
    stop: 'Stop camera',
    retry: 'Try again',
    starting: 'Starting camera…',
    privacy: 'Video is processed in your browser and never leaves your device.',
    denied: 'Camera access was denied. Allow it in your browser settings and try again.',
    notFound: 'No camera was found on this device.',
    insecure: 'The camera only works over a secure connection (HTTPS).',
    busy: 'The camera is being used by another app. Close it and try again.',
    unknown: 'We couldn’t open the camera. Please try again.',
  },
  es: {
    start: 'Encender cámara',
    stop: 'Detener cámara',
    retry: 'Reintentar',
    starting: 'Iniciando la cámara…',
    privacy: 'El video se procesa en tu navegador y no sale de tu dispositivo.',
    denied: 'Se denegó el acceso a la cámara. Actívalo en la configuración del navegador e inténtalo de nuevo.',
    notFound: 'No se encontró ninguna cámara en este dispositivo.',
    insecure: 'La cámara solo funciona con una conexión segura (HTTPS).',
    busy: 'Otra aplicación está usando la cámara. Ciérrala e inténtalo de nuevo.',
    unknown: 'No se pudo abrir la cámara. Inténtalo de nuevo.',
  },
  fr: {
    start: 'Activer la caméra',
    stop: 'Arrêter la caméra',
    retry: 'Réessayer',
    starting: 'Démarrage de la caméra…',
    privacy: 'La vidéo est traitée dans votre navigateur et ne quitte jamais votre appareil.',
    denied: 'Accès à la caméra refusé. Autorisez-le dans les réglages du navigateur, puis réessayez.',
    notFound: 'Aucune caméra détectée sur cet appareil.',
    insecure: 'La caméra ne fonctionne qu’avec une connexion sécurisée (HTTPS).',
    busy: 'La caméra est utilisée par une autre application. Fermez-la, puis réessayez.',
    unknown: 'Impossible d’ouvrir la caméra. Veuillez réessayer.',
  },
});

export type CameraTextKey = keyof (typeof CAMERA_I18N)['pt'];

/** Os motivos de erro usam a mesma grafia das chaves de texto. */
export function cameraErrorKey(kind: CameraErrorKind): CameraTextKey {
  return kind;
}
