import os
import django
import sys
from django.db.models import Count

# Setup Django environment
sys.path.append('/home/theo/project/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from users.models import UserInvitation

def cleanup_duplicates():
    print("Checking for duplicate invitations...")
    
    # Group by email and status
    duplicates = (
        UserInvitation.objects.values('email', 'status')
        .annotate(count=Count('id'))
        .filter(count__gt=1)
    )
    
    total_deleted = 0
    
    for entry in duplicates:
        email = entry['email']
        status = entry['status']
        count = entry['count']
        
        print(f"Found {count} invitations for {email} with status '{status}'")
        
        # Get all invitations for this email/status, ordered by creation date (newest first)
        invitations = UserInvitation.objects.filter(
            email=email, 
            status=status
        ).order_by('-created_at')
        
        # Keep the first one (newest), delete the rest
        to_keep = invitations.first()
        to_delete = invitations.exclude(id=to_keep.id)
        
        deleted_count = to_delete.count()
        to_delete.delete()
        
        print(f"  -> Kept invitation {to_keep.id} (created {to_keep.created_at})")
        print(f"  -> Deleted {deleted_count} duplicates")
        
        total_deleted += deleted_count

    print(f"\nTotal duplicate invitations deleted: {total_deleted}")

if __name__ == '__main__':
    cleanup_duplicates()

