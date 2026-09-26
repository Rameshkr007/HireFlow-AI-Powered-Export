from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import os
import uuid
import aiofiles
from ..database import get_db
from ..services.auth_service import get_current_user
from ..models.user import User
from ..models.attachment import Attachment
from ..utils.file_utils import validate_attachment
from ..config import settings

router = APIRouter(prefix="/api/attachments", tags=["attachments"])

@router.post("")
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = await file.read()
    is_valid, error = validate_attachment(file.filename or "", len(content))
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "file")[1]
    stored_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(upload_dir, stored_filename)

    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)

    attachment = Attachment(
        user_id=current_user.id,
        filename=stored_filename,
        original_name=file.filename or stored_filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return {
        "id": attachment.id,
        "original_name": attachment.original_name,
        "file_size": attachment.file_size,
        "created_at": str(attachment.created_at)
    }

@router.get("")
def list_attachments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    atts = db.query(Attachment).filter(Attachment.user_id == current_user.id).all()
    return [
        {"id": a.id, "original_name": a.original_name, "file_size": a.file_size, "created_at": str(a.created_at)}
        for a in atts
    ]

@router.delete("/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    att = db.query(Attachment).filter(Attachment.id == attachment_id, Attachment.user_id == current_user.id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    try:
        if os.path.exists(att.file_path):
            os.remove(att.file_path)
    except Exception:
        pass
    db.delete(att)
    db.commit()
    return {"success": True}
