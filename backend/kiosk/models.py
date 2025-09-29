from django.db import models
from django.contrib.auth import get_user_model
from buildings.models import Building

User = get_user_model()

class KioskWidget(models.Model):
    """
    Model for storing kiosk widget configurations in the database
    """
    id = models.AutoField(primary_key=True)
    widget_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    greek_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    greek_description = models.TextField(blank=True)
    category = models.CharField(max_length=50)
    icon = models.CharField(max_length=50)
    enabled = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    settings = models.JSONField(default=dict)
    component = models.CharField(max_length=100)
    data_source = models.CharField(max_length=200, blank=True)
    is_custom = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    building = models.ForeignKey(Building, on_delete=models.CASCADE, null=True, blank=True)
    
    class Meta:
        db_table = 'kiosk_widget_configs'
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['widget_id']),
            models.Index(fields=['building', 'enabled']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.greek_name} ({self.widget_id})"

    def to_dict(self):
        """Convert model instance to dictionary for API responses"""
        return {
            'id': self.widget_id,
            'name': self.name,
            'greekName': self.greek_name,
            'description': self.description,
            'greekDescription': self.greek_description,
            'category': self.category,
            'icon': self.icon,
            'enabled': self.enabled,
            'order': self.order,
            'settings': self.settings,
            'component': self.component,
            'dataSource': self.data_source,
            'isCustom': self.is_custom,
            'lastModified': self.updated_at.isoformat(),
            'createdAt': self.created_at.isoformat(),
            'buildingId': self.building.id if self.building else None,
        }

    @classmethod
    def from_dict(cls, data, user=None, building=None):
        """Create model instance from dictionary"""
        return cls(
            widget_id=data['id'],
            name=data['name'],
            greek_name=data['greekName'],
            description=data.get('description', ''),
            greek_description=data.get('greekDescription', ''),
            category=data['category'],
            icon=data['icon'],
            enabled=data.get('enabled', True),
            order=data.get('order', 0),
            settings=data.get('settings', {}),
            component=data['component'],
            data_source=data.get('dataSource', ''),
            is_custom=data.get('isCustom', False),
            created_by=user,
            building=building,
        )


class KioskDisplaySettings(models.Model):
    """
    Model for storing kiosk display settings
    """
    building = models.OneToOneField(Building, on_delete=models.CASCADE, primary_key=True)
    slide_duration = models.IntegerField(default=10000)  # milliseconds
    auto_slide = models.BooleanField(default=True)
    show_navigation = models.BooleanField(default=True)
    background_image = models.CharField(max_length=200, blank=True)
    theme = models.CharField(max_length=50, default='default')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'kiosk_display_configs'

    def __str__(self):
        return f"Kiosk Config for {self.building.name}"

    def to_dict(self):
        return {
            'buildingId': self.building.id,
            'slideDuration': self.slide_duration,
            'autoSlide': self.auto_slide,
            'showNavigation': self.show_navigation,
            'backgroundImage': self.background_image,
            'theme': self.theme,
            'updatedAt': self.updated_at.isoformat(),
        }