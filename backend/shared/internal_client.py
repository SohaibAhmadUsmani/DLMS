from httpx import AsyncClient, ASGITransport
class InternalCallError(Exception):
    pass

async def call_core(method: str, path: str, **kwargs) -> dict:
    from fastapi_service.main import app as fastapi_app
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://internal-core") as client:
        try:
            response = await client.request(method, path, **kwargs)
            if response.is_error:
                raise InternalCallError(
                    f"core returned {response.status_code}: {response.text}"
                )
            return response.json()
        except InternalCallError:
            raise
        except Exception as e:
            raise InternalCallError(f"core call failed: {e}") from e


async def call_console(method: str, path: str, **kwargs) -> dict:
    from config.asgi import django_asgi_app
    transport = ASGITransport(app=django_asgi_app)
    headers = kwargs.pop("headers", None) or {}
    async with AsyncClient(transport=transport, base_url="http://internal-console") as client:
        try:
            response = await client.request(method, path, headers=headers, **kwargs)
            if response.is_error:
                raise InternalCallError(
                    f"console returned {response.status_code}: {response.text}"
                )
            return response.json()
        except InternalCallError:
            raise
        except Exception as e:
            raise InternalCallError(f"console call failed: {e}") from e
