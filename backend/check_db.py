import sys
from app.config import settings

print("AI_PROVIDER:", settings.AI_PROVIDER)
print("SERPAPI_KEY:", settings.SERPAPI_KEY[:8] + "..." if settings.SERPAPI_KEY else "None")
print("APOLLO_API_KEY:", settings.APOLLO_API_KEY[:6] + "..." if settings.APOLLO_API_KEY else "None")
print("OPENAI_API_KEY:", settings.OPENAI_API_KEY[:8] + "..." if settings.OPENAI_API_KEY else "None")
print("DATABASE_URL:", settings.DATABASE_URL)

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    
    # Try connecting to default postgres database first to ensure 'hireflow' db exists
    print("Testing connection to PostgreSQL...")
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="ramesh2003",
        host="localhost",
        port=5432
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'hireflow'")
    exists = cur.fetchone()
    if not exists:
        print("Creating database 'hireflow' in PostgreSQL...")
        cur.execute("CREATE DATABASE hireflow")
        print("Database 'hireflow' created successfully!")
    else:
        print("Database 'hireflow' already exists in PostgreSQL.")
    cur.close()
    conn.close()

    # Now test SQLAlchemy connection to hireflow
    from app.database import engine
    with engine.connect() as connection:
        print("SQLAlchemy connected successfully to PostgreSQL database 'hireflow'!")
        
except Exception as e:
    print(f"PostgreSQL note: {e}")
    print("If PostgreSQL is not yet configured, SQLite can be used seamlessly.")
