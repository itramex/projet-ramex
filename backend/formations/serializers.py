from rest_framework import serializers
from .models import (
    TypeFormation, Formation, TypeCertification, Certification,
    AuditCertification, NonConformite, ActiviteCertification,
)


class TypeFormationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeFormation
        fields = '__all__'


class FormationSerializer(serializers.ModelSerializer):
    producteur_nom = serializers.CharField(source='producteur.nom_complet', read_only=True)
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)
    type_formation_nom = serializers.CharField(source='type_formation.nom', read_only=True)
    
    class Meta:
        model = Formation
        fields = '__all__'
        read_only_fields = ('date_enregistrement', 'enregistre_par')


class FormationListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour les listes"""
    producteur_nom = serializers.CharField(source='producteur.nom_complet', read_only=True)
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)
    type_formation_nom = serializers.CharField(source='type_formation.nom', read_only=True)
    
    class Meta:
        model = Formation
        fields = ('id', 'producteur', 'producteur_nom', 'producteur_code', 
                  'type_formation', 'type_formation_nom', 'date_formation', 
                  'lieu', 'organisme', 'certificat_obtenu')


class TypeCertificationSerializer(serializers.ModelSerializer):
    niveau_display = serializers.CharField(source='get_niveau_display', read_only=True)
    
    class Meta:
        model = TypeCertification
        fields = '__all__'


class CertificationSerializer(serializers.ModelSerializer):
    producteur_nom = serializers.SerializerMethodField()
    producteur_code = serializers.SerializerMethodField()
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True, default='')
    type_certification_nom = serializers.CharField(source='type_certification.nom', read_only=True)
    type_certification_code = serializers.CharField(source='type_certification.code', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    est_valide = serializers.BooleanField(read_only=True)
    niveau_certification_display = serializers.CharField(source='type_certification.get_niveau_display', read_only=True)
    entite_label = serializers.CharField(read_only=True)

    class Meta:
        model = Certification
        fields = (
            'id', 'producteur', 'producteur_nom', 'producteur_code',
            'cooperative', 'cooperative_nom',
            'type_certification', 'type_certification_nom', 'type_certification_code',
            'numero_certificat', 'date_obtention', 'date_expiration',
            'statut', 'statut_display', 'est_valide', 'niveau_certification_display',
            'entite_label',
        )
        read_only_fields = ('date_enregistrement', 'enregistre_par', 'date_modification', 'modifie_par')

    def get_producteur_nom(self, obj):
        return obj.producteur.nom_complet if obj.producteur else None

    def get_producteur_code(self, obj):
        return obj.producteur.code if obj.producteur else None

    def validate(self, attrs):
        """Au moins un producteur OU une coopérative doit être renseigné."""
        producteur = attrs.get('producteur')
        cooperative = attrs.get('cooperative')
        if not producteur and not cooperative:
            raise serializers.ValidationError(
                "Une certification doit être attachée à un producteur ou à une coopérative."
            )
        return attrs


class CertificationListSerializer(serializers.ModelSerializer):
    """Serialiseur simplifié pour les listes"""
    producteur_nom = serializers.SerializerMethodField()
    producteur_code = serializers.SerializerMethodField()
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True, default='')
    type_certification_nom = serializers.CharField(source='type_certification.nom', read_only=True)
    type_certification_code = serializers.CharField(source='type_certification.code', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    est_valide = serializers.BooleanField(read_only=True)
    niveau_certification_display = serializers.CharField(source='type_certification.get_niveau_display', read_only=True)
    entite_label = serializers.CharField(read_only=True)

    class Meta:
        model = Certification
        fields = (
            'id', 'producteur', 'producteur_nom', 'producteur_code',
            'cooperative', 'cooperative_nom',
            'type_certification', 'type_certification_nom', 'type_certification_code',
            'numero_certificat', 'date_obtention', 'date_expiration',
            'statut', 'statut_display', 'est_valide', 'niveau_certification_display',
            'entite_label',
        )

    def get_producteur_nom(self, obj):
        return obj.producteur.nom_complet if obj.producteur else None

    def get_producteur_code(self, obj):
        return obj.producteur.code if obj.producteur else None


class AuditCertificationSerializer(serializers.ModelSerializer):
    type_certification_nom = serializers.CharField(source='type_certification.nom', read_only=True)
    type_certification_code = serializers.CharField(source='type_certification.code', read_only=True)
    resultat_display = serializers.CharField(source='get_resultat_display', read_only=True)
    nb_nonconformites = serializers.IntegerField(read_only=True)

    class Meta:
        model = AuditCertification
        fields = '__all__'


class NonConformiteSerializer(serializers.ModelSerializer):
    audit_info = AuditCertificationSerializer(source='audit', read_only=True)
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)
    producteur_nom = serializers.CharField(source='producteur.nom_complet', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = NonConformite
        fields = '__all__'


class ActiviteCertificationSerializer(serializers.ModelSerializer):
    type_activite_display = serializers.CharField(source='get_type_activite_display', read_only=True)
    type_certification_nom = serializers.CharField(source='type_certification.nom', read_only=True)
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True, default='')
    producteur_nom = serializers.SerializerMethodField()
    producteur_code = serializers.SerializerMethodField()
    responsable_nom = serializers.SerializerMethodField()

    class Meta:
        model = ActiviteCertification
        fields = (
            'id', 'type_activite', 'type_activite_display', 'date',
            'type_certification', 'type_certification_nom',
            'cooperative', 'cooperative_nom',
            'producteur', 'producteur_nom', 'producteur_code',
            'description', 'resultat', 'nombre_participants', 'notes',
            'responsable', 'responsable_nom',
            'date_creation', 'cree_par',
        )
        read_only_fields = ('date_creation', 'cree_par')

    def get_producteur_nom(self, obj):
        return obj.producteur.nom_complet if obj.producteur else None

    def get_producteur_code(self, obj):
        return obj.producteur.code if obj.producteur else None

    def get_responsable_nom(self, obj):
        if obj.responsable:
            return obj.responsable.get_full_name() or obj.responsable.username
        return None
