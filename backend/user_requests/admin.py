# backend/user_requests/admin.py

import csv
from django.contrib import admin 
    #
   
from django.http import HttpResponse
   

from .models import UserRequest, UrgentRequestLog


@admin.register(UserRequest)
class UserRequestAdmin(admin.ModelAdmin):
    list_display = ('title', 'building', 'created_by', 'type', 'status', 'priority', 'supporter_count_cached', 'is_urgent', 'assigned_to', 'created_at')
    list_filter = ('building', 'status', 'type', 'priority', 'created_at')
    search_fields = ('title', 'description', 'created_by__email', 'building__name', 'assigned_to__email')
    ordering = ('-priority', '-created_at')
    readonly_fields = ('created_at', 'updated_at', 'completed_at', 'supporter_count_cached', 'days_since_creation', 'is_overdue')
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('title', 'description', 'building', 'created_by', 'type')
        }),
        ('Κατάσταση', {
            'fields': ('status', 'priority', 'assigned_to')
        }),
        ('Ημερομηνίες', {
            'fields': ('created_at', 'updated_at', 'completed_at', 'estimated_completion')
        }),
        ('Σημειώσεις', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Πληροφορίες', {
            'fields': ('supporter_count_cached', 'days_since_creation', 'is_overdue'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(building__manager=request.user)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "building" and not request.user.is_superuser:
            if "queryset" in kwargs:
                kwargs["queryset"] = kwargs["queryset"].filter(manager=request.user)
        elif db_field.name == "assigned_to":
            # Μόνο staff users μπορούν να αναλάβουν αιτήματα
            if "queryset" in kwargs:
                kwargs["queryset"] = kwargs["queryset"].filter(is_staff=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        if not change:  # Αν είναι νέο αίτημα
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def supporter_count_display(self, obj):
        return obj.supporter_count
    supporter_count_display.short_description = 'Υποστηρικτές'
    supporter_count_display.admin_order_field = 'supporter_count'


class YearMonthFilter(admin.SimpleListFilter):
    title = 'Έτος και Μήνας'
    parameter_name = 'year_month'

    def lookups(self, request, model_admin):
        dates = UrgentRequestLog.objects.dates('triggered_at', 'month')
        return [
            (f"{date.year}-{date.month}", f"{date.strftime('%B %Y')}")
            for date in dates
        ]

    def queryset(self, request, queryset):
        if self.value():
            year, month = self.value().split('-')
            return queryset.filter(triggered_at__year=year, triggered_at__month=month)
        return queryset


@admin.register(UrgentRequestLog)
class UrgentRequestLogAdmin(admin.ModelAdmin):
    list_display = ('user_request', 'supporter_count', 'triggered_at', 'action_taken')
    list_filter = ('triggered_at', 'user_request__building')
    search_fields = ('user_request__title', 'action_taken')
    ordering = ('-triggered_at',)
    readonly_fields = ('triggered_at',)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(user_request__building__manager=request.user)

    def export_as_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="urgent_request_logs.csv"'

        writer = csv.writer(response)
        writer.writerow(['Αίτημα', 'Ημερομηνία Ενεργοποίησης', 'Υποστηρικτές'])

        for log in queryset:
            writer.writerow([
                log.user_request.title,
                log.triggered_at.strftime('%Y-%m-%d %H:%M'),
                log.supporter_count
            ])

        return response

    export_as_csv.short_description = "📥 Εξαγωγή επιλεγμένων ως CSV"

