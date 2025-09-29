from django.urls import path
from . import views

app_name = 'data_migration'

urlpatterns = [
    path('analyze-images/', views.analyze_form_images, name='analyze_form_images'),
    path('import-data/', views.import_migrated_data, name='import_migrated_data'),
    path('validate-data/', views.validate_migration_data, name='validate_migration_data'),
    path('templates/', views.get_migration_templates, name='get_migration_templates'),
] 