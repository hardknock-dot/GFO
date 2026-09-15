import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import engine
from sqlalchemy import inspect

def inspect_theme_table():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("All tables in DB:", tables)
    
    if "company_theme_settings" in tables:
        columns = inspector.get_columns("company_theme_settings")
        print("\nColumns in company_theme_settings:")
        for col in columns:
            print(f"  - {col['name']}: {col['type']} (nullable: {col['nullable']})")
    else:
        print("\ncompany_theme_settings table not found in inspector!")

if __name__ == "__main__":
    inspect_theme_table()
