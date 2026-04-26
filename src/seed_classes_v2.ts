import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase-applet-config.json'), 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CLASSES = [
  // BERÇÁRIO
  { name: 'BABY NINHO A - CF', segment: 'Berçário', billingMode: 'POSTPAID_CONSUMPTION', basePrice: 0 },
  { name: 'BABY NINHO A - ROSARINHO', segment: 'Berçário', billingMode: 'PREPAID_FIXED', basePrice: 244 },
  { name: 'BABY NINHO E - ROSARINHO', segment: 'Berçário', billingMode: 'PREPAID_FIXED', basePrice: 244 },
  { name: 'NINHO A', segment: 'Berçário', billingMode: 'PREPAID_FIXED', basePrice: 270 },
  { name: 'NINHO A - ROSARINHO', segment: 'Berçário', billingMode: 'PREPAID_FIXED', basePrice: 270 },
  { name: 'NINHO B - ROSARINHO', segment: 'Berçário', billingMode: 'PREPAID_FIXED', basePrice: 270 },
  { name: 'NINHO E - CF', segment: 'Berçário', billingMode: 'PREPAID_FIXED', basePrice: 270 },
  { name: 'NINHO E - ROSARINHO', segment: 'Berçário', billingMode: 'PREPAID_FIXED', basePrice: 270 },

  // EDUCAÇÃO INFANTIL
  { name: 'GRUPO 1 A', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290 },
  { name: 'GRUPO 1 B', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290 },
  { name: 'GRUPO 1 C', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290 },
  { name: 'GRUPO 1 D', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290 },
  { name: 'GRUPO 1 E', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290 },
  { name: 'GRUPO 2 A', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290 },
  { name: 'GRUPO 2 B', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290 },
  { name: 'GRUPO 2 E', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290 },
  { name: 'GRUPO 2 F', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290 },
  { name: 'GRUPO 3 A', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290 },
  { name: 'GRUPO 3 B', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290 },
  { name: 'GRUPO 3 E', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290 },
  { name: 'MATERNAL 1 A', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 220 },
  { name: 'MATERNAL A', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 220 },

  // ENSINO FUNDAMENTAL I
  { name: '1º ANO A', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '1º ANO B', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '1º ANO E', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '1º ANO F', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '2º ANO A', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '2º ANO B', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '2º ANO C', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '2º ANO E', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '3º ANO A', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '3º ANO B', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '3º ANO C', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '3º ANO E', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '4º ANO A', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '5º ANO A', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '5º ANO B', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
  { name: '5º ANO C', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0 },
];

async function seed() {
  console.log('Using project:', firebaseConfig.projectId);
  
  // 1. Delete all existing classes
  console.log('Cleaning up existing classes...');
  const snap = await getDocs(collection(db, 'fin_classes'));
  for (const d of snap.docs) {
    await deleteDoc(doc(db, 'fin_classes', d.id));
  }
  console.log(`${snap.size} classes deleted.`);

  // 2. Insert new ones
  console.log('Seeding updated classes...');
  for (const c of CLASSES) {
    // Generate a consistent ID from name
    const id = c.name.replace(/º/g, '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    await setDoc(doc(db, 'fin_classes', id), {
      ...c,
      id,
      applyAbsenceDiscount: true,
      collegeSharePercent: 20
    });
    console.log(`Class ${c.name} [${id}] seeded.`);
  }
  
  console.log('Seeding completed!');
  process.exit(0);
}

seed();
