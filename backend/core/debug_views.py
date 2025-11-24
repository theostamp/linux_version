"""
Debug views for media files
"""
import os
from django.http import JsonResponse
from django.conf import settings
from django.views.decorators.http import require_http_methods


@require_http_methods(["GET"])
def debug_media_info(request):
    """
    Debug endpoint to check media configuration and files
    Only accessible in production for debugging
    """
    media_root = settings.MEDIA_ROOT

    # Check if media root exists
    media_root_exists = os.path.exists(media_root)

    # List files in media root
    files = []
    if media_root_exists:
        try:
            for root, dirs, filenames in os.walk(media_root):
                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(file_path, media_root)
                    file_size = os.path.getsize(file_path)
                    files.append({
                        'path': rel_path,
                        'size': file_size,
                        'exists': True
                    })
        except Exception as e:
            files = [{'error': str(e)}]

    # Volume mount info
    volume_mount_path = os.getenv('RAILWAY_VOLUME_MOUNT_PATH', '/data')
    volume_exists = os.path.exists(volume_mount_path)

    return JsonResponse({
        'media_root': media_root,
        'media_root_exists': media_root_exists,
        'media_url': settings.MEDIA_URL,
        'volume_mount_path': volume_mount_path,
        'volume_exists': volume_exists,
        'files_count': len(files),
        'files': files[:50],  # Limit to 50 files for response size
        'environment': {
            'DEBUG': settings.DEBUG,
            'IS_PRODUCTION': getattr(settings, 'IS_PRODUCTION', False),
        }
    })
