import * as xlsx from 'xlsx';
import * as fs from 'fs';

const filePath = 'C:/Users/paulo/Downloads/Tallita/Relatorio Cardapios Consumidos abril 2.xlsx';

if (fs.existsSync(filePath)) {
    const workbook = xlsx.readFile(filePath);

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    
    if (data.length > 0) {
        console.log("HEADERS DETECTED:");
        console.log(data[0]);
    } else {
        console.log("Sheet is empty");
    }
} else {
    console.log("File not found: " + filePath);
}
