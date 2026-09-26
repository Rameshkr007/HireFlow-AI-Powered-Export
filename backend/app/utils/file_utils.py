import os
from typing import Tuple

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.pptx', '.xlsx', '.doc', '.ppt'}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10MB

def validate_attachment(filename: str, size_bytes: int) -> Tuple[bool, str]:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    if size_bytes > MAX_SIZE_BYTES:
        return False, f"File too large. Max size is 10MB."
    return True, ""
