from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi


def patch_upload_openapi(app: FastAPI):
    """FastAPI 0.141.x omits format=binary for UploadFile schemas, so Swagger UI
    shows a text input instead of a file picker. Call once after routes are added."""

    def _openapi():
        if app.openapi_schema:
            return app.openapi_schema
        spec = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        for schema in spec.get("components", {}).get("schemas", {}).values():
            for prop in schema.get("properties", {}).values():
                if prop.get("type") == "string" and prop.get("contentMediaType") == "application/octet-stream":
                    prop.setdefault("format", "binary")
                if prop.get("type") == "array" and "items" in prop:
                    items = prop["items"]
                    if items.get("type") == "string" and items.get("contentMediaType") == "application/octet-stream":
                        items.setdefault("format", "binary")
        app.openapi_schema = spec
        return spec

    app.openapi = _openapi
