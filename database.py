import pymysql
import os

def get_connection():
    return pymysql.connect(
        host="localhost",
        user="root",
        password=os.getenv("DB_PASSWORD"),
        database="medical_vault",
        cursorclass=pymysql.cursors.DictCursor
    )