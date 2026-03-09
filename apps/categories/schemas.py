import uuid
from typing import Optional
from ninja import Schema


class CategoryGroupInSchema(Schema):
    name: str
    slug: str
    icon: str = ''
    color: str = '#6B7280'
    order: int = 0


class CategoryGroupOutSchema(Schema):
    id: uuid.UUID
    name: str
    slug: str
    icon: str
    color: str
    order: int

    class Config:
        from_attributes = True


class CategoryInSchema(Schema):
    name: str
    slug: str
    icon: str = ''
    color: str = '#6B7280'
    group_id: Optional[uuid.UUID] = None
    order: int = 0


class CategoryOutSchema(Schema):
    id: uuid.UUID
    name: str
    slug: str
    icon: str
    color: str
    group_id: Optional[uuid.UUID] = None
    order: int

    class Config:
        from_attributes = True


class CategoryGroupWithCategoriesSchema(Schema):
    id: uuid.UUID
    name: str
    slug: str
    icon: str
    color: str
    order: int
    categories: list[CategoryOutSchema]

    class Config:
        from_attributes = True
