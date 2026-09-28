"""
Filtres d'URL partagés par les API (M-23 — synchro incrémentale mobile).
"""
from datetime import datetime

from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import ValidationError


def filter_updated_since(queryset, request, field='date_modification'):
    """Restreint le queryset aux objets modifiés depuis une date.

    Paramètre d'URL : ``?updated_since=2025-06-01T00:00:00Z``
    (alias ``?depuis=…`` accepté pour les appels en français).

    - Paramètre absent → queryset inchangé (synchro complète).
    - Date naïve → interprétée dans le fuseau courant.
    - Date invalide → erreur 400 (paramètre explicite).
    """
    raw = request.query_params.get('updated_since') or request.query_params.get('depuis')
    if not raw:
        return queryset

    parsed = None
    try:
        parsed = parse_datetime(raw)
    except (ValueError, TypeError):
        parsed = None
    if parsed is None:
        try:
            parsed = datetime.fromisoformat(str(raw).replace('Z', '+00:00'))
        except ValueError:
            raise ValidationError({
                'updated_since': "Date ISO 8601 attendue (ex: 2025-06-01T00:00:00Z).",
            })

    if settings.USE_TZ:
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed)
    elif timezone.is_aware(parsed):
        parsed = timezone.make_naive(parsed)

    return queryset.filter(**{f'{field}__gte': parsed})
