import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const oldCols = ['students', 'classes', 'snacks', 'invoices', 'consumption', 'audit_logs'];
const newCols = ['fin_students', 'fin_classes', 'fin_snacks', 'fin_invoices', 'fin_consumption', 'fin_audit_logs'];

async function check() {
  console.log("--- Checking Old Collections ---");
  for (const name of oldCols) {
    try {
      const snap = await getDocs(query(collection(db, name), limit(1)));
      console.log(`${name}: ${snap.empty ? 'Empty' : 'HAS DATA (' + snap.size + '+)'}`);
    } catch (e: any) {
      console.log(`${name}: Error - ${e.message}`);
    }
  }

  console.log("\n--- Checking New Collections ---");
  for (const name of newCols) {
    try {
      const snap = await getDocs(query(collection(db, name), limit(1)));
      console.log(`${name}: ${snap.empty ? 'Empty' : 'HAS DATA (' + snap.size + '+)'}`);
    } catch (e: any) {
      console.log(`${name}: Error - ${e.message}`);
    }
  }
  process.exit(0);
}

check();
