from django.contrib import admin  
      # type: ignore
from .models import Vote, VoteSubmission


class VoteSubmissionInline(admin.TabularInline):
    model = VoteSubmission
    extra = 0
    readonly_fields = ['user', 'choice', 'submitted_at']
    can_delete = False


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('title', 'building', 'creator', 'is_active', 'is_urgent', 'start_date', 'end_date', 'total_votes', 'participation_percentage', 'created_at')
    list_filter = ('building', 'is_active', 'is_urgent', 'start_date', 'end_date', 'created_at')
    search_fields = ('title', 'description', 'creator__username', 'building__name')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'total_votes', 'participation_percentage', 'is_valid_result')
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('title', 'description', 'building', 'creator')
        }),
        ('Κατάσταση', {
            'fields': ('is_active', 'is_urgent', 'min_participation')
        }),
        ('Ημερομηνίες', {
            'fields': ('start_date', 'end_date', 'created_at', 'updated_at')
        }),
        ('Στατιστικά', {
            'fields': ('total_votes', 'participation_percentage', 'is_valid_result'),
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
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        if not change:  # Αν είναι νέα ψηφοφορία
            obj.creator = request.user
        super().save_model(request, obj, form, change)

@admin.register(VoteSubmission)
class VoteSubmissionAdmin(admin.ModelAdmin):
    list_display = ('vote', 'user', 'choice', 'submitted_at')
    list_filter = ('choice', 'submitted_at', 'vote__building')
    search_fields = ('vote__title', 'user__username')
    ordering = ('-submitted_at',)
    readonly_fields = ('submitted_at', 'updated_at')

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(vote__building__manager=request.user)
