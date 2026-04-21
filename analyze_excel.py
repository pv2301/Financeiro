import pandas as pd
import sys

def analyze_excel(file_path, sheets=None):
    try:
        with open("analysis_output.txt", "a", encoding="utf-8") as f:
            xls = pd.ExcelFile(file_path)
            f.write(f"--- Analysis of {file_path} ---\n")
            f.write(f"Available Sheets: {xls.sheet_names}\n")
            
            target_sheets = sheets if sheets else xls.sheet_names[:2]
            
            for sheet in target_sheets:
                if sheet in xls.sheet_names:
                    df = pd.read_excel(xls, sheet_name=sheet, nrows=30)
                    df = df.dropna(how='all', axis=1).dropna(how='all', axis=0)
                    f.write(f"\nSheet: {sheet}\n")
                    f.write(f"Columns: {list(df.columns)}\n")
                    f.write("First 20 rows:\n")
                    f.write(df.head(20).to_string() + "\n")
                else:
                    f.write(f"\nSheet '{sheet}' not found in {file_path}\n")
            f.write("\n" + "="*50 + "\n\n")
    except Exception as e:
        with open("analysis_output.txt", "a", encoding="utf-8") as f:
            f.write(f"Error reading {file_path}: {e}\n")

analyze_excel(r"C:\Users\paulo\Downloads\canteen\CFC BOLETOS VENCIDOS.xlsx", ["GERAL", "VALORES RECEBIDOS DIARIO"])
analyze_excel(r"C:\Users\paulo\Downloads\canteen\CFC BOLETO FUNDAMENTAL 2026.xlsx", ["ABRIL"])
analyze_excel(r"C:\Users\paulo\Downloads\canteen\Relatorio Cardapios Consumidos (1).xls", ["Cardapios"])
