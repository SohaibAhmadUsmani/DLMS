import re

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from shared.security import InvalidTokenError, decode_access_token


class AuthUser:
    def __init__(self, payload: dict):
        self._payload = payload
        self.is_authenticated = True

    def __getattr__(self, name: str):
        if name in self._payload:
            return self._payload[name]
        raise AttributeError(f"AuthUser has no attribute '{name}'")

    def __getitem__(self, key: str):
        return self._payload[key]

    def get(self, key: str, default=None):
        return self._payload.get(key, default)


class DjangoJWTAuthentication(BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request: Request):
        auth_header = request.headers.get("Authorization", "")
        match = re.match(rf"^{self.keyword}\s+(.+)$", auth_header)
        if not match:
            return None

        try:
            payload = decode_access_token(match.group(1))
        except InvalidTokenError:
            raise AuthenticationFailed("Invalid or expired token")

        return (AuthUser(payload), None)

    def authenticate_header(self, request):
        return self.keyword


class IsRole(BasePermission):
    allowed_roles: list[str] = []

    def has_permission(self, request: Request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.get("role") in self.allowed_roles


def require_role(*roles: str) -> type[IsRole]:
    return type("IsRole", (IsRole,), {"allowed_roles": list(roles)})
