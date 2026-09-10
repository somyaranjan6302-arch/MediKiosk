from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Engine configuration with connection pooling and sqlite fallback compatibility
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app.models import models
    Base.metadata.create_all(bind=engine)
    
    # Check if genesis audit block and sample patients exist; seed if empty
    db = SessionLocal()
    try:
        genesis = db.query(models.AuditLog).filter(models.AuditLog.id == 'genesis-0000-0000-0000-000000000000').first()
        if not genesis:
            genesis = models.AuditLog(
                id='genesis-0000-0000-0000-000000000000',
                actor_id='system',
                actor_role='admin',
                action='SYSTEM_GENESIS',
                resource_type='system',
                resource_id='root',
                payload_summary='MediKiosk DPDP Act 2026 Audit Genesis Block Initialized',
                prev_hash='0000000000000000000000000000000000000000000000000000000000000000',
                hash='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
            )
            db.add(genesis)
            db.commit()

        # Seed sample demo patients if none exist
        if db.query(models.Patient).count() == 0:
            demo_patients = [
                models.Patient(
                    id='pat-101',
                    abha_id='91-4521-8890-1234',
                    mrn='MRN-2026-001',
                    name='Ramesh Kumar Sharma',
                    dob='1968-05-14',
                    gender='Male',
                    phone='+919876543210',
                    preferred_language='hi'
                ),
                models.Patient(
                    id='pat-102',
                    abha_id='91-8765-4321-5678',
                    mrn='MRN-2026-002',
                    name='Priya Patel',
                    dob='1989-11-22',
                    gender='Female',
                    phone='+919811223344',
                    preferred_language='en'
                ),
                models.Patient(
                    id='pat-103',
                    abha_id='91-3344-5566-7788',
                    mrn='MRN-2026-003',
                    name='Lakshmi Narayanan',
                    dob='1955-03-30',
                    gender='Female',
                    phone='+919443322110',
                    preferred_language='hi'
                )
            ]
            db.add_all(demo_patients)
            db.commit()
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()
