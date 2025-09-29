from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from buildings.models import Building
from apartments.models import Apartment

from todo_management.models import TodoItem
from todo_management.services import sync_financial_overdues, sync_maintenance_schedule


class SyncServicesTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(email='test@example.com', password='pass', is_staff=True)
        self.building = Building.objects.create(name='Test Building', address='Addr', city='City', postal_code='00000')

    def test_sync_financial_overdues_creates_todo(self):
        Apartment.objects.create(building=self.building, number='A1', current_balance=-50)
        result = sync_financial_overdues(building_id=self.building.id, actor=self.user)
        assert result['created'] == 1
        assert TodoItem.objects.filter(building=self.building, tags__contains=['financial_overdue']).count() == 1

    def test_sync_financial_overdues_skips_duplicates(self):
        apt = Apartment.objects.create(building=self.building, number='A2', current_balance=-10)
        # First run
        sync_financial_overdues(building_id=self.building.id, actor=self.user)
        # Second run should skip
        result = sync_financial_overdues(building_id=self.building.id, actor=self.user)
        assert result['skipped'] == 1

    def test_sync_maintenance_schedule_creates_todo(self):
        from maintenance.models import ScheduledMaintenance, Contractor
        contractor = Contractor.objects.create(name='Crew', service_type='heating')
        ScheduledMaintenance.objects.create(
            title='Boiler Service', description='Annual check', building=self.building,
            contractor=contractor, scheduled_date=timezone.now().date(), estimated_duration=2, priority='high'
        )
        result = sync_maintenance_schedule(building_id=self.building.id, actor=self.user)
        assert result['created'] == 1
        assert TodoItem.objects.filter(building=self.building, tags__contains=['maintenance']).count() == 1

    def test_sync_maintenance_schedule_skips_duplicates(self):
        from maintenance.models import ScheduledMaintenance, Contractor
        contractor = Contractor.objects.create(name='Crew2', service_type='heating')
        maint = ScheduledMaintenance.objects.create(
            title='Elevator', description='Monthly check', building=self.building,
            contractor=contractor, scheduled_date=timezone.now().date(), estimated_duration=1, priority='medium'
        )
        # First run
        sync_maintenance_schedule(building_id=self.building.id, actor=self.user)
        # Second run should skip
        result = sync_maintenance_schedule(building_id=self.building.id, actor=self.user)
        assert result['skipped'] == 1
