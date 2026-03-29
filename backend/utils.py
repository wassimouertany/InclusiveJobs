from typing import Optional

from fastapi import UploadFile

from database import fs


async def upload_file_to_gridfs(upload_file: UploadFile) -> Optional[str]:
    """
    Read UploadFile content and upload to GridFS.
    Returns file id (str) or None if empty.
    """
    content = await upload_file.read()
    if not content:
        return None
    file_id = await fs.upload_from_stream(
        upload_file.filename or "file",
        content,
        metadata={"content_type": upload_file.content_type or "application/octet-stream"},
    )
    return str(file_id)
