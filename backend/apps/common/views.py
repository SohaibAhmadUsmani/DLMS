import re

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from apps.common.documents import LmsSetting


def internal_health(request):
    return JsonResponse({"status": "ok", "service": "dlms-console"})


@csrf_exempt
def internal_setting_by_key(request, key=None):
    """
    Internal endpoint — no auth, trusted caller (core domain via ASGITransport).
    Returns {"key": ..., "value": ...} or {"exists": False}.
    """
    try:
        setting = LmsSetting.objects.get(key=key)
    except Exception:
        return JsonResponse({"exists": False})
    return JsonResponse({"key": setting.key, "value": setting.value, "exists": True})
