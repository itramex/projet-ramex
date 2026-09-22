from rest_framework import permissions

# ---------------------------------------------------------------------------
# Rôles RAMEX (Phase 2 — RBAC)
# ---------------------------------------------------------------------------
#   admin          : accès complet
#   animateur      : Certification + Développement Durable
#   superviseur    : Certification + Développement Durable (+ supervision)
#   agent_collecte : Traçabilité
# ---------------------------------------------------------------------------

ROLE_ADMIN = 'admin'
ROLE_ANIMATEUR = 'animateur'
ROLE_SUPERVISEUR = 'superviseur'
ROLE_AGENT_COLLECTE = 'agent_collecte'


def get_profile_role(user):
    """Retourne le rôle RAMEX de l'utilisateur (ou None)."""
    if hasattr(user, 'profile'):
        return user.profile.role
    return None


def is_admin(user):
    """Un utilisateur est admin s'il est superuser/staff ou a le rôle admin."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return True
    return get_profile_role(user) == ROLE_ADMIN


class IsAdmin(permissions.BasePermission):
    """Permission : administrateur uniquement (superuser/staff/rôle admin)."""
    def has_permission(self, request, view):
        return is_admin(request.user)


class IsAdminUser(permissions.BasePermission):
    """Alias de compatibilité → voir IsAdmin."""
    def has_permission(self, request, view):
        return is_admin(request.user)


class IsAnimateur(permissions.BasePermission):
    """Permission : admin, animateur ou superviseur."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if is_admin(request.user):
            return True
        return get_profile_role(request.user) in (ROLE_ANIMATEUR, ROLE_SUPERVISEUR)


class IsSuperviseur(permissions.BasePermission):
    """Permission : admin ou superviseur."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if is_admin(request.user):
            return True
        return get_profile_role(request.user) == ROLE_SUPERVISEUR


class CanManageTracabilite(permissions.BasePermission):
    """
    Pilier TRACABILITÉ → réservé à `admin` et `agent_collecte`.
    Lecture ET écriture sont restreintes à ces rôles.
    """
    message = "Accès réservé aux agents de collecte (Traçabilité)."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if is_admin(request.user):
            return True
        return get_profile_role(request.user) == ROLE_AGENT_COLLECTE


class CanManageCertificationDD(permissions.BasePermission):
    """
    Piliers CERTIFICATION & DÉVELOPPEMENT DURABLE → réservés à
    `admin`, `animateur` et `superviseur`.
    """
    message = "Accès réservé aux animateurs et superviseurs (Certification / Développement Durable)."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if is_admin(request.user):
            return True
        return get_profile_role(request.user) in (ROLE_ANIMATEUR, ROLE_SUPERVISEUR)


# ---------------------------------------------------------------------------
# Permissions génériques (référentiels)
# ---------------------------------------------------------------------------

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission en lecture seule pour tous les utilisateurs authentifiés,
    CRUD pour admin uniquement.
    """
    def has_permission(self, request, view):
        # Lecture autorisée pour tous les utilisateurs authentifiés
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        return is_admin(request.user)


class IsAdminOrManager(permissions.BasePermission):
    """
    Permission pour admin et superviseurs.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if is_admin(request.user):
            return True
        return get_profile_role(request.user) == ROLE_SUPERVISEUR


class IsAdminOrManagerOrReadOnly(permissions.BasePermission):
    """
    Lecture pour tous les utilisateurs authentifiés,
    modification pour admin et superviseurs.
    """
    def has_permission(self, request, view):
        # Lecture autorisée pour tous
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        if not request.user or not request.user.is_authenticated:
            return False
        if is_admin(request.user):
            return True
        return get_profile_role(request.user) == ROLE_SUPERVISEUR


# ---------------------------------------------------------------------------
# Confidentialité par agence (#29)
# ---------------------------------------------------------------------------
#   admin / superviseur (les « responsables ») : voient TOUTES les données
#   animateur / agent de collecte (les « BL ») : voient uniquement les données
#     de leur agence (via la coopérative du producteur) — sauf si aucune
#     agence n'est assignée à leur profil (comptes historiques : aucune
#     restriction, pour ne pas bloquer l'existant).
# ---------------------------------------------------------------------------

def get_user_agence(user):
    """Agence RAMEX du profil utilisateur (ou None)."""
    if hasattr(user, 'profile'):
        return user.profile.agence
    return None


def can_see_all_data(user):
    """Les responsables (admin, superviseur) accèdent à toutes les données (#29)."""
    if not user or not user.is_authenticated:
        return False
    return is_admin(user) or get_profile_role(user) == ROLE_SUPERVISEUR


def scope_par_agence(user, qs, lookup='cooperative__agence'):
    """Restreint un queryset de Producteurs (ou lié) à l'agence du profil (#29).

    Retourne (queryset, agence|None) :
    - admin/superviseur ou profil sans agence → queryset inchangé, None ;
    - sinon → filtre `<lookup>_id` = agence du profil.
    """
    if can_see_all_data(user):
        return qs, None
    agence = get_user_agence(user)
    if not agence:
        return qs, None
    return qs.filter(**{f'{lookup}_id': agence.id}), agence


def scope_entite_agence(user, qs, lookup_producteur, lookup_cooperative):
    """Restreint un queryset rattaché à un producteur ET/OU une coopérative (#29).

    Cas des certifications : soit liées à un producteur (via sa coopérative),
    soit directement à une coopérative. Les lignes sans aucun rattachement
    restent visibles. Retourne (queryset, agence|None), mêmes règles que
    scope_par_agence (admin/superviseur ou profil sans agence → inchangé).
    """
    from django.db.models import Q
    if can_see_all_data(user):
        return qs, None
    agence = get_user_agence(user)
    if not agence:
        return qs, None
    return qs.filter(
        Q(**{f'{lookup_producteur}_id': agence.id})
        | Q(**{f'{lookup_cooperative}_id': agence.id})
        | Q(**{f'{lookup_producteur}__isnull': True},
            **{f'{lookup_cooperative}__isnull': True})
    ), agence

