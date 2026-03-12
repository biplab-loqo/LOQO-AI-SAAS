"""Characters step output schema."""
from typing import Dict
from pydantic import BaseModel


class CharacterProfile(BaseModel):
    Name_Identifier: str
    Cultural_Context: str
    Visual_Design: str
    Age_Gender: str
    Physical_Description: str
    Attire: str


class CharactersData(BaseModel):
    Characters: Dict[str, CharacterProfile]
