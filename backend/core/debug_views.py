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
    try:
        media_root = str(settings.MEDIA_ROOT)

        # Check if media root exists
        media_root_exists = os.path.exists(media_root)

        # List files in media root
        files = []
        if media_root_exists:
            try:
                for root, dirs, filenames in os.walk(media_root):
                    for filename in filenames:
                        try:
                            file_path = os.path.join(root, filename)
                            rel_path = os.path.relpath(file_path, media_root)
                            file_size = os.path.getsize(file_path)
                            files.append({
                                'path': rel_path,
                                'size': file_size,
                                'exists': True
                            })
                        except Exception as e:
                            files.append({'error': f'Error reading {filename}: {str(e)}'})
            except Exception as e:
                files = [{'error': f'Error walking directory: {str(e)}'}]

        # Volume mount info
        volume_mount_path = os.getenv('RAILWAY_VOLUME_MOUNT_PATH', '/data')
        volume_exists = os.path.exists(volume_mount_path)

        # Check if specific logo exists
        logo_dir = os.path.join(media_root, 'office_logos')
        logo_dir_exists = os.path.exists(logo_dir)
        logo_files = []
        if logo_dir_exists:
            try:
                logo_files = os.listdir(logo_dir)
            except Exception as e:
                logo_files = [f'Error: {str(e)}']

        return JsonResponse({
            'media_root': media_root,
            'media_root_exists': media_root_exists,
            'media_url': settings.MEDIA_URL,
            'volume_mount_path': volume_mount_path,
            'volume_exists': volume_exists,
            'logo_dir': logo_dir,
            'logo_dir_exists': logo_dir_exists,
            'logo_files': logo_files,
            'files_count': len(files),
            'files': files[:50],  # Limit to 50 files for response size
            'environment': {
                'DEBUG': settings.DEBUG,
                'IS_PRODUCTION': getattr(settings, 'IS_PRODUCTION', False),
            }
        })
    except Exception as e:
        return JsonResponse({
            'error': 'Failed to get media info',
            'details': str(e),
            'traceback': __import__('traceback').format_exc()
        }, status=500)
