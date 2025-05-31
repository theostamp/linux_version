from django.db import models # type: ignore  # type: ignore  # type: ignore
from django_tenants.models import TenantMixin, DomainMixin # type: ignore  # type: ignore  # type: ignore
from buildings.models import Building
from django.utils.translation import gettext_lazy as _ # type: ignore  # type: ignore  # type: ignore

class Client(TenantMixin):
    building = models.OneToOneField(
        Building, on_delete=models.CASCADE,
        null=True, blank=True
    )
    name = models.CharField(max_length=200)
    created_on = models.DateField(auto_now_add=True)
    paid_until = models.DateField(null=True, blank=True)
    on_trial = models.BooleanField(default=True)

    auto_create_schema = True

    def __str__(self):
        return self.name
    

class Domain(DomainMixin):
    pass    
    # The domain name must be unique
    # and must not contain any special characters
    # or spaces. It should be a valid domain name   
