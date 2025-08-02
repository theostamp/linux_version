from django.contrib import admin
from .models import ChatRoom, ChatMessage, ChatParticipant, ChatNotification


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