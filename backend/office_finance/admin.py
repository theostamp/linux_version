"""
Office Finance Admin Configuration
"""

from django.contrib import admin
from .models import (
    OfficeExpenseCategory,
    OfficeIncomeCategory,
    OfficeExpense,
    OfficeIncome,
    OfficeFinancialSummary
)


@admin.register(OfficeExpenseCategory)
class OfficeExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'category_type', 'color', 'is_active', 'is_system']
    list_filter = ['category_type', 'is_active', 'is_system']
    search_fields = ['name']
    ordering = ['category_type', 'name']


@admin.register(OfficeIncomeCategory)
class OfficeIncomeCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'category_type', 'color', 'is_active', 'is_system']
    list_filter = ['category_type', 'is_active', 'is_system']
    search_fields = ['name']
    ordering = ['category_type', 'name']


@admin.register(OfficeExpense)
class OfficeExpenseAdmin(admin.ModelAdmin):
    list_display = ['title', 'amount', 'date', 'category', 'is_paid', 'recurrence']
    list_filter = ['category', 'is_paid', 'recurrence', 'payment_method', 'date']
    search_fields = ['title', 'description', 'supplier_name']
    date_hierarchy = 'date'
    ordering = ['-date', '-created_at']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    
    fieldsets = (
        ('Βασικά Στοιχεία', {
            'fields': ('title', 'description', 'amount', 'date', 'category')
        }),
        ('Πληρωμή', {
            'fields': ('payment_method', 'is_paid', 'paid_date', 'recurrence')
        }),
        ('Προμηθευτής', {
            'fields': ('supplier_name', 'supplier_vat'),
            'classes': ('collapse',)
        }),
        ('Παραστατικό', {
            'fields': ('document', 'document_number'),
            'classes': ('collapse',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(OfficeIncome)
class OfficeIncomeAdmin(admin.ModelAdmin):
    list_display = ['title', 'amount', 'date', 'category', 'building', 'status', 'recurrence']
    list_filter = ['category', 'status', 'recurrence', 'building', 'date']
    search_fields = ['title', 'description', 'client_name']
    date_hierarchy = 'date'
    ordering = ['-date', '-created_at']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    autocomplete_fields = ['building']
    
    fieldsets = (
        ('Βασικά Στοιχεία', {
            'fields': ('title', 'description', 'amount', 'date', 'category')
        }),
        ('Πηγή Εσόδου', {
            'fields': ('building', 'client_name', 'client_vat')
        }),
        ('Κατάσταση', {
            'fields': ('status', 'payment_method', 'received_date', 'recurrence')
        }),
        ('Παραστατικό', {
            'fields': ('document', 'invoice_number'),
            'classes': ('collapse',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(OfficeFinancialSummary)
class OfficeFinancialSummaryAdmin(admin.ModelAdmin):
    list_display = ['period_display', 'total_income', 'total_expenses', 'net_result', 'is_closed']
    list_filter = ['year', 'is_closed']
    ordering = ['-year', '-month']
    readonly_fields = [
        'total_income', 'total_expenses', 'net_result',
        'income_by_category', 'expenses_by_category', 'income_by_building',
        'created_at', 'updated_at'
    ]
    
    actions = ['calculate_totals']
    
    @admin.action(description='Υπολογισμός συνόλων')
    def calculate_totals(self, request, queryset):
        for summary in queryset:
            summary.calculate_totals()
        self.message_user(request, f'Υπολογίστηκαν τα σύνολα για {queryset.count()} εγγραφές')

