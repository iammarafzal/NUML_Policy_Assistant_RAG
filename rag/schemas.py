from pydantic import BaseModel, Field


class Source(BaseModel):
    document: str
    page: int


class ResponseSchema(BaseModel):
    answer: str = Field(
        description="Should contain the extact answer of the asked question"
    )

    sources: list[Source] = Field(
        description="Should contain the correct sources of the answer that is given to user"
    )
