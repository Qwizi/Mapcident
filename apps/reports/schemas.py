import uuid
from typing import Optional, List
from datetime import datetime
from ninja import Schema, FilterSchema, Field


class ReportInSchema(Schema):
    title: str
    description: str
    category_id: uuid.UUID
    latitude: float
    longitude: float


class ReportPatchSchema(Schema):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ReportImageOutSchema(Schema):
    id: uuid.UUID
    image: str
    order: int

    class Config:
        from_attributes = True


class ReportOutSchema(Schema):
    id: uuid.UUID
    title: str
    description: str
    category_id: uuid.UUID
    author_id: uuid.UUID
    status: str
    latitude: float
    longitude: float
    h3_index: str
    images: List[ReportImageOutSchema] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReportFilterSchema(FilterSchema):
    category_id: Optional[uuid.UUID] = Field(None, q='category_id')
    status: Optional[str] = Field(None, q='status')
