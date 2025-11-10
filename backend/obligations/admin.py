from django.contrib import admin 
   
from .models import Obligation

@admin.register(Obligation)
class ObligationAdmin(admin.ModelAdmin):
    list_display = ('title', 'building', 'amount', 'due_date', 'is_paid')
    list_filter = ('building', 'is_paid', 'due_date')
    search_fields = ('title',)
