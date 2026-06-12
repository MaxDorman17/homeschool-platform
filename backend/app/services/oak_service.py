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


async def _oak_api_get(endpoint: str, params: Optional[Dict[str, str]] = None) -> Optional[dict]:
    """Try to call Oak Academy API. Return None if unavailable."""
    if not settings.OAK_API_KEY:
        return None
    try:
        async with AsyncClient(timeout=15.0) as client:
            url = f"{settings.OAK_API_BASE_URL}/{endpoint.lstrip('/')}"
            response = await client.get(
                url,
                params=params,
                headers={
                    "Authorization": f"Bearer {settings.OAK_API_KEY}",
                    "Accept": "application/json",
                },
            )
            if response.status_code == 200:
                return response.json()
    except Exception:
        return None
    return None


async def _cache_item(
    db: AsyncSession,
    parent_id: UUID,
    oak_id: str,
    data_type: str,
    title: str,
    content: Any,
    subject_slug: Optional[str] = None,
    year_slug: Optional[str] = None,
    unit_slug: Optional[str] = None,
    lesson_slug: Optional[str] = None,
) -> OakAcademyCache:
    """Cache a single item in oak_academy_cache table."""
    result = await db.execute(
        select(OakAcademyCache).where(OakAcademyCache.oak_id == oak_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.content = content
        existing.title = title
        await db.commit()
        return existing

    cache_entry = OakAcademyCache(
        parent_id=parent_id,
        oak_id=oak_id,
        data_type=data_type,
        title=title,
        subject_slug=subject_slug,
        year_slug=year_slug,
        unit_slug=unit_slug,
        lesson_slug=lesson_slug,
        content=content if isinstance(content, dict) else {"data": content},
    )
    db.add(cache_entry)
    await db.commit()
    await db.refresh(cache_entry)
    return cache_entry


async def get_subject_list(db: AsyncSession, parent_id: UUID) -> List[dict]:
    """Get all subject slugs from Oak Academy."""
    data = await _oak_api_get("subjects")
    if data is not None:
        # API returns an array of subject slugs (strings)
        if isinstance(data, list):
            subjects = []
            for slug in data:
                subj = {"slug": slug, "title": slug.replace("-", " ").title()}
                subjects.append(subj)
                await _cache_item(db, parent_id, slug, "subject", subj["title"], subj, subject_slug=slug)
            return subjects
        # Or might be { "subjects": [...] }
        if isinstance(data, dict) and "subjects" in data:
            subjects = []
            for s in data["subjects"]:
                slug = s if isinstance(s, str) else s.get("slug", "")
                title = s if isinstance(s, str) else s.get("title", slug.replace("-", " ").title())
                subj = {"slug": slug, "title": title}
                subjects.append(subj)
                await _cache_item(db, parent_id, slug, "subject", title, subj, subject_slug=slug)
            return subjects
        # If it returns dict with slug entries
        if isinstance(data, dict):
            subjects = []
            for key in data:
                val = data[key]
                slug = val.get("slug", key) if isinstance(val, dict) else key
                title = val.get("title", slug.replace("-", " ").title()) if isinstance(val, dict) else slug.replace("-", " ").title()
                subj = {"slug": slug, "title": title}
                subjects.append(subj)
                await _cache_item(db, parent_id, slug, "subject", title, subj, subject_slug=slug)
            return subjects

    # Fallback: return cached subjects
    result = await db.execute(
        select(OakAcademyCache).where(
            and_(
                OakAcademyCache.parent_id == parent_id,
                OakAcademyCache.data_type == "subject",
            )
        ).order_by(OakAcademyCache.title)
    )
    cached = list(result.scalars().all())
    if cached:
        return [c.content for c in cached]

    return []


async def get_subject_detail(db: AsyncSession, parent_id: UUID, slug: str) -> Optional[dict]:
    """Get full subject info from Oak Academy."""
    data = await _oak_api_get(f"subjects/{slug}")
    if data is not None:
        subj = data if isinstance(data, dict) else {"slug": slug}
        await _cache_item(db, parent_id, slug, "subject", subj.get("title", slug), subj, subject_slug=slug)
        return subj

    # Fallback to cache
    result = await db.execute(
        select(OakAcademyCache).where(
            and_(
                OakAcademyCache.parent_id == parent_id,
                OakAcademyCache.oak_id == slug,
                OakAcademyCache.data_type == "subject",
            )
        )
    )
    cached = result.scalar_one_or_none()
    return cached.content if cached else None


async def get_curriculum_units(
    db: AsyncSession,
    parent_id: UUID,
    subject_slug: str,
    key_stage: Optional[str] = None,
    year: Optional[str] = None,
) -> List[dict]:
    """Get units for a subject from Oak Academy."""
    endpoint = f"key-stages/{key_stage}/subject/{subject_slug}/units" if key_stage else f"subjects/{subject_slug}/units"
    params = {}
    if year:
        params["year"] = year

    data = await _oak_api_get(endpoint, params)
    if data is not None:
        items = data if isinstance(data, list) else data.get("units", data.get("results", []))
        if isinstance(items, list):
            units = []
            for unit in items:
                slug = unit.get("slug", unit.get("unit_slug", ""))
                title = unit.get("title", slug)
                year_slug = unit.get("year", unit.get("year_slug"))
                units.append(unit)
                await _cache_item(
                    db, parent_id, slug, "unit", title, unit,
                    subject_slug=subject_slug, year_slug=year_slug, unit_slug=slug,
                )
            return units

    # Fallback to cache
    result = await db.execute(
        select(OakAcademyCache).where(
            and_(
                OakAcademyCache.parent_id == parent_id,
                OakAcademyCache.data_type == "unit",
                OakAcademyCache.subject_slug == subject_slug,
            )
        )
    )
    return [c.content for c in list(result.scalars().all())]


async def search_lessons(
    db: AsyncSession,
    parent_id: UUID,
    subject_slug: Optional[str] = None,
    unit_slug: Optional[str] = None,
    year_slug: Optional[str] = None,
    key_stage: Optional[str] = None,
) -> List[dict]:
    """Get lessons from Oak Academy filtered by subject/unit/year."""
    if not subject_slug:
        return []

    endpoint = f"key-stages/{key_stage}/subject/{subject_slug}/lessons" if key_stage else f"subjects/{subject_slug}/lessons"
    params = {}
    if year_slug:
        params["year"] = year_slug
    if unit_slug:
        params["unit"] = unit_slug

    data = await _oak_api_get(endpoint, params)
    if data is not None:
        items = data if isinstance(data, list) else data.get("lessons", data.get("results", []))
        if isinstance(items, list):
            lessons = []
            for lesson in items:
                slug = lesson.get("lesson_slug", lesson.get("slug", ""))
                title = lesson.get("title", slug)
                lessons.append(lesson)
                await _cache_item(
                    db, parent_id, slug, "lesson", title, lesson,
                    subject_slug=subject_slug, year_slug=year_slug,
                    unit_slug=unit_slug, lesson_slug=slug,
                )
            return lessons

    # Fallback to cache
    filters = [OakAcademyCache.parent_id == parent_id, OakAcademyCache.data_type == "lesson"]
    if subject_slug:
        filters.append(OakAcademyCache.subject_slug == subject_slug)
    if unit_slug:
        filters.append(OakAcademyCache.unit_slug == unit_slug)
    if year_slug:
        filters.append(OakAcademyCache.year_slug == year_slug)

    result = await db.execute(select(OakAcademyCache).where(and_(*filters)))
    return [c.content for c in list(result.scalars().all())]


async def get_lesson_summary(db: AsyncSession, parent_id: UUID, lesson_slug: str) -> Optional[dict]:
    """Get detailed lesson summary from Oak Academy."""
    data = await _oak_api_get(f"lessons/{lesson_slug}/summary")
    if data is not None:
        await _cache_item(
            db, parent_id, lesson_slug, "lesson", lesson_slug, data,
            lesson_slug=lesson_slug,
        )
        return data

    # Fallback to cache
    result = await db.execute(
        select(OakAcademyCache).where(
            and_(
                OakAcademyCache.parent_id == parent_id,
                OakAcademyCache.oak_id == lesson_slug,
                OakAcademyCache.data_type == "lesson",
            )
        )
    )
    cached = result.scalar_one_or_none()
    return cached.content if cached else None


async def get_lesson_quiz(db: AsyncSession, parent_id: UUID, lesson_slug: str) -> Optional[dict]:
    """Get quiz questions for a lesson from Oak Academy."""
    data = await _oak_api_get(f"lessons/{lesson_slug}/quiz")
    if data is not None:
        await _cache_item(
            db, parent_id, f"{lesson_slug}_quiz", "quiz", f"{lesson_slug} quiz", data,
            lesson_slug=lesson_slug,
        )
        return data

    # Fallback to cache
    result = await db.execute(
        select(OakAcademyCache).where(
            and_(
                OakAcademyCache.parent_id == parent_id,
                OakAcademyCache.oak_id == f"{lesson_slug}_quiz",
                OakAcademyCache.data_type == "quiz",
            )
        )
    )
    cached = result.scalar_one_or_none()
    return cached.content if cached else None


async def search_lessons_by_title(db: AsyncSession, parent_id: UUID, query: str) -> List[dict]:
    """Search lessons by title in Oak Academy."""
    data = await _oak_api_get("search/lessons", params={"title": query})
    if data is not None:
        items = data if isinstance(data, list) else data.get("lessons", data.get("results", []))
        if isinstance(items, list):
            for lesson in items:
                slug = lesson.get("lesson_slug", lesson.get("slug", ""))
                title = lesson.get("title", slug)
                await _cache_item(
                    db, parent_id, slug, "lesson", title, lesson,
                    lesson_slug=slug,
                )
            return items

    # Fallback: search cached lessons by title
    result = await db.execute(
        select(OakAcademyCache).where(
            and_(
                OakAcademyCache.parent_id == parent_id,
                OakAcademyCache.data_type == "lesson",
                OakAcademyCache.title.ilike(f"%{query}%"),
            )
        )
    )
    return [c.content for c in list(result.scalars().all())]


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
    """Import a lesson from Oak Academy into the local Lesson table."""
    await _cache_item(
        db, parent_id, oak_id, "lesson", title, content,
        subject_slug=subject_slug, year_slug=year_slug,
        unit_slug=unit_slug, lesson_slug=lesson_slug,
    )

    lesson = Lesson(
        parent_id=parent_id,
        subject_id=subject_id,
        title=title,
        description=content.get("description") if isinstance(content, dict) else None,
        content=json.dumps(content) if isinstance(content, (dict, list)) else str(content),
        duration_minutes=content.get("duration", 30) if isinstance(content, dict) else 30,
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
    """Import a quiz from Oak Academy into the local Quiz table."""
    await _cache_item(
        db, parent_id, oak_id, "quiz", title, content,
        subject_slug=subject_slug, year_slug=year_slug,
        unit_slug=unit_slug, lesson_slug=lesson_slug,
    )

    quiz = Quiz(
        parent_id=parent_id,
        subject_id=subject_id,
        title=title,
        description=content.get("description") if isinstance(content, dict) else None,
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
    """Import a worksheet from Oak Academy."""
    await _cache_item(
        db, parent_id, oak_id, "worksheet", title, content,
        subject_slug=subject_slug, year_slug=year_slug,
        unit_slug=unit_slug, lesson_slug=lesson_slug,
    )

    worksheet = Worksheet(
        parent_id=parent_id,
        subject_id=subject_id,
        title=title,
        description=content.get("description") if isinstance(content, dict) else None,
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
    """Get cached/imported Oak Academy content."""
    query = select(OakAcademyCache).where(OakAcademyCache.parent_id == parent_id)
    if data_type:
        query = query.where(OakAcademyCache.data_type == data_type)
    query = query.order_by(OakAcademyCache.imported_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())
