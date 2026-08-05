from rest_framework import serializers
from .models import TypeFormation, Formation, TypeCertification, Certification, AuditCertification, NonConformite


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
    producteur_nom = serializers.CharField(source='producteur.nom_complet', read_only=True)
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)
    type_certification_nom = serializers.CharField(source='type_certification.nom', read_only=True)
    type_certification_code = serializers.CharField(source='type_certification.code', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    est_valide = serializers.BooleanField(read_only=True)
    niveau_certification_display = serializers.CharField(source='type_certification.get_niveau_display', read_only=True)
    
    class Meta:
        model = Certification
        fields = '__all__'
        read_only_fields = ('date_enregistrement', 'enregistre_par', 'date_modification', 'modifie_par')


class CertificationListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour les listes"""
    producteur_nom = serializers.CharField(source='producteur.nom_complet', read_only=True)
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)
    type_certification_nom = serializers.CharField(source='type_certification.nom', read_only=True)
    type_certification_code = serializers.CharField(source='type_certification.code', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    est_valide = serializers.BooleanField(read_only=True)
    niveau_certification_display = serializers.CharField(source='type_certification.get_niveau_display', read_only=True)
    
    class Meta:
        model = Certification
        fields = ('id', 'producteur', 'producteur_nom', 'producteur_code',
                  'type_certification', 'type_certification_nom', 'type_certification_code',
                  'numero_certificat', 'date_obtention', 'date_expiration', 
                  'statut', 'statut_display', 'est_valide', 'niveau_certification_display')


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
