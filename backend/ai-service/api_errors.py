"""
Machine-readable API errors for ai-service.

A single exception type carries (status_code, code, detail); main.py registers
one handler that renders it as a flat {"detail": ..., "code": ...} body, so the
frontend can map `code` to a translated message instead of parsing prose.

Existing routes (routes_ai.py) keep raising plain HTTPException with a string
detail — they are deliberately not migrated.
"""


class APIError(Exception):
    """An error that maps to a stable HTTP status and machine-readable code."""

    def __init__(self, status_code: int, code: str, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.code = code
        self.detail = detail
