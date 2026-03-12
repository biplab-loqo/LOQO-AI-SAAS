"""Show Bible step output schema."""
from typing import List
from pydantic import BaseModel


class ShowBibleData(BaseModel):
    Project: str
    Image_Style: str
    Genre: str
    Themes: List[str]
    Directorial_Treatment: str
