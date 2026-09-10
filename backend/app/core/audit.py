import hashlib
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import AuditLog

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def calculate_hash(prev_hash: str, actor_id: str, actor_role: str, action: str, 
                   resource_type: str, resource_id: str, timestamp_str: str, payload_summary: str) -> str:
    raw = f"{prev_hash}|{actor_id}|{actor_role}|{action}|{resource_type}|{resource_id}|{timestamp_str}|{payload_summary or ''}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def log_audit_event(
    db: Session,
    actor_id: str,
    actor_role: str,
    action: str,
    resource_type: str,
    resource_id: str,
    payload_summary: str = ""
) -> AuditLog:
    """
    Appends a tamper-evident audit record to the blockchain-inspired hash-chained audit log.
    Complies with India's DPDP Act 2023 immutable record requirements.
    """
    last_log = db.query(AuditLog).order_by(AuditLog.timestamp.desc(), AuditLog.id.desc()).first()
    prev_hash = last_log.hash if last_log else GENESIS_HASH

    now = datetime.utcnow()
    timestamp_str = now.isoformat()

    block_hash = calculate_hash(
        prev_hash=prev_hash,
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        timestamp_str=timestamp_str,
        payload_summary=payload_summary
    )

    audit_entry = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        payload_summary=payload_summary,
        timestamp=now,
        prev_hash=prev_hash,
        hash=block_hash
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry

def verify_audit_chain(db: Session) -> dict:
    """
    Verifies that no record in the audit chain has been altered, deleted, or injected.
    """
    records = db.query(AuditLog).order_by(AuditLog.timestamp.asc(), AuditLog.id.asc()).all()
    if not records:
        return {"valid": True, "total_records": 0, "message": "No audit records found"}

    prev_hash = GENESIS_HASH
    for idx, record in enumerate(records):
        # Genesis block check
        if idx == 0 and record.id == 'genesis-0000-0000-0000-000000000000':
            prev_hash = record.hash
            continue

        if record.prev_hash != prev_hash:
            return {
                "valid": False,
                "broken_at_id": record.id,
                "expected_prev_hash": prev_hash,
                "actual_prev_hash": record.prev_hash,
                "message": f"Tampering detected! Chain broken at record ID {record.id}"
            }

        recalculated = calculate_hash(
            prev_hash=record.prev_hash,
            actor_id=record.actor_id,
            actor_role=record.actor_role,
            action=record.action,
            resource_type=record.resource_type,
            resource_id=record.resource_id,
            timestamp_str=record.timestamp.isoformat(),
            payload_summary=record.payload_summary
        )

        if recalculated != record.hash:
            return {
                "valid": False,
                "corrupted_id": record.id,
                "expected_hash": recalculated,
                "stored_hash": record.hash,
                "message": f"Tampering detected! Record {record.id} content does not match stored hash"
            }

        prev_hash = record.hash

    return {
        "valid": True,
        "total_records": len(records),
        "latest_block_hash": prev_hash,
        "message": "Audit chain integrity verified. All records are tamper-evident and valid."
    }
