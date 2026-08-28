from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import Point, Polygon
from django.contrib.auth.models import User
from .models import Parcelle


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class ParcelleListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des parcelles"""
    producteur_nom = serializers.ReadOnlyField()
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)
    producteur_commune = serializers.CharField(source='producteur.commune', read_only=True)
    photo_url = serializers.SerializerMethodField()
    age_parcelle = serializers.ReadOnlyField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    village = serializers.CharField(source='localisation', read_only=True)
    type_vanille_display = serializers.CharField(source='get_type_vanille_display', read_only=True)
    culture_principale_display = serializers.CharField(source='get_culture_principale_display', read_only=True)
    profil_parcelle_display = serializers.CharField(source='get_profil_parcelle_display', read_only=True)
    distance_habitation_display = serializers.CharField(source='get_distance_habitation_display', read_only=True)
    type_propriete_display = serializers.CharField(source='get_type_propriete_display', read_only=True)
    type_certification_display = serializers.CharField(source='get_type_certification_display', read_only=True)
    distance_km = serializers.SerializerMethodField()
    
    class Meta:
        model = Parcelle
        fields = [
            'id', 'code_parcelle', 'numero_parcelle', 'producteur', 'producteur_nom',
            'producteur_code', 'producteur_commune', 'localisation', 'village', 'dimension_ha',
            'annee_creation', 'nombre_pieds', 'type_vanille', 'type_vanille_display', 'culture_principale', 'culture_principale_display', 'cultures_pratiquees',
            'productions_par_culture', 'estimation_production_kg', 'certifiee', 'type_certification', 'type_certification_display',
            'active', 'photo_url', 'annee_plantation', 'age_parcelle', 'date_enregistrement',
            'latitude', 'longitude', 'profil_parcelle', 'profil_parcelle_display', 'distance_habitation', 'distance_habitation_display',
            'type_propriete', 'type_propriete_display', 'distance_km'
        ]
    
    def get_photo_url(self, obj):
        if obj.photo_parcelle:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo_parcelle.url)
        return None
    
    def get_latitude(self, obj):
        return obj.latitude
    
    def get_longitude(self, obj):
        return obj.longitude

    def get_distance_km(self, obj):
        """Distance en km (présente uniquement quand annotée par l'action nearby)"""
        distance = getattr(obj, 'distance', None)
        if distance is not None:
            try:
                return round(distance.km, 2)
            except Exception:
                return None
        return None


class ParcelleGeoJSONSerializer(GeoFeatureModelSerializer):
    """Serializer GeoJSON pour affichage sur carte Leaflet"""
    producteur_nom = serializers.ReadOnlyField()
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)
    age_parcelle = serializers.ReadOnlyField()
    
    class Meta:
        model = Parcelle
        geo_field = 'point'  # Champ géospatial principal
        fields = [
            'id', 'code_parcelle', 'numero_parcelle', 'producteur_nom', 'producteur_code',
            'localisation', 'dimension_ha', 'nombre_pieds', 'type_vanille', 'culture_principale',
            'cultures_pratiquees', 'certifiee', 'type_certification', 'age_parcelle'
        ]


