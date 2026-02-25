from flask import Flask, jsonify, send_file, send_from_directory
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_cors import CORS
from datetime import timedelta
from dotenv import load_dotenv
import os

from auth import auth_bp
from records import records_bp
from visits import visits_bp
from database import get_connection

load_dotenv()

app = Flask(__name__, static_folder="frontend", static_url_path="")

CORS(app)

app.config["JWT_SECRET_KEY"] = os.getenv(
    "JWT_SECRET_KEY",
    "medical_history_vault_super_secure_key_2026_secure"
)
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=5)

jwt = JWTManager(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(records_bp, url_prefix="/records")
app.register_blueprint(visits_bp, url_prefix="/visits")

# Serve login page
@app.route("/")
def home():
    return app.send_static_file("login.html")

# Serve uploaded images
@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory("uploads", filename)

# Dashboard summary
@app.route("/dashboard-summary", methods=["GET"])
@jwt_required()
def dashboard_summary():
    user_id = int(get_jwt_identity())

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) AS total FROM records WHERE user_id=%s", (user_id,))
    total_records = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) AS total FROM visits WHERE user_id=%s", (user_id,))
    total_visits = cursor.fetchone()["total"]

    cursor.close()
    conn.close()

    return jsonify({
        "total_records": total_records,
        "total_visits": total_visits
    })

if __name__ == "__main__":
    app.run(debug=True)