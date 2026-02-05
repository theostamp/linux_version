from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from buildings.models import Building
from apartments.models import Apartment

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


class KioskScene(models.Model):
    """
    Model for storing kiosk scenes - complete layouts with multiple widgets
    """
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='kiosk_scenes')
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)
    duration_seconds = models.PositiveIntegerField(default=30, help_text="Duration in seconds")
    transition = models.CharField(max_length=50, default='fade', help_text="Transition type (fade, slide, etc.)")
    is_enabled = models.BooleanField(default=True)
    
    # Time-based activation (optional)
    active_start_time = models.TimeField(null=True, blank=True, help_text="Scene active from this time")
    active_end_time = models.TimeField(null=True, blank=True, help_text="Scene active until this time")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'kiosk_scenes'
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['building', 'is_enabled']),
            models.Index(fields=['order']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.building.name}"
    
    def to_dict(self):
        """Convert model instance to dictionary for API responses"""
        return {
            'id': self.id,
            'buildingId': self.building.id if self.building else None,
            'name': self.name,
            'order': self.order,
            'durationSeconds': self.duration_seconds,
            'transition': self.transition,
            'isEnabled': self.is_enabled,
            'activeStartTime': self.active_start_time.isoformat() if self.active_start_time else None,
            'activeEndTime': self.active_end_time.isoformat() if self.active_end_time else None,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
        }


class WidgetPlacement(models.Model):
    """
    Model for defining widget position and size within a scene
    """
    scene = models.ForeignKey(KioskScene, on_delete=models.CASCADE, related_name='placements')
    widget = models.ForeignKey(KioskWidget, on_delete=models.CASCADE)
    
    # Grid properties from Canvas Editor
    grid_row_start = models.PositiveIntegerField(help_text="Starting row in grid (1-indexed)")
    grid_col_start = models.PositiveIntegerField(help_text="Starting column in grid (1-indexed)")
    grid_row_end = models.PositiveIntegerField(help_text="Ending row in grid (1-indexed)")
    grid_col_end = models.PositiveIntegerField(help_text="Ending column in grid (1-indexed)")
    
    # Additional placement settings
    z_index = models.IntegerField(default=0, help_text="Layer order for overlapping widgets")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'kiosk_widget_placements'
        unique_together = ('scene', 'widget')
        ordering = ['z_index', 'grid_row_start', 'grid_col_start']
        indexes = [
            models.Index(fields=['scene']),
        ]
    
    def __str__(self):
        return f"{self.widget.greek_name} in {self.scene.name}"
    
    def to_dict(self):
        """Convert model instance to dictionary for API responses"""
        return {
            'id': self.id,
            'sceneId': self.scene.id,
            'widgetId': self.widget.widget_id,
            'gridRowStart': self.grid_row_start,
            'gridColStart': self.grid_col_start,
            'gridRowEnd': self.grid_row_end,
            'gridColEnd': self.grid_col_end,
            'zIndex': self.z_index,
            'widget': self.widget.to_dict(),
        }


class KioskAuditAction(models.TextChoices):
    TOKEN_ISSUED = "token_issued", "Token Issued"
    REGISTER_ATTEMPT = "register_attempt", "Register Attempt"
    REGISTER_SUCCESS = "register_success", "Register Success"
    REGISTER_FAILED = "register_failed", "Register Failed"


class KioskAuditLog(models.Model):
    """
    Audit log for kiosk/public flows (token issuance, connect/register).
    """

    timestamp = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=30, choices=KioskAuditAction.choices)
    status = models.CharField(max_length=30, blank=True)

    building = models.ForeignKey(Building, on_delete=models.SET_NULL, null=True, blank=True)
    apartment = models.ForeignKey(Apartment, on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Kiosk Audit Log"
        verbose_name_plural = "Kiosk Audit Logs"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["timestamp"]),
            models.Index(fields=["action"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f\"{self.timestamp} - {self.action} - {self.status}\"

    @classmethod
    def log_event(
        cls,
        *,
        action: str,
        status: str = "",
        building=None,
        apartment=None,
        user=None,
        email: str = "",
        phone: str = "",
        request=None,
        metadata=None,
    ):
        try:
            return cls.objects.create(
                action=action,
                status=status,
                building=building,
                apartment=apartment,
                user=user if getattr(user, "is_authenticated", False) else None,
                email=email,
                phone=phone,
                ip_address=getattr(request, "META", {}).get("REMOTE_ADDR"),
                user_agent=getattr(request, "META", {}).get("HTTP_USER_AGENT", ""),
                metadata=metadata or {},
            )
        except Exception:
            return None
