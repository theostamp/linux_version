from django.contrib import admin

from .models import TodoCategory, TodoItem, TodoTemplate, TodoNotification


@admin.register(TodoCategory)
class TodoCategoryAdmin(admin.ModelAdmin):
  list_display = ("name", "building", "color", "is_active", "updated_at")
  list_filter = ("building", "is_active", "color")
  search_fields = ("name", "description")


@admin.register(TodoItem)
class TodoItemAdmin(admin.ModelAdmin):
  list_display = (
    "title",
    "building",
    "category",
    "priority",
    "status",
    "due_date",
    "assigned_to",
    "created_by",
    "updated_at",
  )
  list_filter = ("building", "category", "priority", "status", "assigned_to")
  search_fields = ("title", "description", "tags")
  autocomplete_fields = ("category", "building", "apartment", "assigned_to", "created_by")


@admin.register(TodoTemplate)
class TodoTemplateAdmin(admin.ModelAdmin):
  list_display = ("title", "building", "category", "frequency", "auto_create", "last_created")
  list_filter = ("building", "category", "frequency", "auto_create", "is_active")
  search_fields = ("title", "description")
  autocomplete_fields = ("category", "building")


@admin.register(TodoNotification)
class TodoNotificationAdmin(admin.ModelAdmin):
  list_display = ("todo", "user", "notification_type", "is_read", "created_at")
  list_filter = ("notification_type", "is_read", "created_at")
  search_fields = ("message",)

