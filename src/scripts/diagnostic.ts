
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

async function runDiagnostic() {
  console.log("--- INICIANDO DIAGNÓSTICO DE DADOS ---");
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Tenta ler a coleção de consumo
    console.log("Consultando coleção 'fin_consumption'...");
    const q = query(collection(db, "fin_consumption"), limit(1));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      console.log("RESULTADO: Coleção 'fin_consumption' está VAZIA.");
    } else {
      const data = snap.docs[0].data();
      console.log("RESULTADO: Dados encontrados!");
      console.log("CAMPOS DISPONÍVEIS:", Object.keys(data).join(", "));
      console.log("EXEMPLO DE REGISTRO:", JSON.stringify(data));
    }
  } catch (err: any) {
    console.error("ERRO CRÍTICO:", err.message);
  }
}

runDiagnostic();
