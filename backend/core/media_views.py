"""
Media file serving views for production
"""
import os
import mimetypes
from django.http import FileResponse, Http404, HttpResponse
from django.conf import settings
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_http_methods


@require_http_methods(["GET", "HEAD"])
@cache_control(max_age=3600, public=True)
def serve_media(request, path):
    """
    Serve media files from MEDIA_ROOT in production
    This replaces Django's static() helper which doesn't work well with Railway volumes
    """
    # Construct the full file path
    file_path = os.path.join(settings.MEDIA_ROOT, path)

    # Security check: ensure the path is within MEDIA_ROOT
    file_path = os.path.abspath(file_path)
    media_root = os.path.abspath(settings.MEDIA_ROOT)

    if not file_path.startswith(media_root):
        raise Http404("Invalid media path")

    # Check if file exists
    if not os.path.exists(file_path):
        raise Http404(f"Media file not found: {path}")

    if not os.path.isfile(file_path):
        raise Http404(f"Not a file: {path}")

    # Guess the content type
    content_type, _ = mimetypes.guess_type(file_path)
    if content_type is None:
        content_type = 'application/octet-stream'

    # Return the file
    try:
        response = FileResponse(open(file_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'
        return response
    except IOError:
        raise Http404("Error reading file")
