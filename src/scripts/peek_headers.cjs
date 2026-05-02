const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'C:/Users/paulo/Downloads/Tallita/Relatorio Cardapios Consumidos abril 2.xlsx';

if (fs.existsSync(filePath)) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length > 0) {
        console.log("FIRST 10 ROWS:");
        data.slice(0, 10).forEach((row, i) => {
            console.log(`Row ${i}: ${JSON.stringify(row)}`);
        });
    } else {

        console.log("Sheet is empty");
    }
} else {
    console.log("File not found: " + filePath);
}
