from rest_framework import serializers
from .models import Team, TeamRole, TeamMember, TeamTask, TeamMeeting, TeamPerformance


class TeamRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamRole
        fields = '__all__'


class TeamMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)
    
    class Meta:
        model = TeamMember
        fields = '__all__'


class TeamSerializer(serializers.ModelSerializer):
    leader_name = serializers.CharField(source='leader.get_full_name', read_only=True)
    leader_email = serializers.CharField(source='leader.email', read_only=True)
    member_count = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()
    members = TeamMemberSerializer(many=True, read_only=True)
    
    class Meta:
        model = Team
        fields = '__all__'


class TeamTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.user.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = TeamTask
        fields = '__all__'


class TeamMeetingSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    attendees_names = serializers.SerializerMethodField()
    
    class Meta:
        model = TeamMeeting
        fields = '__all__'
    
    def get_attendees_names(self, obj):
        return [f"{attendee.get_full_name()} ({attendee.email})" for attendee in obj.attendees.all()]


class TeamPerformanceSerializer(serializers.ModelSerializer):
    completion_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = TeamPerformance
        fields = '__all__' 