
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = "C:/Users/paulo/Downloads/Tallita/Relatorio Cardapios Consumidos abril 2.xlsx";

function analyzeExcelDeeper() {
  console.log("--- BUSCANDO TOTAIS NA PLANILHA ---");
  try {
    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log("Visualizando linhas 20 a 50:");
    data.slice(20, 50).forEach((row, i) => {
      console.log(`Linha ${i+20}:`, JSON.stringify(row));
    });

  } catch (err: any) {
    console.error("ERRO:", err.message);
  }
}

analyzeExcelDeeper();
