# backend/votes/admin.py
from django.contrib import admin
from .models import Vote, VoteSubmission

@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('title', 'building', 'published', 'start_date', 'end_date')
    list_filter = ('published', 'start_date', 'end_date')
    search_fields = ('title', 'description')
    date_hierarchy = 'start_date'
    ordering = ('-start_date',)

@admin.register(VoteSubmission)
class VoteSubmissionAdmin(admin.ModelAdmin):
    list_display = ('vote', 'user', 'choice', 'submitted_at')
    list_filter = ('choice', 'submitted_at')
    search_fields = ('vote__title', 'user__username', 'choice')
    ordering = ('-submitted_at',)
