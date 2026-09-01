from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth.models import User
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta, datetime
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile, ActivityLog
from .serializers import (
    UserListSerializer,
    UserDetailSerializer,
    UserCreateSerializer,
    ChangePasswordSerializer,
    ResetPasswordSerializer,
    ActivityLogSerializer
)


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des utilisateurs"""
    queryset = User.objects.all().select_related('profile').order_by('-date_joined')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        elif self.action == 'create':
            return UserCreateSerializer
        elif self.action == 'change_password':
            return ChangePasswordSerializer
        elif self.action == 'reset_password':
            return ResetPasswordSerializer
        return UserDetailSerializer
    
    def get_permissions(self):
        """Seuls les admins peuvent créer, modifier ou supprimer des utilisateurs"""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'reset_password', 'toggle_active']:
            return [IsAdminUser()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Filtrage et recherche"""
        queryset = super().get_queryset()
        
        # Recherche
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        # Filtre par rôle
        role = self.request.query_params.get('role', None)
        if role:
            queryset = queryset.filter(profile__role=role)
        
        # Filtre par statut actif
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filtre par coopérative
        cooperative = self.request.query_params.get('cooperative', None)
        if cooperative:
            queryset = queryset.filter(profile__cooperative_id=cooperative)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Statistiques des utilisateurs"""
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        
        # Par rôle
        role_stats = UserProfile.objects.values('role').annotate(count=Count('id'))
        
        # Admins
        admin_count = User.objects.filter(is_staff=True).count()
        superuser_count = User.objects.filter(is_superuser=True).count()
        
        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': total_users - active_users,
            'admin_count': admin_count,
            'superuser_count': superuser_count,
            'by_role': {item['role']: item['count'] for item in role_stats},
        })
    
    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        """Changer son propre mot de passe"""
        user = self.get_object()
        
        # Vérifier que l'utilisateur change son propre mot de passe
        if request.user.id != user.id and not request.user.is_staff:
            return Response(
                {'detail': 'Vous ne pouvez changer que votre propre mot de passe.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            # Vérifier l'ancien mot de passe
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'old_password': ['Mot de passe incorrect.']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Définir le nouveau mot de passe
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({'detail': 'Mot de passe changé avec succès.'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reset_password(self, request, pk=None):
        """Réinitialiser le mot de passe d'un utilisateur (admin uniquement)"""
        user = self.get_object()
        
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({
                'detail': f'Mot de passe réinitialisé pour {user.username}.'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def toggle_active(self, request, pk=None):
        """Activer/Désactiver un utilisateur"""
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        
        return Response({
            'detail': f'Utilisateur {"activé" if user.is_active else "désactivé"}.',
            'is_active': user.is_active
        })
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """Enregistrer la déconnexion de l'utilisateur"""
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='logout',
                description=f"Déconnexion de {request.user.username}",
                module='Authentification',
                request=request
            )
        
        return Response({'detail': 'Déconnexion enregistrée avec succès.'})


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour consulter les journaux d'activité"""
    queryset = ActivityLog.objects.all().select_related('user')
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrage des logs"""
        queryset = super().get_queryset()
        
        # Filtre par utilisateur
        user_id = self.request.query_params.get('user', None)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filtre par action
        action = self.request.query_params.get('action', None)
        if action:
            queryset = queryset.filter(action=action)
        
        # Filtre par module
        module = self.request.query_params.get('module', None)
        if module:
            queryset = queryset.filter(module__icontains=module)
        
        # Filtre par date (derniers X jours)
        days = self.request.query_params.get('days', None)
        if days:
            try:
                days = int(days)
                date_from = timezone.now() - timedelta(days=days)
                queryset = queryset.filter(timestamp__gte=date_from)
            except ValueError:
                pass
        
        # Filtre par date de début
        date_from = self.request.query_params.get('date_from', None)
        if date_from:
            queryset = queryset.filter(timestamp__date__gte=date_from)
        
        # Filtre par date de fin
        date_to = self.request.query_params.get('date_to', None)
        if date_to:
            queryset = queryset.filter(timestamp__date__lte=date_to)
        
        # Recherche dans la description
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search) |
                Q(user__username__icontains=search) |
                Q(module__icontains=search)
            )
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Statistiques des activités"""
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Activités aujourd'hui
        today_count = ActivityLog.objects.filter(timestamp__date=today).count()
        
        # Activités cette semaine
        week_count = ActivityLog.objects.filter(timestamp__gte=week_ago).count()
        
        # Activités ce mois
        month_count = ActivityLog.objects.filter(timestamp__gte=month_ago).count()
        
        # Par type d'action
        by_action = ActivityLog.objects.filter(
            timestamp__gte=week_ago
        ).values('action').annotate(count=Count('id'))
        
        # Utilisateurs les plus actifs
        most_active = ActivityLog.objects.filter(
            timestamp__gte=week_ago
        ).values('user__username').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        # Dernières connexions
        recent_logins = ActivityLog.objects.filter(
            action='login'
        ).select_related('user').order_by('-timestamp')[:10]
        
        return Response({
            'today_count': today_count,
            'week_count': week_count,
            'month_count': month_count,
            'by_action': {item['action']: item['count'] for item in by_action},
            'most_active_users': list(most_active),
            'recent_logins': ActivityLogSerializer(recent_logins, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def user_sessions(self, request):
        """Historique des sessions utilisateurs (connexions/déconnexions)"""
        queryset = ActivityLog.objects.filter(
            action__in=['login', 'logout']
        ).select_related('user').order_by('-timestamp')
        
        # Filtre par utilisateur
        user_id = request.query_params.get('user', None)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Limiter aux 100 dernières
        queryset = queryset[:100]
        
        return Response(ActivityLogSerializer(queryset, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_token(request):
    """
    Valide un access token et retourne les informations d'expiration.
    
    Returns:
        - valid: True si le token est valide
        - expires_in: Temps restant avant expiration en secondes
        - user_id: ID de l'utilisateur associé au token
    """
    try:
        # Le token est déjà validé par IsAuthenticated
        # On récupère les informations du token depuis request.auth
        token = request.auth
        
        if token:
            # Calculer le temps restant avant expiration
            exp_timestamp = token.payload.get('exp')
            current_timestamp = datetime.now().timestamp()
            time_remaining = exp_timestamp - current_timestamp
            
            return Response({
                'valid': True,
                'expires_in': int(time_remaining),
                'user_id': token.payload.get('user_id')
            })
        else:
            # Cas où le token n'est pas disponible (ne devrait pas arriver avec IsAuthenticated)
            return Response({
                'valid': False,
                'error': 'Token not found'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except (TokenError, InvalidToken) as e:
        return Response({
            'valid': False,
            'error': str(e)
        }, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({
            'valid': False,
            'error': 'Token validation failed'
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def blacklist_token(request):
    """
    Blacklist un refresh token pour empêcher son utilisation future.
    Utilisé lors de la déconnexion pour invalider le refresh token.
    
    Request body:
        - refresh: Le refresh token à blacklister
    
    Returns:
        - detail: Message de confirmation
    """
    try:
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response({
                'error': 'Refresh token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Créer un objet RefreshToken et le blacklister
        token = RefreshToken(refresh_token)
        token.blacklist()
        
        # Enregistrer l'action dans les logs si l'utilisateur est authentifié
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='token_blacklist',
                description=f"Token blacklisté pour {request.user.username}",
                module='Authentification',
                request=request
            )
        
        return Response({
            'detail': 'Token successfully blacklisted'
        }, status=status.HTTP_200_OK)
        
    except TokenError as e:
        return Response({
            'error': f'Invalid token: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': f'Failed to blacklist token: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
