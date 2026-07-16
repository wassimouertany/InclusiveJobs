from typing import Optional

from fastapi import UploadFile

from database import fs


async def upload_file_to_gridfs_bytes(data: bytes, filename: str, content_type: str) -> str:
    """Upload raw bytes to GridFS and return the string file ID."""
    file_id = await fs.upload_from_stream(
        filename,
        data,
        metadata={"content_type": content_type},
    )
    return str(file_id)


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
