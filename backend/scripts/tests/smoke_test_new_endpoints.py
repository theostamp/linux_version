import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from django_tenants.utils import schema_context

from users.models import CustomUser
from buildings.models import Building

from maintenance.views import MaintenanceTicketViewSet, WorkOrderViewSet
from projects.views import ProjectViewSet, OfferViewSet, ContractViewSet, MilestoneViewSet


def get_any_user():
    user = CustomUser.objects.first()
    if not user:
        # create a minimal user if none exist
        user = CustomUser.objects.create_user(email='smoke@example.com', password='testpass')
    return user


def run_smoke_tests():
    rf = RequestFactory()
    user = get_any_user()

    with schema_context('demo'):
        # Ensure at least one building exists for filter sanity
        Building.objects.first()

        endpoints = [
            (MaintenanceTicketViewSet, 'list', '/api/maintenance/tickets/'),
            (WorkOrderViewSet, 'list', '/api/maintenance/work-orders/'),
            (ProjectViewSet, 'list', '/api/projects/projects/'),
            (OfferViewSet, 'list', '/api/projects/offers/'),
            (ContractViewSet, 'list', '/api/projects/contracts/'),
            (MilestoneViewSet, 'list', '/api/projects/milestones/'),
        ]

        for viewset_cls, action, path in endpoints:
            request = rf.get(path)
            # For ViewSet testing in DRF, make sure to attach GET as query_params
            request.query_params = request.GET
            force_authenticate(request, user=user)
            view = viewset_cls.as_view({'get': action})
            response = view(request)
            status = response.status_code
            print(f"{path} -> {status}")
            if status >= 400:
                print(getattr(response, 'data', ''))


if __name__ == '__main__':
    run_smoke_tests()


