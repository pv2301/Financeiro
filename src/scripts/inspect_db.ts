
import { db } from "../firebase.ts";
import { collection, getDocs, query, where } from "firebase/firestore";

async function inspectConsumption() {
  console.log("--- INSPEÇÃO DE CONSUMO ---");
  try {
    const q = query(collection(db, "fin_services"));
    const snap = await getDocs(q);
    console.log(`Total de serviços: ${snap.size}`);
    
    snap.docs.forEach(doc => {
      console.log(`Serviço: ${doc.data().name}`);
      console.log(`Preços:`, JSON.stringify(doc.data().priceByKey, null, 2));
    });

  } catch (err: any) {
    console.error("ERRO DE INSPEÇÃO:", err.message);
  }
}

inspectConsumption();
