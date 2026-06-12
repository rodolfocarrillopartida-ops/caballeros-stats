#!/bin/bash
APP_DIR="/Users/rodolfocarrillo/Library/Application Support/Claude/local-agent-mode-sessions/11c366bd-973f-4da1-a041-c853a7127f81/f09d9b32-4b9c-4bbd-af86-31e260caaed5/local_e8a0a49a-a844-43c4-8c47-a8e069aa1f52/outputs/caballeros_stats"
cd "$APP_DIR"

if [ ! -d "venv" ]; then
  python3 -m venv venv
  source venv/bin/activate
  pip install flask flask-sqlalchemy flask-cors anthropic reportlab python-dotenv -q
else
  source venv/bin/activate
fi

python3 app.py >> "$APP_DIR/caballeros.log" 2>&1
