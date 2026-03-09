import uuid
from ninja import Schema


class CommentInSchema(Schema):
    content: str


class CommentPatchSchema(Schema):
    content: str


class CommentOutSchema(Schema):
    id: uuid.UUID
    report_id: uuid.UUID
    author_id: uuid.UUID
    content: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
