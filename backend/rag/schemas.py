from pydantic import BaseModel, Field


class Source(BaseModel):
    document: str
    page: int
    content: str = Field(description="The exact excerpt/chunk of text from the document used for this source")


class ResponseSchema(BaseModel):
    answer: str = Field(
        description="Should contain the extact answer of the asked question"
    )

    chunk_ids: list[str] = Field(
        description="List of Chunk IDs (e.g. ['chunk_0', 'chunk_2']) that were actually used to formulate the answer. Omit chunks that were not useful."
    )
