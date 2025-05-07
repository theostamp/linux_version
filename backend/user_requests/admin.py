# backend/user_requests/admin.py

import csv
from django.contrib import admin
from django.db.models import Count
from django.http import HttpResponse

from .models import UserRequest, UrgentRequestLog


@admin.register(UserRequest)
class UserRequestAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'created_by', 'created_at')
    list_filter = ('status', 'created_at', 'created_by')
    search_fields = ('title', 'description', 'created_by__username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'status', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Annotate supporter_count ώστε να μπορεί να γίνει ordering
        qs = qs.annotate(supporter_count=Count('supporters'))
        return qs


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
    list_display = ('user_request', 'triggered_at', 'supporter_count')
    list_filter = (YearMonthFilter,)
    search_fields = ('user_request__title',)
    actions = ['export_as_csv']

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

