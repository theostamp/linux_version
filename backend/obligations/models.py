# backend/obligations/models.py
from django.db import models 
   
from buildings.models import Building


class Obligation(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='obligations')
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    is_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-due_date']

    def __str__(self):
        return f"{self.title} ({self.amount}€) - {self.building.name}"
