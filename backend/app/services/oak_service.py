import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from httpx import AsyncClient
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import OakAcademyCache, Lesson, Quiz, Worksheet


# Mock data for when Oak Academy API is not available
MOCK_SUBJECTS = [
    {"slug": "english", "title": "English", "key_stages": ["ks1", "ks2", "ks3"]},
    {"slug": "maths", "title": "Maths", "key_stages": ["ks1", "ks2", "ks3"]},
    {"slug": "science", "title": "Science", "key_stages": ["ks1", "ks2", "ks3"]},
    {"slug": "history", "title": "History", "key_stages": ["ks1", "ks2", "ks3"]},
    {"slug": "geography", "title": "Geography", "key_stages": ["ks1", "ks2", "ks3"]},
    {"slug": "art", "title": "Art & Design", "key_stages": ["ks1", "ks2"]},
    {"slug": "computing", "title": "Computing", "key_stages": ["ks1", "ks2", "ks3"]},
    {"slug": "music", "title": "Music", "key_stages": ["ks1", "ks2"]},
    {"slug": "languages", "title": "Languages", "key_stages": ["ks2", "ks3"]},
    {"slug": "rshe", "title": "RSHE", "key_stages": ["ks1", "ks2", "ks3"]},
]

MOCK_UNITS = [
    {"slug": "numbers-to-100", "title": "Numbers to 100", "subject_slug": "maths", "year_slug": "year-1"},
    {"slug": "addition-subtraction", "title": "Addition and Subtraction", "subject_slug": "maths", "year_slug": "year-1"},
    {"slug": "phonics", "title": "Phonics", "subject_slug": "english", "year_slug": "year-1"},
    {"slug": "plants", "title": "Plants", "subject_slug": "science", "year_slug": "year-1"},
    {"slug": "animals-humans", "title": "Animals including Humans", "subject_slug": "science", "year_slug": "year-1"},
    {"slug": "multiplication", "title": "Multiplication and Division", "subject_slug": "maths", "year_slug": "year-2"},
    {"slug": "fractions", "title": "Fractions", "subject_slug": "maths", "year_slug": "year-2"},
]

MOCK_LESSONS = [
    {
        "lesson_slug": "counting-to-100",
        "title": "Counting to 100",
        "subject_slug": "maths",
        "unit_slug": "numbers-to-100",
        "year_slug": "year-1",
        "description": "Learn to count from 1 to 100",
        "duration": 30,
    },
    {
        "lesson_slug": "adding-tens",
        "title": "Adding Tens",
        "subject_slug": "maths",
        "unit_slug": "addition-subtraction",
        "year_slug": "year-1",
        "description": "Add groups of ten together",
        "duration": 30,
    },
]


async def _oak_api_get(endpoint: str, params: Optional[Dict[str, str]] = None) -> Optional[dict]:
    """Try to call Oak Academy API. Return None if unavailable."""
    try:
        async with AsyncClient(timeout=10.0) as client:
            url = f"{settings.OAK_API_BASE_URL}/{endpoint.lstrip('/')}"
            response = await client.get(url, params=params)
            if response.status_code == 200:
                return response.json()
    except Exception:
        return None
    return None


async def get_subject_list(db: AsyncSession, parent_id: UUID) -> List[dict]:
    # Try API first
    data = await _oak_api_get("subjects")
    if data and isinstance(data, list):
        # Cache the subjects
        for subj in data:
            cached = await db.execute(
                select(OakAcademyCache).where(
                    and_(
                        OakAcademyCache.oak_id == subj.get("slug", ""),
                        OakAcademyCache.data_type == "subject",
                    )
                )
            )
            if not cached.scalar_one_or_none():
                cache_entry = OakAcademyCache(
                    parent_id=parent_id,
                    oak_id=subj.get("slug", ""),
                    data_type="subject",
                    title=subj.get("title", subj.get("slug", "")),
                    subject_slug=subj.get("slug"),
                    content=subj,
                )
                db.add(cache_entry)
        await db.commit()
        return data

    # Return mock data
    return MOCK_SUBJECTS


async def get_curriculum_units(db: AsyncSession, parent_id: UUID, subject_slug: str) -> List[dict]:
    data = await _oak_api_get(f"subjects/{subject_slug}/units")
    if data and isinstance(data, list):
        for unit in data:
            cached = await db.execute(
                select(OakAcademyCache).where(
                    and_(
                        OakAcademyCache.oak_id == unit.get("slug", ""),
                        OakAcademyCache.data_type == "unit",
                    )
                )
            )
            if not cached.scalar_one_or_none():
                cache_entry = OakAcademyCache(
                    parent_id=parent_id,
                    oak_id=unit.get("slug", ""),
                    data_type="unit",
                    title=unit.get("title", unit.get("slug", "")),
                    subject_slug=subject_slug,
                    unit_slug=unit.get("slug"),
                    year_slug=unit.get("year_slug"),
                    content=unit,
                )
                db.add(cache_entry)
        await db.commit()
        return data

    # Filter mock units by subject
    return [u for u in MOCK_UNITS if u["subject_slug"] == subject_slug]


