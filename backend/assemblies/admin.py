from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Assembly, AgendaItem, AgendaItemAttachment,
    AssemblyAttendee, AssemblyVote, AssemblyMinutesTemplate
)


class AgendaItemInline(admin.TabularInline):
    model = AgendaItem
    extra = 0
    fields = ['order', 'title', 'item_type', 'estimated_duration', 'status']
    ordering = ['order']


class AssemblyAttendeeInline(admin.TabularInline):
    model = AssemblyAttendee
    extra = 0
    fields = ['apartment', 'mills', 'rsvp_status', 'is_present', 'attendance_type']
    readonly_fields = ['mills']


@admin.register(Assembly)
class AssemblyAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'building', 'scheduled_date', 'scheduled_time',
        'status', 'quorum_display', 'agenda_count'
    ]
    list_filter = ['status', 'assembly_type', 'building', 'scheduled_date']
    search_fields = ['title', 'description', 'building__name']
    date_hierarchy = 'scheduled_date'
    
    readonly_fields = [
        'id', 'achieved_quorum_mills', 'quorum_achieved', 'quorum_achieved_at',
        'actual_start_time', 'actual_end_time', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Βασικά Στοιχεία', {
            'fields': ('title', 'building', 'assembly_type', 'description')
        }),
        ('Χρονοδιάγραμμα', {
            'fields': ('scheduled_date', 'scheduled_time', 'estimated_duration')
        }),
        ('Τοποθεσία', {
            'fields': ('is_physical', 'is_online', 'location', 'meeting_link', 'meeting_id', 'meeting_password'),
            'classes': ('collapse',)
        }),
        ('Απαρτία', {
            'fields': ('total_building_mills', 'required_quorum_percentage', 'achieved_quorum_mills', 'quorum_achieved', 'quorum_achieved_at')
        }),
        ('Pre-voting', {
            'fields': ('pre_voting_enabled', 'pre_voting_start_date', 'pre_voting_end_date'),
            'classes': ('collapse',)
        }),
        ('Κατάσταση', {
            'fields': ('status', 'actual_start_time', 'actual_end_time')
        }),
        ('Πρακτικά', {
            'fields': ('minutes_text', 'minutes_approved', 'minutes_approved_at', 'minutes_approved_by'),
            'classes': ('collapse',)
        }),
        ('Πρόσκληση', {
            'fields': ('invitation_sent', 'invitation_sent_at', 'linked_announcement'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('id', 'continued_from', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [AgendaItemInline, AssemblyAttendeeInline]
    
    def quorum_display(self, obj):
        percentage = obj.quorum_percentage
        color = 'green' if obj.quorum_achieved else ('orange' if percentage >= 40 else 'red')
        return format_html(
            '<span style="color: {};">{:.1f}% ({}/{})</span>',
            color,
            percentage,
            obj.achieved_quorum_mills,
            obj.required_quorum_mills
        )
    quorum_display.short_description = 'Απαρτία'
    
    def agenda_count(self, obj):
        return obj.agenda_items.count()
    agenda_count.short_description = 'Θέματα'


class AgendaItemAttachmentInline(admin.TabularInline):
    model = AgendaItemAttachment
    extra = 0
    fields = ['filename', 'file', 'description', 'uploaded_at']
    readonly_fields = ['uploaded_at']


@admin.register(AgendaItem)
class AgendaItemAdmin(admin.ModelAdmin):
    list_display = [
        'order', 'title', 'assembly', 'item_type',
        'estimated_duration', 'status', 'has_vote'
    ]
    list_filter = ['item_type', 'status', 'assembly__building', 'assembly__scheduled_date']
    search_fields = ['title', 'description', 'assembly__title']
    ordering = ['assembly', 'order']
    
    readonly_fields = ['id', 'started_at', 'ended_at', 'actual_duration', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Βασικά', {
            'fields': ('assembly', 'order', 'title', 'description', 'item_type')
        }),
        ('Χρόνος', {
            'fields': ('estimated_duration', 'actual_duration', 'started_at', 'ended_at')
        }),
        ('Εισηγητής', {
            'fields': ('presenter', 'presenter_name')
        }),
        ('Ψηφοφορία', {
            'fields': ('voting_type', 'allows_pre_voting', 'linked_vote'),
            'classes': ('collapse',)
        }),
        ('Απόφαση', {
            'fields': ('status', 'decision', 'decision_type', 'discussion_notes')
        }),
        ('Συνδέσεις', {
            'fields': ('linked_project', 'has_attachments'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [AgendaItemAttachmentInline]
    
    def has_vote(self, obj):
        if obj.linked_vote:
            return format_html('<span style="color: green;">✓</span>')
        return format_html('<span style="color: gray;">-</span>')
    has_vote.short_description = 'Ψηφοφορία'


@admin.register(AssemblyAttendee)
class AssemblyAttendeeAdmin(admin.ModelAdmin):
    list_display = [
        'apartment', 'assembly', 'mills', 'rsvp_status',
        'is_present', 'attendance_type', 'has_pre_voted'
    ]
    list_filter = [
        'rsvp_status', 'is_present', 'attendance_type',
        'assembly__building', 'assembly__scheduled_date'
    ]
    search_fields = [
        'apartment__number', 'attendee_name',
        'user__email', 'assembly__title'
    ]
    
    readonly_fields = [
        'id', 'checked_in_at', 'checked_out_at', 'rsvp_at',
        'pre_voted_at', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Βασικά', {
            'fields': ('assembly', 'apartment', 'user', 'mills')
        }),
        ('RSVP', {
            'fields': ('rsvp_status', 'rsvp_at', 'rsvp_notes')
        }),
        ('Παρουσία', {
            'fields': ('is_present', 'attendance_type', 'checked_in_at', 'checked_out_at')
        }),
        ('Εξουσιοδότηση', {
            'fields': ('is_proxy', 'proxy_from_apartment', 'proxy_document'),
            'classes': ('collapse',)
        }),
        ('Pre-voting', {
            'fields': ('has_pre_voted', 'pre_voted_at'),
            'classes': ('collapse',)
        }),
        ('Επιπλέον Στοιχεία', {
            'fields': ('attendee_name', 'attendee_phone'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(AssemblyVote)
class AssemblyVoteAdmin(admin.ModelAdmin):
    list_display = [
        'attendee', 'agenda_item', 'vote', 'mills', 'vote_source', 'voted_at'
    ]
    list_filter = [
        'vote', 'vote_source',
        'agenda_item__assembly__building',
        'agenda_item__assembly__scheduled_date'
    ]
    search_fields = [
        'attendee__apartment__apartment_number',
        'agenda_item__title',
        'agenda_item__assembly__title'
    ]
    
    readonly_fields = ['id', 'voted_at']


@admin.register(AssemblyMinutesTemplate)
class AssemblyMinutesTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'building', 'is_default', 'updated_at']
    list_filter = ['is_default', 'building']
    search_fields = ['name', 'description']
    
    fieldsets = (
        ('Βασικά', {
            'fields': ('name', 'description', 'building', 'is_default')
        }),
        ('Templates', {
            'fields': ('header_template', 'agenda_item_template', 'attendees_template', 'footer_template')
        }),
    )
