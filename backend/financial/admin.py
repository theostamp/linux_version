from django.contrib import admin
from .models import Payment, FinancialReceipt, BuildingAccount, FinancialTransaction

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['apartment', 'payment_type', 'amount', 'due_date', 'status', 'amount_paid']
    list_filter = ['payment_type', 'status', 'due_date']
    search_fields = ['apartment__number', 'apartment__building__name', 'reference_number']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'due_date'
    list_editable = ['status', 'amount_paid']
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('apartment', 'payment_type', 'amount', 'due_date')
        }),
        ('Κατάσταση Πληρωμής', {
            'fields': ('status', 'payment_date', 'amount_paid')
        }),
        ('Πληροφορίες Πληρωμής', {
            'fields': ('payment_method', 'reference_number')
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(FinancialReceipt)
class FinancialReceiptAdmin(admin.ModelAdmin):
    list_display = ['payment', 'receipt_type', 'amount', 'receipt_date', 'created_by']
    list_filter = ['receipt_type', 'receipt_date']
    search_fields = ['payment__apartment__number', 'reference_number']
    readonly_fields = ['created_at']
    date_hierarchy = 'receipt_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('payment', 'receipt_type', 'amount', 'receipt_date')
        }),
        ('Αρχείο & Αναφορά', {
            'fields': ('receipt_file', 'reference_number')
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(BuildingAccount)
class BuildingAccountAdmin(admin.ModelAdmin):
    list_display = ['building', 'account_type', 'account_number', 'bank_name', 'current_balance', 'is_active']
    list_filter = ['account_type', 'is_active', 'bank_name']
    search_fields = ['building__name', 'account_number', 'bank_name']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['is_active']
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('building', 'account_type', 'account_number', 'bank_name')
        }),
        ('Οικονομικά', {
            'fields': ('current_balance', 'description')
        }),
        ('Κατάσταση', {
            'fields': ('is_active',)
        }),
        ('Χρονικές Στιγμές', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(FinancialTransaction)
class FinancialTransactionAdmin(admin.ModelAdmin):
    list_display = ['building', 'account', 'transaction_type', 'amount', 'transaction_date', 'category']
    list_filter = ['transaction_type', 'transaction_date', 'category', 'building']
    search_fields = ['building__name', 'description', 'reference_number']
    readonly_fields = ['created_at']
    date_hierarchy = 'transaction_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('building', 'account', 'transaction_type', 'amount', 'transaction_date')
        }),
        ('Περιγραφή', {
            'fields': ('description', 'category', 'reference_number')
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )
