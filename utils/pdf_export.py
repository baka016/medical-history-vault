from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from reportlab.lib.units import inch
from database import get_connection

def generate_medical_pdf(user_id, filename):
    conn = get_connection()
    cursor = conn.cursor()

    # Fetch user
    cursor.execute("SELECT name FROM users WHERE id=%s", (user_id,))
    user = cursor.fetchone()

    # Fetch records
    cursor.execute("SELECT title, category, upload_date FROM records WHERE user_id=%s", (user_id,))
    records = cursor.fetchall()

    # Fetch visits
    cursor.execute("SELECT doctor_name, hospital, visit_date, condition_name FROM visits WHERE user_id=%s", (user_id,))
    visits = cursor.fetchall()

    cursor.close()
    conn.close()

    doc = SimpleDocTemplate(filename)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph(f"Medical History Report - {user['name']}", styles['Heading1']))
    elements.append(Spacer(1, 20))

    # Records Section
    elements.append(Paragraph("Uploaded Medical Records", styles['Heading2']))
    elements.append(Spacer(1, 10))

    record_data = [["Title", "Category", "Upload Date"]]
    for r in records:
        record_data.append([r["title"], r["category"], str(r["upload_date"])])

    record_table = Table(record_data)
    record_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.grey),
        ('GRID', (0,0), (-1,-1), 1, colors.black)
    ]))

    elements.append(record_table)
    elements.append(Spacer(1, 30))

    # Visits Section
    elements.append(Paragraph("Visit History", styles['Heading2']))
    elements.append(Spacer(1, 10))

    visit_data = [["Doctor", "Hospital", "Date", "Condition"]]
    for v in visits:
        visit_data.append([
            v["doctor_name"],
            v["hospital"],
            str(v["visit_date"]),
            v["condition_name"]
        ])

    visit_table = Table(visit_data)
    visit_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.grey),
        ('GRID', (0,0), (-1,-1), 1, colors.black)
    ]))

    elements.append(visit_table)

    doc.build(elements)