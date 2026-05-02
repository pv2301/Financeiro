
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = "C:/Users/paulo/Downloads/Tallita/Relatorio Cardapios Consumidos abril 2.xlsx";

function analyzeExcel() {
  console.log("--- ANALISANDO PLANILHA DE CONSUMO ---");
  try {
    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log("Qtd de linhas encontradas:", data.length);
    console.log("Colunas detectadas:", Object.keys(data[0] || {}).join(", "));
    console.log("Exemplo de linha (JSON):", JSON.stringify(data[0]));
    
    // Procura por campos de data ou período
    const possibleDateFields = Object.keys(data[0] || {}).filter(k => k.toLowerCase().includes('data') || k.toLowerCase().includes('periodo') || k.toLowerCase().includes('mes'));
    console.log("Campos de data sugeridos:", possibleDateFields);

  } catch (err: any) {
    console.error("ERRO AO LER PLANILHA:", err.message);
  }
}

analyzeExcel();
