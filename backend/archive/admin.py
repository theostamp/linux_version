from django.contrib import admin
from .models import ArchiveDocument


@admin.register(ArchiveDocument)
class ArchiveDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "category",
        "document_type",
        "document_number",
        "supplier_vat",
        "building",
        "created_at",
    )
    list_filter = ("category", "document_type", "building", "created_at")
    search_fields = ("title", "document_number", "supplier_vat", "supplier_name", "original_filename")
