Write-Host "🔧 Setting up Python PDF Converter..." -ForegroundColor Cyan

# Kill old backend
Write-Host "`n1. Stopping old backend..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "   ✅ Done" -ForegroundColor Green

# Check Python
Write-Host "`n2. Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
Write-Host "   Found: $pythonVersion" -ForegroundColor Green

# Install packages
Write-Host "`n3. Installing Python packages..." -ForegroundColor Yellow
python -m pip install --quiet --upgrade pip
python -m pip install --quiet pdf2docx python-docx openpyxl python-pptx
Write-Host "   ✅ Packages installed" -ForegroundColor Green

# Create Python script
Write-Host "`n4. Creating pdf_converter.py..." -ForegroundColor Yellow
cd C:\nixpdf\backend

$pythonScript = @'
#!/usr/bin/env python3
import sys
import os

def pdf_to_word(input_path, output_path):
    try:
        from pdf2docx import Converter
        cv = Converter(input_path)
        cv.convert(output_path)
        cv.close()
        if os.path.exists(output_path):
            print(f"SUCCESS: {output_path}")
            return 0
        else:
            print(f"ERROR: Output file not created", file=sys.stderr)
            return 1
    except ImportError:
        print("ERROR: pdf2docx not installed", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        return 1

def main():
    if len(sys.argv) != 4:
        print("Usage: python pdf_converter.py <format> <input_pdf> <output_file>")
        return 1
    
    format_type = sys.argv[1].lower()
    input_path = sys.argv[2]
    output_path = sys.argv[3]
    
    if not os.path.exists(input_path):
        print(f"ERROR: Input file not found: {input_path}", file=sys.stderr)
        return 1
    
    if format_type == 'word':
        return pdf_to_word(input_path, output_path)
    else:
        print(f"ERROR: Only 'word' format supported", file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
'@

$pythonScript | Out-File -FilePath "pdf_converter.py" -Encoding UTF8
Write-Host "   ✅ Script created" -ForegroundColor Green

# Start backend
Write-Host "`n5. Starting backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\nixpdf\backend; npm run dev"
Write-Host "   ✅ Backend started in new window" -ForegroundColor Green

Write-Host "`n✨ Setup complete!" -ForegroundColor Green
Write-Host "   Backend is running in the new PowerShell window" -ForegroundColor Cyan
Write-Host "   Try PDF to Word conversion now!" -ForegroundColor Cyan
Write-Host ""