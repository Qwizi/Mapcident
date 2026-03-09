import uuid
from ninja import Schema


class CategoryInSchema(Schema):
    name: str
    slug: str
    icon: str = ''
    color: str = '#6B7280'


class CategoryOutSchema(Schema):
    id: uuid.UUID
    name: str
    slug: str
    icon: str
    color: str

    class Config:
        from_attributes = True
