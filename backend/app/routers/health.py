from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(request: Request) -> dict[str, str]:
    await request.app.state.db.command("ping")
    return {"status": "ok"}