class ParcelleDetailSerializer(serializers.ModelSerializer):
    """Serializer pour les détails d'une parcelle"""
    cree_par_info = UserSerializer(source='cree_par', read_only=True)
    modifie_par_info = UserSerializer(source='modifie_par', read_only=True)
    photo_url = serializers.SerializerMethodField()
    producteur_nom = serializers.ReadOnlyField()
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)
    producteur_commune = serializers.CharField(source='producteur.commune', read_only=True)
    age_parcelle = serializers.ReadOnlyField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    superficie_m2 = serializers.ReadOnlyField()
    polygon_geojson = serializers.SerializerMethodField()
    type_vanille_display = serializers.CharField(source='get_type_vanille_display', read_only=True)
    culture_principale_display = serializers.CharField(source='get_culture_principale_display', read_only=True)
    profil_parcelle_display = serializers.CharField(source='get_profil_parcelle_display', read_only=True)
    distance_habitation_display = serializers.CharField(source='get_distance_habitation_display', read_only=True)
    type_propriete_display = serializers.CharField(source='get_type_propriete_display', read_only=True)
    type_certification_display = serializers.CharField(source='get_type_certification_display', read_only=True)
    
    class Meta:
        model = Parcelle
        fields = '__all__'
        read_only_fields = [
            'date_enregistrement', 'date_modification',
            'cree_par', 'modifie_par', 'code_parcelle'
        ]
    
    def get_photo_url(self, obj):
        if obj.photo_parcelle:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo_parcelle.url)
        return None
    
    def get_latitude(self, obj):
        return obj.latitude
    
    def get_longitude(self, obj):
        return obj.longitude
    
    def get_polygon_geojson(self, obj):
        """Retourner le polygone au format GeoJSON"""
        # Log pour débogage
        import logging
        logger = logging.getLogger(__name__)
        logger.debug(f"=== get_polygon_geojson called for parcelle {obj.id} ===")
        
        if obj.polygon:
            try:
                logger.debug(f"Polygon found for parcelle {obj.id}: {obj.polygon}")
                logger.debug(f"Polygon SRID: {obj.polygon.srid}")
                logger.debug(f"Polygon coords: {obj.polygon.coords}")
                
                # Log the original coordinates before any transformation
                original_coords = list(obj.polygon.coords)
                logger.debug(f"Original coords: {original_coords}")
                
                # Check if the polygon is valid
                if not obj.polygon.valid:
                    logger.warning(f"Invalid polygon for parcelle {obj.id}")
                    return None
                
                # Transformation des coordonnées en GeoJSON
                # GeoJSON utilise [longitude, latitude] (pas [latitude, longitude])
                try:
                    # Essayer d'accéder aux coordonnées
                    coords = list(obj.polygon.coords)
                except Exception as coord_error:
                    logger.error(f"Erreur accès coordonnées pour parcelle {obj.id}: {str(coord_error)}")
                    # Si erreur d'accès aux coordonnées, essayer de transformer le polygon
                    try:
                        # Forcer la transformation en WGS84 (SRID 4326) si nécessaire
                        if obj.polygon.srid != 4326:
                            transformed_polygon = obj.polygon.transform(4326, clone=True)
                            coords = list(transformed_polygon.coords)
                            logger.debug(f"Transformed coords: {coords}")
                        else:
                            coords = list(obj.polygon.coords)
                    except Exception as transform_error:
                        logger.error(f"Erreur transformation polygon pour parcelle {obj.id}: {str(transform_error)}")
                        return None
                
                # Vérifier et corriger l'ordre des coordonnées si nécessaire
                # GeoJSON standard: [longitude, latitude]
                if coords and len(coords) > 0:
                    # Vérifier le premier anneau et le premier point
                    first_ring = coords[0]
                    if len(first_ring) > 0:
                        first_point = first_ring[0]
                        if len(first_point) >= 2:
                            # Pour Madagascar, les coordonnées typiques sont:
                            # Latitude: entre -12 et -26 (valeur absolue: 12-26)
                            # Longitude: entre 43 et 51 (valeur absolue: 43-51)
                            
                            first_val = first_point[0]
                            second_val = first_point[1]
                            abs_first = abs(first_val)
                            abs_second = abs(second_val)
                            
                            # Pour Madagascar, si la première valeur a une valeur absolue > 40, 
                            # c'est probablement la latitude, donc l'ordre est [lat, lng]
                            # Et il faut le convertir en [lng, lat] pour GeoJSON
                            is_first_likely_lat = abs_first > 40
                            is_second_likely_lng = abs_second < 30
                            
                            logger.debug(f"Abs first: {abs_first}, Abs second: {abs_second}")
                            logger.debug(f"First likely lat: {is_first_likely_lat}, Second likely lng: {is_second_likely_lng}")
                            
                            if is_first_likely_lat and is_second_likely_lng:
                                # Les coordonnées sont dans l'ordre [lat, lng], les convertir en [lng, lat] pour GeoJSON
                                logger.debug("Converting coordinates from [lat,lng] to [lng,lat] for GeoJSON")
                                corrected_coords = []
                                for ring in coords:
                                    corrected_ring = []
                                    for point in ring:
                                        if len(point) >= 2:
                                            corrected_ring.append([point[1], point[0]])  # [lng, lat] from [lat, lng]
                                        else:
                                            corrected_ring.append(point)
                                    corrected_coords.append(corrected_ring)
                                coords = corrected_coords
                                logger.debug(f"Corrected coords: {coords}")
                            else:
                                # Vérifier si l'ordre est déjà correct
                                is_first_likely_lng = abs_first < 30
                                is_second_likely_lat = abs_second > 40
                                
                                if is_first_likely_lng and is_second_likely_lat:
                                    logger.debug("Coordinates are already in correct [lng,lat] order for GeoJSON")
                                else:
                                    logger.warning(f"Unexpected coordinate format: {first_point}")
                
                # coords est un tuple de rings, le premier étant l'extérieur
                if coords and len(coords) > 0:
                    logger.debug(f"Final coords being sent: {coords}")
                    result = {
                        'type': 'Polygon',
                        'coordinates': coords
                    }
                    logger.debug(f"Polygon GeoJSON result: {result}")
                    return result
            except Exception as e:
                # En cas d'erreur, logger et retourner None
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Erreur conversion polygon GeoJSON for parcelle {obj.id}: {str(e)}")
                logger.exception("Exception details:")
                return None
        else:
            import logging
            logger = logging.getLogger(__name__)
            logger.debug(f"No polygon found for parcelle {obj.id}")
        return None


class ParcelleCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour création et mise à jour"""
    latitude = serializers.DecimalField(
        max_digits=10, decimal_places=8,
        required=False, allow_null=True,
        write_only=True
    )
    longitude = serializers.DecimalField(
        max_digits=11, decimal_places=8,
        required=False, allow_null=True,
        write_only=True
    )

    polygon_coordinates = serializers.ListField(
        child=serializers.ListField(
            child=serializers.FloatField()
        ),
        required=False,
        write_only=True
    )
    
    # Display fields for choices (read-only)
    type_vanille_display = serializers.CharField(source='get_type_vanille_display', read_only=True)
    culture_principale_display = serializers.CharField(source='get_culture_principale_display', read_only=True)
    profil_parcelle_display = serializers.CharField(source='get_profil_parcelle_display', read_only=True)
    distance_habitation_display = serializers.CharField(source='get_distance_habitation_display', read_only=True)
    type_propriete_display = serializers.CharField(source='get_type_propriete_display', read_only=True)
    type_certification_display = serializers.CharField(source='get_type_certification_display', read_only=True)
    
    class Meta:
        model = Parcelle
        exclude = ['date_enregistrement', 'date_modification', 'cree_par', 'modifie_par', 'code_parcelle', 'point', 'polygon']
    
    def validate(self, data):
        """Validations"""
        # Vérifier que le numéro de parcelle est unique pour ce producteur
        producteur = data.get('producteur')
        numero_parcelle = data.get('numero_parcelle')
        
        if producteur and numero_parcelle:
            instance = self.instance
            queryset = Parcelle.objects.filter(
                producteur=producteur,
                numero_parcelle=numero_parcelle
            )
            
            if instance:
                queryset = queryset.exclude(pk=instance.pk)
            
            if queryset.exists():
                raise serializers.ValidationError({
                    'numero_parcelle': f'Ce producteur a déjà une parcelle P{numero_parcelle}.'
                })
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        
        # Extraire latitude/longitude
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)
        polygon_coords = validated_data.pop('polygon_coordinates', None)
        if polygon_coords:
            from django.contrib.gis.geos import Polygon
            validated_data['polygon'] = Polygon(polygon_coords, srid=4326)
        
        # Créer Point PostGIS
        if latitude and longitude:
            validated_data['point'] = Point(float(longitude), float(latitude), srid=4326)
            validated_data['gps_latitude'] = latitude
            validated_data['gps_longitude'] = longitude
        
        if request and request.user:
            validated_data['cree_par'] = request.user
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        request = self.context.get('request')
        
        # Extraire latitude/longitude
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)
        
        # Mettre à jour Point PostGIS
        if latitude and longitude:
            validated_data['point'] = Point(float(longitude), float(latitude), srid=4326)
            validated_data['gps_latitude'] = latitude
            validated_data['gps_longitude'] = longitude
        
        if request and request.user:
            validated_data['modifie_par'] = request.user
        
        return super().update(instance, validated_data)
