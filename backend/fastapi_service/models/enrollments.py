from datetime import datetime, timezone
from typing import Annotated, Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]


class Enrollment(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    student_id: str
    course_id: str
    enrolled_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "active"  # "active" | "dropped" | "completed"
    progress: int = 0
    payment_status: str = "Free"  # "Free" | "Paid" | "Failed" | "Refunded"
    payment_method: str = "Free"  # "Free" | "Stripe"
    stripe_session_id: Optional[str] = None
    stripe_payment_intent: Optional[str] = None
