(global as any).window = {
    navigator: { onLine: true },
    dispatchEvent: () => {}
};
(global as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};
(global as any).CustomEvent = class {};

import { finance } from '../services/finance';

import { calculateStudentInvoice, getPriceKey } from '../lib/finance-logic';
import { Student, ServiceItem, ClassInfo } from '../types';

async function runTest() {
    console.log("🚀 Iniciando Teste de Faturamento Real (Abril/2026)...");
    
    const monthYear = "04/2026";
    const ageRefDay = 1; // Dia base para idade
    
    // 1. Carregar Dados do DB
    const students = await finance.getStudents();
    const services = await finance.getServices();
    const classes = await finance.getClasses();
    const consumptionData = await finance.getConsumptionByMonth(monthYear);
    
    console.log(`📊 Dados Carregados: ${students.length} alunos, ${services.length} serviços, ${consumptionData.length} registros de consumo.`);

    const targets = ["AMELIE CHIANCA SANTOS MACARIO", "ANTÔNIO NEVES DO RÊGO BARROS"];
    
    for (const name of targets) {
        const student = students.find(s => s.name.toUpperCase() === name.toUpperCase());
        if (!student) {
            console.log(`❌ Aluno não encontrado: ${name}`);
            continue;
        }

        const studentClass = classes.find(c => c.id === student.classId);
        const consumption = consumptionData.find(d => d.studentId === student.id);

        if (!consumption) {
            console.log(`⚠️ Consumo não encontrado para: ${name}`);
            continue;
        }

        console.log(`\n--- [ ${name} ] ---`);
        console.log(`Turma: ${studentClass?.name} | Idade Ref: ${student.birthDate ? "Calculando..." : "N/A"}`);
        
        const priceKey = getPriceKey(studentClass!, student, monthYear, ageRefDay);
        console.log(`Chave de Preço Aplicada: ${priceKey}`);
        console.log(`Resumo de Consumo:`, consumption.summary);

        const result = calculateStudentInvoice({
            student,
            studentClass: { ...studentClass!, billingMode: 'POSTPAID_CONSUMPTION' },
            services,
            consumption,
            manualAbsences: 0,
            businessDays: 20,
            monthYear,
            ageRefDay,
            emissionFee: 0
        });

        console.log(`✅ RESULTADO:`);
        console.log(`   Valor Bruto: R$ ${result.grossAmount?.toFixed(2)}`);
        console.log(`   Desconto Combo (10% se >1 serv): R$ ${result.comboDiscountAmount?.toFixed(2)}`);
        console.log(`   Valor Líquido: R$ ${result.netAmount?.toFixed(2)}`);
        
        if (result.grossAmount === 0) {
            console.log("   ❌ ALERTA: Valor bruto zerado! Verificando motivos...");
            Object.keys(consumption.summary).forEach(snackName => {
                const n = snackName.toUpperCase().trim();
                const svc = services.find(s => s.name.toUpperCase() === n);
                console.log(`     - Serviço '${snackName}': ${svc ? "ENCONTRADO" : "NÃO ENCONTRADO"}`);
                if (svc) {
                    console.log(`       Preço para ${priceKey}: R$ ${svc.priceByKey[priceKey] || 0}`);
                }
            });
        }
    }
}

runTest().catch(console.error);
