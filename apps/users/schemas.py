import uuid
from ninja import Schema
from pydantic import EmailStr


class RegisterSchema(Schema):
    email: EmailStr
    username: str
    password: str


class UserOutSchema(Schema):
    id: uuid.UUID
    email: str
    username: str
    role: str

    class Config:
        from_attributes = True


class TokenSchema(Schema):
    access: str
    refresh: str
