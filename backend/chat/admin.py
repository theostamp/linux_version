from django.contrib import admin
from .models import (
    ChatRoom, ChatMessage, ChatParticipant, ChatNotification,
    DirectConversation, DirectMessage, OnlineStatus
)


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'building', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'building__name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'chat_room', 'message_type', 'content', 'is_edited', 'created_at']
    list_filter = ['message_type', 'is_edited', 'created_at']
    search_fields = ['content', 'sender__email', 'chat_room__name']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['sender', 'chat_room']


@admin.register(ChatParticipant)
class ChatParticipantAdmin(admin.ModelAdmin):
    list_display = ['user', 'chat_room', 'is_online', 'last_seen', 'joined_at']
    list_filter = ['is_online', 'joined_at']
    search_fields = ['user__email', 'chat_room__name']
    readonly_fields = ['joined_at']
    raw_id_fields = ['user', 'chat_room']


@admin.register(ChatNotification)
class ChatNotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'chat_room', 'unread_count', 'last_read_at', 'updated_at']
    list_filter = ['unread_count', 'last_read_at']
    search_fields = ['user__email', 'chat_room__name']
    readonly_fields = ['last_read_at', 'updated_at']
    raw_id_fields = ['user', 'chat_room']


# =============================================================================
# DIRECT MESSAGING Admin
# =============================================================================

@admin.register(DirectConversation)
class DirectConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'participant_one', 'participant_two', 'building', 'created_at', 'updated_at']
    list_filter = ['created_at', 'building']
    search_fields = ['participant_one__email', 'participant_two__email', 'building__name']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['participant_one', 'participant_two', 'building']


@admin.register(DirectMessage)
class DirectMessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'conversation', 'content_preview', 'is_read', 'created_at']
    list_filter = ['is_read', 'message_type', 'created_at']
    search_fields = ['content', 'sender__email']
    readonly_fields = ['created_at', 'updated_at', 'read_at']
    raw_id_fields = ['sender', 'conversation']
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Περιεχόμενο'


@admin.register(OnlineStatus)
class OnlineStatusAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_online', 'status_message', 'last_activity']
    list_filter = ['is_online', 'last_activity']
    search_fields = ['user__email', 'status_message']
    readonly_fields = ['last_activity']
    raw_id_fields = ['user'] 