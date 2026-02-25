from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_connection
from utils.ocr import extract_text
from utils.categorizer import categorize
from utils.pdf_export import generate_medical_pdf
import os
import uuid

records_bp = Blueprint("records", __name__)

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


# ===============================
# Upload Record
# ===============================
@records_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_record():
    user_id = int(get_jwt_identity())

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    filename = str(uuid.uuid4()) + "_" + file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    extracted_text = extract_text(filepath)
    category = categorize(extracted_text)

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO records
        (user_id, title, category, image_path, extracted_text)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (user_id, file.filename, category, filename, extracted_text)
    )

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "message": "File uploaded successfully",
        "category": category
    }), 201


# ===============================
# Get Records (with search + filter)
# ===============================
@records_bp.route("", methods=["GET"])
@jwt_required()
def get_records():
    user_id = int(get_jwt_identity())
    search = request.args.get("search")
    category = request.args.get("category")

    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM records WHERE user_id=%s"
    params = [user_id]

    if search:
        query += " AND (title LIKE %s OR extracted_text LIKE %s)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")

    if category and category != "All":
        query += " AND category=%s"
        params.append(category)

    query += " ORDER BY upload_date DESC"

    cursor.execute(query, tuple(params))
    records = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(records)


# ===============================
# Export PDF
# ===============================
@records_bp.route("/export", methods=["GET"])
@jwt_required()
def export_pdf():
    user_id = int(get_jwt_identity())

    filename = f"medical_report_user_{user_id}.pdf"
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    generate_medical_pdf(user_id, filepath)

    return send_file(filepath, as_attachment=True)


# ===============================
# Emergency Summary
# ===============================
@records_bp.route("/emergency-summary", methods=["GET"])
@jwt_required()
def emergency_summary():
    user_id = int(get_jwt_identity())

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT title, upload_date
        FROM records
        WHERE user_id=%s AND category='Prescription'
        ORDER BY upload_date DESC LIMIT 1
    """, (user_id,))
    latest_prescription = cursor.fetchone()

    cursor.execute("""
        SELECT title, upload_date
        FROM records
        WHERE user_id=%s AND category='Lab Results'
        ORDER BY upload_date DESC LIMIT 1
    """, (user_id,))
    latest_lab = cursor.fetchone()

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