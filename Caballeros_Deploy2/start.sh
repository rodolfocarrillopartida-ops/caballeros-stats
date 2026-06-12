#!/bin/bash
# ============================================
# Caballeros de Culiacán — Sistema de Stats
# Script de inicio rápido
# ============================================

echo ""
echo "🏀 ============================================"
echo "   CABALLEROS DE CULIACÁN — CIBACOPA"
echo "   Sistema de Estadísticas"
echo "============================================"
echo ""

# Verificar Python 3
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 no encontrado. Instálalo desde https://python.org"
    exit 1
fi

# Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
echo "📦 Instalando dependencias..."
pip install -r requirements.txt -q

# Crear .env si no existe
if [ ! -f ".env" ]; then
    echo "⚙️  Creando archivo .env..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANTE: Edita el archivo .env y agrega tu ANTHROPIC_API_KEY"
    echo "   para usar el análisis IA con Claude."
    echo ""
fi

# Obtener IP local
IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -1)
if [ -z "$IP" ]; then
    IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

echo ""
echo "🚀 Iniciando servidor..."
echo ""
echo "✅ App disponible en:"
echo "   → Esta computadora: http://localhost:5000"
if [ ! -z "$IP" ]; then
    echo "   → Red local (coach/asistentes): http://${IP}:5000"
fi
echo ""
echo "Presiona Ctrl+C para detener."
echo ""

python3 app.py
