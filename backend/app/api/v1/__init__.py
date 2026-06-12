from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.children import router as children_router
from app.api.v1.subjects import router as subjects_router
from app.api.v1.lessons import router as lessons_router
from app.api.v1.planner import router as planner_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.worksheets import router as worksheets_router
from app.api.v1.progress import router as progress_router
from app.api.v1.rewards import router as rewards_router
from app.api.v1.reading import router as reading_router
from app.api.v1.attendance import router as attendance_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.oak import router as oak_router
from app.api.v1.reports import router as reports_router
from app.api.v1.coding import router as coding_router
from app.api.v1.extra_credit import router as extra_credit_router
from app.api.v1.notifications import router as notifications_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(children_router)
api_v1_router.include_router(subjects_router)
api_v1_router.include_router(lessons_router)
api_v1_router.include_router(planner_router)
api_v1_router.include_router(quizzes_router)
api_v1_router.include_router(worksheets_router)
api_v1_router.include_router(progress_router)
api_v1_router.include_router(rewards_router)
api_v1_router.include_router(reading_router)
api_v1_router.include_router(attendance_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(oak_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(coding_router)
api_v1_router.include_router(extra_credit_router)
api_v1_router.include_router(notifications_router)
