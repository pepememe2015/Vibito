from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    password: str
    security_question: str | None = None
    security_answer: str | None = None

class ForgotPasswordRequest(BaseModel):
    username: str
    security_answer: str
    new_password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None