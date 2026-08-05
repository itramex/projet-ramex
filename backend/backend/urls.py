from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from api.serializers import CustomTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from users.models import ActivityLog
from users.views import blacklist_token
from dashboard.views import dashboard_decisionnel_export
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        # Si la connexion a réussi, enregistrer dans les logs
        if response.status_code == 200:
            try:
                from django.contrib.auth.models import User
                username = request.data.get('username')
                user = User.objects.filter(username=username).first()
                
                if user:
                    # Enregistrer la connexion
                    ActivityLog.log(
                        user=user,
                        action='login',
                        description=f"Connexion réussie de {user.username}",
                        module='Authentification',
                        request=request
                    )
                    
                    # Mettre à jour last_login
                    from django.utils import timezone
                    user.last_login = timezone.now()
                    user.save(update_fields=['last_login'])
            except Exception as e:
                print(f"Erreur lors de l'enregistrement du log de connexion: {e}")
        
        return response


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/blacklist/', blacklist_token, name='token_blacklist'),
    path('api/dashboard/decisionnel/export/', dashboard_decisionnel_export, name='root_dashboard_decisionnel_export'),
    path('api/', include('api.urls')),
    path('api/history/', include('history.urls')),
    
    # OpenAPI/Swagger Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
