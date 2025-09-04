from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context
from django_tenants.test.cases import TenantTestCase

from buildings.models import Building
from .models import Project, Offer
from .views import ProjectViewSet, OfferViewSet, MilestoneViewSet


User = get_user_model()


class ProjectsEndpointsTests(TenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.schema_name = 'demo'
        tenant.name = 'Demo Tenant'
        tenant.save()
    def setUp(self):
        self.factory = APIRequestFactory()
        with schema_context('demo'):
            self.user = User.objects.create_user(email='test2@example.com', password='testpass')
            self.manager = User.objects.create_user(email='manager@example.com', password='testpass', is_staff=True)
            self.building = Building.objects.create(
                name='Demo Building 2', address='Street 2', city='Athens', postal_code='11528'
            )

    def test_create_and_list_projects(self):
        with schema_context('demo'):
            payload = {
                'title': 'Painting',
                'description': 'Paint common areas',
                'building': self.building.id,
                'project_type': 'maintenance',
                'status': 'planning',
            }
            # Regular user should be forbidden to create
            req = self.factory.post('/api/projects/projects/', payload, format='json')
            force_authenticate(req, user=self.user)
            create_view = ProjectViewSet.as_view({'post': 'create'})
            resp = create_view(req)
            self.assertIn(resp.status_code, (401, 403))

            # Manager (staff) can create
            req2 = self.factory.post('/api/projects/projects/', payload, format='json')
            force_authenticate(req2, user=self.manager)
            resp2 = create_view(req2)
            self.assertEqual(resp2.status_code, 201)

            list_req = self.factory.get('/api/projects/projects/?building={}'.format(self.building.id))
            list_req.query_params = list_req.GET
            force_authenticate(list_req, user=self.user)
            list_view = ProjectViewSet.as_view({'get': 'list'})
            list_resp = list_view(list_req)
            self.assertEqual(list_resp.status_code, 200)
            self.assertTrue(len(list_resp.data) >= 1)

    def test_list_offers_empty(self):
        with schema_context('demo'):
            req = self.factory.get('/api/projects/offers/')
            req.query_params = req.GET
            force_authenticate(req, user=self.user)
            view = OfferViewSet.as_view({'get': 'list'})
            resp = view(req)
            self.assertEqual(resp.status_code, 200)
            # allow list or paginated dict
            self.assertTrue(isinstance(resp.data, (list, dict)))


# Create your tests here.
