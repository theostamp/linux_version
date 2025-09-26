from django.db import models
from django.contrib.auth import get_user_model
from buildings.models import Building

User = get_user_model()


class KioskWidgetConfig(models.Model):
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='kiosk_configs'
    )
    config = models.JSONField(
        default=dict,
        help_text="JSON configuration for kiosk widgets and settings"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_kiosk_configs'
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_kiosk_configs'
    )

    class Meta:
        unique_together = ['building']
        verbose_name = "Kiosk Widget Configuration"
        verbose_name_plural = "Kiosk Widget Configurations"

    def __str__(self):
        return f"Kiosk Config for {self.building.name}"

    @property
    def widgets(self):
        return self.config.get('widgets', [])

    @property
    def settings(self):
        return self.config.get('settings', {
            'slideDuration': 10,
            'refreshInterval': 30,
            'autoRefresh': True
        })

    def get_enabled_widgets(self):
        return [w for w in self.widgets if w.get('enabled', False)]

    def get_widgets_by_category(self, category):
        return [w for w in self.widgets if w.get('category') == category]

    def update_widget(self, widget_id, updates):
        widgets = self.widgets.copy()
        for i, widget in enumerate(widgets):
            if widget.get('id') == widget_id:
                widgets[i].update(updates)
                break
        
        self.config['widgets'] = widgets
        self.save()

    def toggle_widget(self, widget_id, enabled):
        self.update_widget(widget_id, {'enabled': enabled})

    def update_widget_order(self, widget_id, new_order):
        widgets = self.widgets.copy()
        for widget in widgets:
            if widget.get('id') == widget_id:
                widget['order'] = new_order
                break
        
        self.config['widgets'] = widgets
        self.save()

    def update_global_settings(self, settings_updates):
        current_settings = self.settings.copy()
        current_settings.update(settings_updates)
        self.config['settings'] = current_settings
        self.save()

    def reset_to_default(self):
        default_config = {
            'widgets': self._get_default_widgets(),
            'settings': {
                'slideDuration': 10,
                'refreshInterval': 30,
                'autoRefresh': True
            }
        }
        self.config = default_config
        self.save()

    def _get_default_widgets(self):
        return [
            {
                'id': 'dashboard_overview',
                'name': 'Dashboard Overview',
                'description': 'Συνολική επισκόπηση του κτιρίου',
                'category': 'main_slides',
                'enabled': True,
                'order': 0,
                'settings': {}
            },
            {
                'id': 'building_statistics',
                'name': 'Building Statistics',
                'description': 'Στατιστικά κτιρίου',
                'category': 'main_slides',
                'enabled': True,
                'order': 1,
                'settings': {}
            },
            {
                'id': 'emergency_contacts',
                'name': 'Emergency Contacts',
                'description': 'Τηλέφωνα έκτακτης ανάγκης',
                'category': 'main_slides',
                'enabled': True,
                'order': 2,
                'settings': {}
            },
            {
                'id': 'announcements',
                'name': 'Announcements',
                'description': 'Ανακοινώσεις',
                'category': 'main_slides',
                'enabled': True,
                'order': 3,
                'settings': {}
            },
            {
                'id': 'votes',
                'name': 'Votes',
                'description': 'Ψηφοφορίες',
                'category': 'main_slides',
                'enabled': True,
                'order': 4,
                'settings': {}
            },
            {
                'id': 'financial_overview',
                'name': 'Financial Overview',
                'description': 'Οικονομική επισκόπηση',
                'category': 'main_slides',
                'enabled': True,
                'order': 5,
                'settings': {}
            },
            {
                'id': 'maintenance_overview',
                'name': 'Maintenance Overview',
                'description': 'Συντήρηση και επισκευές',
                'category': 'main_slides',
                'enabled': True,
                'order': 6,
                'settings': {}
            },
            {
                'id': 'projects_overview',
                'name': 'Projects Overview',
                'description': 'Έργα και προσφορές',
                'category': 'main_slides',
                'enabled': True,
                'order': 7,
                'settings': {}
            },
            {
                'id': 'current_time',
                'name': 'Current Time',
                'description': 'Τρέχουσα ώρα και ημερομηνία',
                'category': 'sidebar_widgets',
                'enabled': True,
                'order': 0,
                'settings': {}
            },
            {
                'id': 'qr_code_connection',
                'name': 'QR Code Connection',
                'description': 'Σύνδεση με κινητό',
                'category': 'sidebar_widgets',
                'enabled': True,
                'order': 1,
                'settings': {}
            },
            {
                'id': 'weather_widget_sidebar',
                'name': 'Weather Widget',
                'description': 'Πρόγνωση καιρού',
                'category': 'sidebar_widgets',
                'enabled': True,
                'order': 2,
                'settings': {}
            },
            {
                'id': 'internal_manager_info',
                'name': 'Internal Manager Info',
                'description': 'Πληροφορίες διαχειριστή',
                'category': 'sidebar_widgets',
                'enabled': True,
                'order': 3,
                'settings': {}
            },
            {
                'id': 'community_message',
                'name': 'Community Message',
                'description': 'Μήνυμα κοινότητας',
                'category': 'sidebar_widgets',
                'enabled': True,
                'order': 4,
                'settings': {}
            },
            {
                'id': 'advertising_banners_sidebar',
                'name': 'Advertising Banners',
                'description': 'Χρήσιμες υπηρεσίες',
                'category': 'sidebar_widgets',
                'enabled': True,
                'order': 5,
                'settings': {}
            },
            {
                'id': 'weather_widget_topbar',
                'name': 'Weather Top Bar',
                'description': 'Καιρός στην επάνω μπάρα',
                'category': 'top_bar_widgets',
                'enabled': True,
                'order': 0,
                'settings': {}
            },
            {
                'id': 'advertising_banners_topbar',
                'name': 'Advertising Top Bar',
                'description': 'Διαφημίσεις στην επάνω μπάρα',
                'category': 'top_bar_widgets',
                'enabled': True,
                'order': 1,
                'settings': {}
            },
            {
                'id': 'news_ticker',
                'name': 'News Ticker',
                'description': 'Τελευταία νέα',
                'category': 'special_widgets',
                'enabled': True,
                'order': 0,
                'settings': {}
            }
        ]
