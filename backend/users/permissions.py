from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Permission pour vérifier si l'utilisateur est administrateur
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superuser a tous les droits
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        # Vérifier le rôle dans le profil
        if hasattr(request.user, 'profile'):
            return request.user.profile.role == 'admin'
        
        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission en lecture seule pour tous, CRUD pour admin uniquement
    """
    def has_permission(self, request, view):
        # Lecture autorisée pour tous les utilisateurs authentifiés
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Modification/Création/Suppression uniquement pour admin
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        if hasattr(request.user, 'profile'):
            return request.user.profile.role == 'admin'
        
        return False


class IsAdminOrManager(permissions.BasePermission):
    """
    Permission pour admin et gestionnaires
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        if hasattr(request.user, 'profile'):
            return request.user.profile.role in ['admin', 'manager']
        
        return False


class IsAdminOrManagerOrReadOnly(permissions.BasePermission):
    """
    Lecture pour tous, modification pour admin et gestionnaires
    """
    def has_permission(self, request, view):
        # Lecture autorisée pour tous
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Modification pour admin et manager
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        if hasattr(request.user, 'profile'):
            return request.user.profile.role in ['admin', 'manager']
        
        return False
