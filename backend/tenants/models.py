# backend/tenants/models.py
from django.db import models
from django_tenants.models import TenantMixin, DomainMixin
# ➊ αφαίρεσε  from buildings.models import Building
from django.utils.translation import gettext_lazy as _


class Client(TenantMixin):
    # ➋ σβήσε (ή σχολίασε) τελείως το πεδίο building
    # building = models.OneToOneField(
    #     Building, on_delete=models.CASCADE,
    #     null=True, blank=True
    # )
    name = models.CharField(max_length=200)
    created_on = models.DateField(auto_now_add=True)
    paid_until = models.DateField(null=True, blank=True)
    on_trial = models.BooleanField(default=True)

    auto_create_schema = True          # (το αφήνεις)

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    pass
