import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase-applet-config.json'), 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkServices() {
  const snap = await getDocs(collection(db, 'fin_snacks'));
  console.log('Services Count:', snap.size);
  snap.forEach(d => {
    console.log(`Service: ${d.id} - ${d.data().name}`);
    console.log('Prices:', JSON.stringify(d.data().priceByKey, null, 2));
  });
  process.exit(0);
}

checkServices();
