from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard_global, name='dashboard_global'),
    path('decisionnel/export/', views.dashboard_decisionnel_export, name='dashboard_decisionnel_export'),
    path('decisionnel/', views.dashboard_decisionnel, name='dashboard_decisionnel'),
    path('producteurs/', views.dashboard_producteurs, name='dashboard_producteurs'),
    path('hygiene/', views.dashboard_hygiene, name='dashboard_hygiene'),
    path('environnement/', views.dashboard_environnement, name='dashboard_environnement'),
    path('enfants/', views.dashboard_enfants, name='dashboard_enfants'),
    path('villages-communes/', views.get_villages_and_communes, name='get_villages_and_communes'),
    path('village-references/', views.get_village_references, name='get_village_references'),
    path('villages/', views.create_village, name='create_village'),
    path('villages/import-excel/', views.import_villages_excel, name='import_villages_excel'),
    path('production/', views.dashboard_production, name='dashboard_production'),
    path('production-par-culture/', views.dashboard_production_par_culture, name='dashboard_production_par_culture'),
]
