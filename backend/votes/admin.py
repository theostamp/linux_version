from django.contrib import admin  # type: ignore  # type: ignore  # type: ignore
from .models import Vote, VoteSubmission


class VoteSubmissionInline(admin.TabularInline):
    model = VoteSubmission
    extra = 0
    readonly_fields = ['user', 'choice', 'submitted_at']
    can_delete = False


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'building', 'start_date', 'end_date', 'is_published', 'creator']
    list_filter = ['building', 'start_date', 'end_date']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'creator']
    inlines = [VoteSubmissionInline]

    @admin.display(boolean=True, description="Ενεργή τώρα;")
    def is_published(self, obj):
        from datetime import date
        today = date.today()
        return obj.start_date <= today and (not obj.end_date or today <= obj.end_date)
