from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context
from django_tenants.test.cases import TenantTestCase

from buildings.models import Building
from .models import Contractor, MaintenanceTicket, WorkOrder
from .views import MaintenanceTicketViewSet, WorkOrderViewSet


User = get_user_model()


class MaintenanceEndpointsTests(TenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.schema_name = 'demo'
        tenant.name = 'Demo Tenant'
        tenant.save()
    def setUp(self):
        self.factory = APIRequestFactory()
        with schema_context('demo'):
            self.user = User.objects.create_user(email='test@example.com', password='testpass')
            self.manager = User.objects.create_user(email='maint_manager@example.com', password='testpass', is_staff=True)
            self.building = Building.objects.create(
                name='Demo Building',
                address='Street 1',
                city='Athens',
                postal_code='11528',
            )
            self.contractor = Contractor.objects.create(
                name='Demo Contractor',
                service_type='maintenance',
                contact_person='John',
                phone='2100000000',
            )

    def test_list_tickets(self):
        with schema_context('demo'):
            MaintenanceTicket.objects.create(
                building=self.building,
                title='Leak',
                description='Kitchen leak',
                category='plumbing',
                reporter=self.user,
            )

            request = self.factory.get('/api/maintenance/tickets/?building={}'.format(self.building.id))
            request.query_params = request.GET
            force_authenticate(request, user=self.user)
            view = MaintenanceTicketViewSet.as_view({'get': 'list'})
            response = view(request)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(len(response.data) >= 1)

    def test_create_ticket(self):
        with schema_context('demo'):
            payload = {
                'building': self.building.id,
                'title': 'Elevator issue',
                'description': 'Stuck between floors',
                'category': 'elevator',
                'priority': 'high',
            }
            # Regular user should be forbidden to create
            request = self.factory.post('/api/maintenance/tickets/', payload, format='json')
            force_authenticate(request, user=self.user)
            view = MaintenanceTicketViewSet.as_view({'post': 'create'})
            response = view(request)
            self.assertIn(response.status_code, (401, 403))

            # Manager can create
            request2 = self.factory.post('/api/maintenance/tickets/', payload, format='json')
            force_authenticate(request2, user=self.manager)
            response2 = view(request2)
            self.assertEqual(response2.status_code, 201)
            self.assertEqual(response2.data['title'], 'Elevator issue')

    def test_list_workorders(self):
        with schema_context('demo'):
            ticket = MaintenanceTicket.objects.create(
                building=self.building,
                title='Light out',
                description='Hallway',
                category='electrical',
                reporter=self.user,
            )
            WorkOrder.objects.create(ticket=ticket, contractor=self.contractor, status='scheduled')

            request = self.factory.get('/api/maintenance/work-orders/?ticket={}'.format(ticket.id))
            request.query_params = request.GET
            force_authenticate(request, user=self.user)
            view = WorkOrderViewSet.as_view({'get': 'list'})
            response = view(request)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(len(response.data) >= 1)

    def test_create_workorder(self):
        with schema_context('demo'):
            ticket = MaintenanceTicket.objects.create(
                building=self.building,
                title='HVAC maintenance',
                description='Annual',
                category='hvac',
                reporter=self.user,
            )
            payload = {
                'ticket': ticket.id,
                'contractor': self.contractor.id,
                'status': 'scheduled',
            }
            request = self.factory.post('/api/maintenance/work-orders/', payload, format='json')
            force_authenticate(request, user=self.user)
            view = WorkOrderViewSet.as_view({'post': 'create'})
            response = view(request)
            self.assertIn(response.status_code, (401, 403))

            request2 = self.factory.post('/api/maintenance/work-orders/', payload, format='json')
            force_authenticate(request2, user=self.manager)
            response2 = view(request2)
            self.assertEqual(response2.status_code, 201)
            self.assertEqual(response2.data['ticket'], ticket.id)
