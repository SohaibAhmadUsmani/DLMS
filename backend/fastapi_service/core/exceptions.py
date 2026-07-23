from fastapi import status


class AppException(Exception):
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    detail: str = ""

    def __init__(self, detail: str = ""):
        self.detail = detail


class BadRequestError(AppException):
    status_code = status.HTTP_400_BAD_REQUEST


class UnauthorizedError(AppException):
    status_code = status.HTTP_401_UNAUTHORIZED


class ForbiddenError(AppException):
    status_code = status.HTTP_403_FORBIDDEN


class NotFoundError(AppException):
    status_code = status.HTTP_404_NOT_FOUND


class ConflictError(AppException):
    status_code = status.HTTP_409_CONFLICT
