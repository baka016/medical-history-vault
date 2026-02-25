from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_connection

visits_bp = Blueprint("visits", __name__)

@visits_bp.route("/add", methods=["POST"])
@jwt_required()
def add_visit():
    user_id = int(get_jwt_identity())
    data = request.json

    doctor_name = data.get("doctor_name")
    hospital = data.get("hospital")
    visit_date = data.get("visit_date")
    condition_name = data.get("condition_name")
    notes = data.get("notes")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO visits 
        (user_id, doctor_name, hospital, visit_date, condition_name, notes)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (user_id, doctor_name, hospital, visit_date, condition_name, notes))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Visit added successfully"}), 201

@visits_bp.route("/my-visits", methods=["GET"])
@jwt_required()
def get_visits():
    user_id = int(get_jwt_identity())

    condition = request.args.get("condition")
    date = request.args.get("date")

    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM visits WHERE user_id=%s"
    params = [user_id]

    if condition:
        query += " AND condition_name LIKE %s"
        params.append(f"%{condition}%")

    if date:
        query += " AND visit_date=%s"
        params.append(date)

    cursor.execute(query, tuple(params))
    visits = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(visits), 200