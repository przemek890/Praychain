from pydantic import BaseModel
from datetime import datetime

class CharityAction(BaseModel):
    id: str
    title: str
    description: str
    cost_tokens: int
    category: str 
    organization: str
    impact_description: str
    image_url: str
    is_active: bool = True
    total_supported: int = 0
    total_tokens_raised: int = 0
    created_at: datetime