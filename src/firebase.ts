import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
export const auth = getAuth(app);
export const storage = getStorage(app);

// Validate Connection removed to avoid permission errors during initialization.

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  ADD = 'add',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  uid: string | undefined;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Detecção de Bloqueio por Ad-Blocker ou Firewall
  const isBlocked = 
    errorMessage.includes('ERR_BLOCKED_BY_CLIENT') || 
    errorMessage.toLowerCase().includes('failed to fetch') ||
    (error as any)?.code === 'unavailable' ||
    !window.navigator.onLine;

  const errInfo: FirestoreErrorInfo = {
    error: isBlocked 
      ? 'CONEXÃO BLOQUEADA: Verifique se o seu Ad-Blocker (uBlock, etc) está bloqueando as requisições para o Firestore. Desative-o para este site.' 
      : errorMessage,
    uid: auth.currentUser?.uid,
    operationType,
    path,
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Despacha um evento global para que componentes de UI possam reagir (ex: mostrar Toast)
  window.dispatchEvent(new CustomEvent('hub-error', { 
    detail: { message: isBlocked ? errInfo.error : errorMessage, info: errInfo } 
  }));

  // Se for bloqueio, lançamos uma mensagem limpa para o usuário
  if (isBlocked) {
    throw new Error(errInfo.error);
  }

  throw new Error(JSON.stringify(errInfo));
}
