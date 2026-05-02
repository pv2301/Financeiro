import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

async function run() {
  const studentsSnap = await getDocs(collection(db, "students"));
  const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const ant = students.find((s: any) => s.name?.toUpperCase().includes("ANTÔNIO NEVES") || s.name?.toUpperCase().includes("ANTONIO NEVES"));
  if (!ant) {
    console.log("Antonio not found");
    return;
  }
  console.log("Found Student:", ant.name, "BirthDate:", ant.birthDate, "Segment:", ant.segment);

  const classesSnap = await getDocs(collection(db, "classes"));
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const studentClass = classes.find((c: any) => c.id === ant.classId);
  console.log("Found Class:", studentClass?.name, studentClass?.segment, studentClass?.billingMode);

  const servicesSnap = await getDocs(collection(db, "services"));
  const services = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log("Services loaded:", services.length);

  const consSnap = await getDocs(collection(db, "fin_consumption"));
  const consumptions = consSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const cons = consumptions.filter((c: any) => c.studentId === ant.id);
  console.log("Consumption for Antonio:", JSON.stringify(cons, null, 2));

  services.forEach((s: any) => {
    console.log(`Service: ${s.name}, prices:`, JSON.stringify(s.priceByKey));
  });

  process.exit(0);
}

run().catch(console.error);
