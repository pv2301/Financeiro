
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = "C:/Users/paulo/Downloads/Tallita/Relatorio Cardapios Consumidos abril 2.xlsx";

function analyzeExcelDeep() {
  console.log("--- ANÁLISE PROFUNDA DA PLANILHA ---");
  try {
    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Header 1 traz como array de arrays

    console.log("Visualizando primeiras 15 linhas:");
    data.slice(0, 15).forEach((row, i) => {
      console.log(`Linha ${i}:`, JSON.stringify(row));
    });

  } catch (err: any) {
    console.error("ERRO:", err.message);
  }
}

analyzeExcelDeep();
