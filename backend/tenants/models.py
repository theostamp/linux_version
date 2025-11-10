# backend/tenants/models.py
from django.db import models
from django_tenants.models import TenantMixin, DomainMixin
# ➊ αφαίρεσε  from buildings.models import Building


class Client(TenantMixin):

    name = models.CharField(max_length=200)
    created_on = models.DateField(auto_now_add=True)
    paid_until = models.DateField(null=True, blank=True)
    on_trial = models.BooleanField(default=True)    
    is_active = models.BooleanField(default=True)
    trial_days = models.IntegerField(default=30)

    auto_create_schema = True          # (το αφήνεις)
    auto_drop_schema = True            # (το αφήνεις)
    @property
    def status(self):
        if not self.is_active:
            return "Ανενεργός"
        elif self.on_trial:
            return "Δοκιμαστική"
        else:
            return "Ενεργός"
    def __str__(self):
        return self.name


class Domain(DomainMixin):
    pass
