@echo off
echo.
echo ============================================
echo    CABALLEROS DE CULIACÁN -- CIBACOPA
echo    Sistema de Estadísticas
echo ============================================
echo.

if not exist venv (
    echo Creando entorno virtual...
    python -m venv venv
)

call venv\Scripts\activate

echo Instalando dependencias...
pip install -r requirements.txt -q

if not exist .env (
    copy .env.example .env
    echo.
    echo IMPORTANTE: Edita .env y agrega tu ANTHROPIC_API_KEY
    echo.
)

echo.
echo Iniciando servidor en http://localhost:5000
echo Presiona Ctrl+C para detener.
echo.

python app.py
pause
