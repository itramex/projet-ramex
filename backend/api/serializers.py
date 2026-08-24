from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer to include user role and profile info"""
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add custom claims
        user = self.user
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        }
        
        # Add profile info
        if hasattr(user, 'profile'):
            data['user']['role'] = user.profile.role
            data['user']['telephone'] = user.profile.telephone
            data['user']['poste'] = user.profile.poste
            if user.profile.cooperative:
                data['user']['cooperative'] = {
                    'id': user.profile.cooperative.id,
                    'nom': user.profile.cooperative.nom,
                    'code': user.profile.cooperative.code,
                }
            if user.profile.agence:
                data['user']['agence'] = {
                    'id': user.profile.agence.id,
                    'nom': user.profile.agence.nom,
                }
        else:
            # Default role if no profile
            data['user']['role'] = 'animateur'
        
        # Determine role_display based on superuser/staff status first
        if user.is_superuser or user.is_staff:
            data['user']['role_display'] = 'Administrateur'
        elif hasattr(user, 'profile'):
            data['user']['role_display'] = user.profile.get_role_display()
        else:
            data['user']['role_display'] = 'Visualiseur'
        
        return data
