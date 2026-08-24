from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile, ActivityLog
from cooperatives.models import Cooperative
from geographie.models import Agence


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer pour le profil utilisateur"""
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True)
    agence_nom = serializers.CharField(source='agence.nom', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['role', 'role_display', 'telephone', 'poste', 'cooperative', 'cooperative_nom', 'agence', 'agence_nom', 'actif']


class UserListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des utilisateurs"""
    profile = UserProfileSerializer(read_only=True)
    nom_complet = serializers.SerializerMethodField()
    derniere_connexion = serializers.DateTimeField(source='last_login', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'nom_complet',
            'is_active', 'is_staff', 'is_superuser', 'date_joined', 'derniere_connexion',
            'profile'
        ]
    
    def get_nom_complet(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        return obj.username


class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour un utilisateur"""
    profile = UserProfileSerializer()
    nom_complet = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'nom_complet',
            'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login',
            'profile'
        ]
        read_only_fields = ['date_joined', 'last_login']
    
    def get_nom_complet(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        return obj.username
    
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        
        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update UserProfile fields
        if profile_data and hasattr(instance, 'profile'):
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        
        return instance


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un nouvel utilisateur"""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=UserProfile.ROLE_CHOICES, required=False, default='animateur')
    telephone = serializers.CharField(required=False, allow_blank=True)
    poste = serializers.CharField(required=False, allow_blank=True)
    cooperative = serializers.PrimaryKeyRelatedField(
        queryset=Cooperative.objects.all(),
        required=False,
        allow_null=True
    )
    agence = serializers.PrimaryKeyRelatedField(
        queryset=Agence.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'is_active', 'is_staff',
            'role', 'telephone', 'poste', 'cooperative', 'agence'
        ]
    
    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        return attrs
    
    def create(self, validated_data):
        # Extract profile fields
        validated_data.pop('password_confirm')
        role = validated_data.pop('role', 'animateur')
        telephone = validated_data.pop('telephone', None)
        poste = validated_data.pop('poste', None)
        cooperative = validated_data.pop('cooperative', None)
        agence = validated_data.pop('agence', None)
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        # Update profile
        profile = user.profile
        profile.role = role
        profile.telephone = telephone
        profile.poste = poste
        profile.cooperative = cooperative
        profile.agence = agence
        profile.save()
        
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer pour changer le mot de passe"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Les mots de passe ne correspondent pas."})
        return attrs


class ResetPasswordSerializer(serializers.Serializer):
    """Serializer pour réinitialiser le mot de passe (admin)"""
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Les mots de passe ne correspondent pas."})
        return attrs


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer pour les journaux d'activité"""
    username = serializers.CharField(source='user.username', read_only=True)
    user_nom_complet = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'username', 'user_nom_complet', 'action', 'action_display',
            'module', 'description', 'object_type', 'object_id', 'ip_address',
            'timestamp', 'extra_data'
        ]
        read_only_fields = ['id', 'timestamp']
    
    def get_user_nom_complet(self, obj):
        if obj.user:
            if obj.user.first_name and obj.user.last_name:
                return f"{obj.user.first_name} {obj.user.last_name}"
            return obj.user.username
        return 'Anonyme'
