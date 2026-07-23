from datetime import datetime, timezone
from typing import Annotated, Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]


class Transaction(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    order_id: str
    student_id: str
    course_id: str
    teacher_id: str
    amount: float
    platform_fee: float
    teacher_earning: float
    payment_method: str = "Stripe"
    status: str = "Completed"
    stripe_session_id: Optional[str] = None
    stripe_payment_intent: Optional[str] = None
    payout_id: Optional[str] = None
    payout_status: str = "Pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
