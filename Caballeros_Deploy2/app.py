import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from models import db
from dotenv import load_dotenv

load_dotenv()


def create_app():
    app = Flask(__name__, static_folder='static', template_folder='templates')

    # Configuración
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = (
        os.getenv('DATABASE_URL') or
        f"sqlite:///{os.path.join(basedir, 'instance', 'caballeros.db')}"
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'caballeros-cibacopa-2024')

    # Inicializar extensiones
    db.init_app(app)
    CORS(app)

    # Registrar blueprints
    from routes.temporadas import bp as temporadas_bp
    from routes.jugadores import bp as jugadores_bp
    from routes.partidos import bp as partidos_bp
    from routes.analisis import bp as analisis_bp
    from routes.reportes import bp as reportes_bp

    app.register_blueprint(temporadas_bp)
    app.register_blueprint(jugadores_bp)
    app.register_blueprint(partidos_bp)
    app.register_blueprint(analisis_bp)
    app.register_blueprint(reportes_bp)

    # Ruta para servir el frontend
    @app.route('/')
    @app.route('/<path:path>')
    def serve_frontend(path=''):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    # Crear tablas si no existen
    with app.app_context():
        os.makedirs(os.path.join(basedir, 'instance'), exist_ok=True)
        db.create_all()
        print("✓ Base de datos inicializada")

    return app


if __name__ == '__main__':
    app = create_app()
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'false').lower() == 'true'
    print(f"\n🏀 Caballeros de Culiacán — Sistema de Estadísticas")
    print(f"🌐 Servidor corriendo en http://{host}:{port}")
    print(f"📱 Acceso en red local: http://[IP-de-esta-computadora]:{port}\n")
    app.run(host=host, port=port, debug=debug)