async def search_lessons(
    db: AsyncSession,
    parent_id: UUID,
    subject_slug: Optional[str] = None,
    unit_slug: Optional[str] = None,
    year_slug: Optional[str] = None,
) -> List[dict]:
    params = {}
    if subject_slug:
        params["subject"] = subject_slug
    if unit_slug:
        params["unit"] = unit_slug
    if year_slug:
        params["year"] = year_slug

    endpoint = "lessons"
    data = await _oak_api_get(endpoint, params)
    if data and isinstance(data, list):
        for lesson in data:
            cached = await db.execute(
                select(OakAcademyCache).where(
                    and_(
                        OakAcademyCache.oak_id == lesson.get("lesson_slug", ""),
                        OakAcademyCache.data_type == "lesson",
                    )
                )
            )
            if not cached.scalar_one_or_none():
                cache_entry = OakAcademyCache(
                    parent_id=parent_id,
                    oak_id=lesson.get("lesson_slug", ""),
                    data_type="lesson",
                    title=lesson.get("title", lesson.get("lesson_slug", "")),
                    subject_slug=lesson.get("subject_slug"),
                    unit_slug=lesson.get("unit_slug"),
                    lesson_slug=lesson.get("lesson_slug"),
                    year_slug=lesson.get("year_slug"),
                    content=lesson,
                )
                db.add(cache_entry)
        await db.commit()
        return data

    # Filter mock lessons
    results = MOCK_LESSONS
    if subject_slug:
        results = [l for l in results if l["subject_slug"] == subject_slug]
    if unit_slug:
        results = [l for l in results if l["unit_slug"] == unit_slug]
    if year_slug:
        results = [l for l in results if l["year_slug"] == year_slug]
    return results


async def import_lesson(
    db: AsyncSession,
    parent_id: UUID,
    subject_id: UUID,
    oak_id: str,
    title: str,
    content: Dict[str, Any],
    subject_slug: Optional[str] = None,
    year_slug: Optional[str] = None,
    unit_slug: Optional[str] = None,
    lesson_slug: Optional[str] = None,
) -> Lesson:
    # Check cache first
    result = await db.execute(
        select(OakAcademyCache).where(OakAcademyCache.oak_id == oak_id)
    )
    cached = result.scalar_one_or_none()
    if not cached:
        cache_entry = OakAcademyCache(
            parent_id=parent_id,
            oak_id=oak_id,
            data_type="lesson",
            title=title,
            subject_slug=subject_slug,
            year_slug=year_slug,
            unit_slug=unit_slug,
            lesson_slug=lesson_slug,
            content=content,
        )
        db.add(cache_entry)
        await db.flush()

    lesson = Lesson(
        parent_id=parent_id,
        subject_id=subject_id,
        title=title,
        description=content.get("description"),
        content=json.dumps(content),
        duration_minutes=content.get("duration", 30),
        imported_from_oak=True,
        oak_lesson_slug=lesson_slug or oak_id,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


async def import_quiz(
    db: AsyncSession,
    parent_id: UUID,
    subject_id: Optional[UUID],
    oak_id: str,
    title: str,
    content: Dict[str, Any],
    subject_slug: Optional[str] = None,
    year_slug: Optional[str] = None,
    unit_slug: Optional[str] = None,
    lesson_slug: Optional[str] = None,
) -> Quiz:
    # Check cache
    result = await db.execute(
        select(OakAcademyCache).where(OakAcademyCache.oak_id == oak_id)
    )
    cached = result.scalar_one_or_none()
    if not cached:
        cache_entry = OakAcademyCache(
            parent_id=parent_id,
            oak_id=oak_id,
            data_type="quiz",
            title=title,
            subject_slug=subject_slug,
            year_slug=year_slug,
            unit_slug=unit_slug,
            lesson_slug=lesson_slug,
            content=content,
        )
        db.add(cache_entry)
        await db.flush()

    quiz = Quiz(
        parent_id=parent_id,
        subject_id=subject_id,
        title=title,
        description=content.get("description"),
        imported_from_oak=True,
        oak_lesson_slug=lesson_slug or oak_id,
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return quiz


async def import_worksheet(
    db: AsyncSession,
    parent_id: UUID,
    subject_id: Optional[UUID],
    oak_id: str,
    title: str,
    content: Dict[str, Any],
    subject_slug: Optional[str] = None,
    year_slug: Optional[str] = None,
    unit_slug: Optional[str] = None,
    lesson_slug: Optional[str] = None,
) -> Worksheet:
    result = await db.execute(
        select(OakAcademyCache).where(OakAcademyCache.oak_id == oak_id)
    )
    cached = result.scalar_one_or_none()
    if not cached:
        cache_entry = OakAcademyCache(
            parent_id=parent_id,
            oak_id=oak_id,
            data_type="worksheet",
            title=title,
            subject_slug=subject_slug,
            year_slug=year_slug,
            unit_slug=unit_slug,
            lesson_slug=lesson_slug,
            content=content,
        )
        db.add(cache_entry)
        await db.flush()

    worksheet = Worksheet(
        parent_id=parent_id,
        subject_id=subject_id,
        title=title,
        description=content.get("description"),
        worksheet_type="oak_imported",
        imported_from_oak=True,
        oak_lesson_slug=lesson_slug or oak_id,
        interactive_data=content,
    )
    db.add(worksheet)
    await db.commit()
    await db.refresh(worksheet)
    return worksheet


async def get_cached_content(
    db: AsyncSession,
    parent_id: UUID,
    data_type: Optional[str] = None,
) -> List[OakAcademyCache]:
    query = select(OakAcademyCache).where(OakAcademyCache.parent_id == parent_id)
    if data_type:
        query = query.where(OakAcademyCache.data_type == data_type)
    query = query.order_by(OakAcademyCache.imported_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())
