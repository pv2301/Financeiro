
import { db } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

async function inspectConsumption() {
  console.log("--- INSPEÇÃO DE CONSUMO ---");
  try {
    const q = query(collection(db, "fin_consumption"));
    const snap = await getDocs(q);
    console.log(`Total de documentos na coleção: ${snap.size}`);
    
    snap.docs.slice(0, 5).forEach(doc => {
      console.log(`Doc ID: ${doc.id}`, doc.data());
    });

  } catch (err: any) {
    console.error("ERRO DE INSPEÇÃO:", err.message);
  }
}

inspectConsumption();
