from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from datetime import timedelta
from auth import auth_bp
from records import records_bp
from visits import visits_bp
from flask import send_from_directory
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__, static_folder="frontend", static_url_path="")

CORS(app, resources={r"/*": {"origins": "*"}})

app.config["JWT_SECRET_KEY"] = "super-secret-key"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=5)

jwt = JWTManager(app)

app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(records_bp, url_prefix="/records")
app.register_blueprint(visits_bp, url_prefix="/visits")

@app.route("/")
def home():
    return app.send_static_file("login.html")

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory('uploads', filename)

if __name__ == "__main__":
    app.run(debug=True)