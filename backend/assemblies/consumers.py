import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Assembly, AgendaItem
from django.utils import timezone
from django_tenants.utils import schema_context

class AssemblyConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer για real-time ενημερώσεις συνελεύσεων.
    """
    
    async def connect(self):
        self.assembly_id = self.scope['url_route']['kwargs']['assembly_id']
        self.tenant_schema = self.scope.get("tenant_schema")
        # Αν δεν έχουμε tenant schema, δεν μπορούμε να κάνουμε queries σε tenant models με ασφάλεια
        if not self.tenant_schema or self.tenant_schema == "public":
            await self.close()
            return

        # Tenant-aware group name (αποφυγή cross-tenant collisions/leaks)
        self.group_name = f'assembly_{self.tenant_schema}_{self.assembly_id}'
        
        # Έλεγχος αυθεντικοποίησης
        if self.scope["user"].is_anonymous:
            await self.close()
            return
            
        # Έλεγχος αν ο χρήστης έχει πρόσβαση στην συνέλευση
        if not await self.can_access_assembly():
            await self.close()
            return
            
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        # Οι ενοίκοι δεν στέλνουν δεδομένα (προς το παρόν)
        pass

    async def vote_update(self, event):
        """
        Αποστολή ενημέρωσης ψήφων στο WebSocket.
        """
        await self.send(text_data=json.dumps({
            'type': 'vote_update',
            'agenda_item_id': event['agenda_item_id'],
            'results': event['results'],
            'timestamp': timezone.now().isoformat()
        }))

    async def item_update(self, event):
        """
        Ενημέρωση για την τρέχουσα ενότητα της συνέλευσης.
        """
        await self.send(text_data=json.dumps({
            'type': 'item_update',
            'item_id': event['item_id'],
            'item_type': event['item_type'],
            'timestamp': timezone.now().isoformat()
        }))

    @database_sync_to_async
    def can_access_assembly(self):
        try:
            with schema_context(self.tenant_schema):
                assembly = Assembly.objects.get(id=self.assembly_id)
                user = self.scope["user"]
                
                # Έλεγχος αν ο χρήστης είναι κάτοικος ή διαχειριστής στο κτίριο της συνέλευσης
                # Χρησιμοποιούμε την can_access_building αν υπάρχει, αλλιώς μια απλή υλοποίηση
                if hasattr(user, 'can_access_building'):
                    return user.can_access_building(assembly.building)
                
                # Fallback
                from buildings.models import BuildingMembership
                return BuildingMembership.objects.filter(building=assembly.building, resident=user).exists() or \
                       user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False) or \
                       assembly.building.internal_manager == user
        except Assembly.DoesNotExist:
            return False

