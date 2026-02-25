from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_connection
from utils.ocr import extract_text
from utils.categorizer import categorize
import os
import uuid
from flask import send_file
from utils.pdf_export import generate_medical_pdf

records_bp = Blueprint("records", __name__)

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@records_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_record():
    user_id = int(get_jwt_identity())

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    filename = str(uuid.uuid4()) + "_" + file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    extracted_text = extract_text(filepath)
    category = categorize(extracted_text)

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
    """INSERT INTO records 
       (user_id, title, category, image_path, extracted_text)
       VALUES (%s, %s, %s, %s, %s)""",
    (user_id, file.filename, category, filename, extracted_text)
    )

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "message": "File uploaded successfully",
        "category": category
    }), 201

@records_bp.route("/my-records", methods=["GET"])
@jwt_required()
def get_my_records():
    user_id = int(get_jwt_identity())

    category = request.args.get("category")

    conn = get_connection()
    cursor = conn.cursor()

    if category:
        cursor.execute(
            "SELECT id, title, category, image_path, upload_date FROM records WHERE user_id=%s AND category=%s",
            (user_id, category)
        )
    else:
        cursor.execute(
            "SELECT id, title, category, image_path, upload_date FROM records WHERE user_id=%s",
            (user_id,)
        )

    records = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(records), 200

@records_bp.route("/export", methods=["GET"])
@jwt_required()
def export_pdf():
    user_id = int(get_jwt_identity())

    filename = f"medical_report_user_{user_id}.pdf"
    filepath = os.path.join("uploads", filename)

    generate_medical_pdf(user_id, filepath)

    return send_file(filepath, as_attachment=True)

@records_bp.route("/emergency-summary", methods=["GET"])
@jwt_required()
def emergency_summary():
    user_id = int(get_jwt_identity())

    conn = get_connection()
    cursor = conn.cursor()

    # Latest prescription
    cursor.execute("""
        SELECT title, upload_date 
        FROM records 
        WHERE user_id=%s AND category='Prescription'
        ORDER BY upload_date DESC LIMIT 1
    """, (user_id,))
    latest_prescription = cursor.fetchone()

    # Latest lab report
    cursor.execute("""
        SELECT title, upload_date 
        FROM records 
        WHERE user_id=%s AND category='Lab Results'
        ORDER BY upload_date DESC LIMIT 1
    """, (user_id,))
    latest_lab = cursor.fetchone()

    # Last visit
    cursor.execute("""
        SELECT doctor_name, visit_date, condition_name 
        FROM visits 
        WHERE user_id=%s 
        ORDER BY visit_date DESC LIMIT 1
    """, (user_id,))
    last_visit = cursor.fetchone()

    cursor.close()
    conn.close()

    return jsonify({
        "latest_prescription": latest_prescription,
        "latest_lab_report": latest_lab,
        "last_visit": last_visit
    })

@records_bp.route("/search", methods=["GET"])
@jwt_required()
def global_search():
    user_id = int(get_jwt_identity())
    query = request.args.get("q")

    conn = get_connection()
    cursor = conn.cursor()

    # Search records
    cursor.execute("""
        SELECT 'record' AS type, title AS main, category AS extra, upload_date AS date
        FROM records
        WHERE user_id=%s AND (title LIKE %s OR category LIKE %s)
    """, (user_id, f"%{query}%", f"%{query}%"))

    record_results = cursor.fetchall()

    # Search visits
    cursor.execute("""
        SELECT 'visit' AS type, condition_name AS main, doctor_name AS extra, visit_date AS date
        FROM visits
        WHERE user_id=%s AND (condition_name LIKE %s OR doctor_name LIKE %s)
    """, (user_id, f"%{query}%", f"%{query}%"))

    visit_results = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(record_results + visit_results)