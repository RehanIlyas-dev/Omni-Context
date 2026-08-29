import os
from pathlib import Path

from fastapi.testclient import TestClient

from src.main import app


def _client():
    return TestClient(app)


def test_health_and_router_registration():
    with _client() as c:
        r = c.get("/")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "online"
        assert body["groq_configured"] is True

        # Endpoints defined by the routers are registered on the app.
        paths = set(app.openapi()["paths"].keys())
        assert "/upload" in paths
        assert "/upload/batch" in paths
        assert "/query" in paths


def test_batch_upload_ingests_valid_files_and_skips_unsupported():
    with _client() as c:
        r = c.post(
            "/upload/batch",
            files=[
                ("files", ("doc.txt", "Rehan Ilyas is a CS student at UET Lahore.", "text/plain")),
                ("files", ("bad.png", b"not-a-real-pdf-content", "image/png")),
            ],
        )
        assert r.status_code == 201
        body = r.json()
        assert body["total_files"] == 2
        assert body["successful_files"] == 1
        assert body["failed_files"] == 1
        statuses = {d["status"] for d in body["details"]}
        assert "success" in statuses
        assert "skipped" in statuses
