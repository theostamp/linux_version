from django.contrib import admin
from .models import Team, TeamRole, TeamMember, TeamTask, TeamMeeting, TeamPerformance


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'team_type', 'building', 'leader', 'status', 'member_count', 'is_full', 'created_at']
    list_filter = ['team_type', 'status', 'building', 'created_at']
    search_fields = ['name', 'description', 'building__name', 'leader__email']
    readonly_fields = ['member_count', 'is_full', 'created_at', 'updated_at']
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('name', 'description', 'team_type', 'building', 'leader')
        }),
        ('Κατάσταση', {
            'fields': ('status', 'max_members')
        }),
        ('Στατιστικά', {
            'fields': ('member_count', 'is_full'),
            'classes': ('collapse',)
        }),
        ('Χρονικές Στοιχείες', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TeamRole)
class TeamRoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'role_type', 'is_default', 'created_at']
    list_filter = ['role_type', 'is_default', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ['user', 'team', 'role', 'status', 'joined_at', 'is_active']
    list_filter = ['status', 'is_active', 'team', 'role', 'joined_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'team__name']
    readonly_fields = ['joined_at', 'created_at', 'updated_at']
    fieldsets = (
        ('Μέλος', {
            'fields': ('user', 'team', 'role')
        }),
        ('Κατάσταση', {
            'fields': ('status', 'is_active', 'left_at')
        }),
        ('Χρονικές Στοιχείες', {
            'fields': ('joined_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )


@admin.register(TeamTask)
class TeamTaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'team', 'assigned_to', 'priority', 'status', 'due_date', 'created_at']
    list_filter = ['priority', 'status', 'team', 'created_at']
    search_fields = ['title', 'description', 'team__name']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Εργασία', {
            'fields': ('title', 'description', 'team', 'assigned_to')
        }),
        ('Κατάσταση', {
            'fields': ('priority', 'status', 'due_date', 'completed_at')
        }),
        ('Χρόνος', {
            'fields': ('estimated_hours', 'actual_hours'),
            'classes': ('collapse',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TeamMeeting)
class TeamMeetingAdmin(admin.ModelAdmin):
    list_display = ['title', 'team', 'meeting_type', 'scheduled_at', 'duration', 'is_online', 'created_at']
    list_filter = ['meeting_type', 'is_online', 'team', 'scheduled_at']
    search_fields = ['title', 'description', 'team__name']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'scheduled_at'
    fieldsets = (
        ('Συνάντηση', {
            'fields': ('title', 'description', 'team', 'meeting_type')
        }),
        ('Προγραμματισμός', {
            'fields': ('scheduled_at', 'duration', 'location')
        }),
        ('Διαδικτυακή', {
            'fields': ('is_online', 'meeting_link'),
            'classes': ('collapse',)
        }),
        ('Περιεχόμενο', {
            'fields': ('agenda', 'minutes'),
            'classes': ('collapse',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TeamPerformance)
class TeamPerformanceAdmin(admin.ModelAdmin):
    list_display = ['team', 'period_start', 'period_end', 'completion_rate', 'satisfaction_rating', 'created_at']
    list_filter = ['team', 'period_start', 'period_end', 'created_at']
    search_fields = ['team__name', 'notes']
    readonly_fields = ['completion_rate', 'created_at']
    date_hierarchy = 'period_end'
    fieldsets = (
        ('Ομάδα & Περίοδος', {
            'fields': ('team', 'period_start', 'period_end')
        }),
        ('Αποτελέσματα', {
            'fields': ('tasks_completed', 'tasks_total', 'completion_rate')
        }),
        ('Αξιολογήσεις', {
            'fields': ('average_completion_time', 'satisfaction_rating'),
            'classes': ('collapse',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes', 'created_at'),
            'classes': ('collapse',)
        }),
    ) 