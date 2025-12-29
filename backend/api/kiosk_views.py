import os
import base64
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import json
import uuid
from typing import Optional
from datetime import datetime


@csrf_exempt
@require_POST
def upload_common_expense_bill(request):
    """
    Upload common expense bill JPG image for kiosk display.
    Accepts base64 encoded image data and saves it to kiosk directory.
    """
    try:
        # Parse JSON data
        data = json.loads(request.body)

        # Extract required fields
        image_data = data.get('image_data')  # base64 encoded image
        building_name = data.get('building_name', 'unknown')
        period = data.get('period', 'unknown')
        timestamp = data.get('timestamp', timezone.now().isoformat())

        if not image_data:
            return JsonResponse({
                'success': False,
                'error': 'No image data provided'
            }, status=400)

        # Remove data URL prefix if present
        if image_data.startswith('data:image/'):
            image_data = image_data.split(',')[1]

        # Decode base64 image
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Invalid image data: {str(e)}'
            }, status=400)

        # Create kiosk directory if it doesn't exist
        kiosk_dir = os.path.join(settings.BASE_DIR, 'kiosk_images')
        os.makedirs(kiosk_dir, exist_ok=True)

        # Generate filename with timestamp and UUID for uniqueness
        safe_building_name = building_name.replace(' ', '_').replace('/', '_')
        safe_period = period.replace(' ', '_').replace('/', '_')
        unique_id = str(uuid.uuid4())[:8]

        filename = f"common_expense_bill_{safe_building_name}_{safe_period}_{unique_id}.jpg"
        filepath = os.path.join(kiosk_dir, filename)

        # Save image file
        with open(filepath, 'wb') as f:
            f.write(image_bytes)

        # Create metadata file
        metadata = {
            'filename': filename,
            'building_name': building_name,
            'period': period,
            'timestamp': timestamp,
            'uploaded_at': timezone.now().isoformat(),
            'file_size': len(image_bytes)
        }

        metadata_filename = f"{filename}.meta"
        metadata_filepath = os.path.join(kiosk_dir, metadata_filename)

        with open(metadata_filepath, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        print(f"✅ [KIOSK UPLOAD] Saved common expense bill: {filename}")
        print(f"📁 [KIOSK UPLOAD] File size: {len(image_bytes)} bytes")

        return JsonResponse({
            'success': True,
            'message': 'Common expense bill uploaded successfully',
            'filename': filename,
            'filepath': filepath,
            'metadata': metadata
        })

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        print(f"❌ [KIOSK UPLOAD] Error: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Upload failed: {str(e)}'
        }, status=500)


@csrf_exempt
@require_POST
def get_latest_common_expense_bill(request):
    """
    Get the latest common expense bill image for kiosk display.
    Returns the most recent uploaded bill image and metadata.
    """
    try:
        kiosk_dir = os.path.join(settings.BASE_DIR, 'kiosk_images')

        if not os.path.exists(kiosk_dir):
            return JsonResponse({
                'success': False,
                'error': 'No kiosk images directory found'
            }, status=404)

        # Find all common expense bill files
        bill_files = []
        for filename in os.listdir(kiosk_dir):
            if filename.startswith('common_expense_bill_') and filename.endswith('.jpg'):
                filepath = os.path.join(kiosk_dir, filename)
                metadata_file = f"{filename}.meta"
                metadata_filepath = os.path.join(kiosk_dir, metadata_file)

                # Get file stats
                stat = os.stat(filepath)

                # Load metadata if available
                metadata = {}
                if os.path.exists(metadata_filepath):
                    try:
                        with open(metadata_filepath, 'r', encoding='utf-8') as f:
                            metadata = json.load(f)
                    except Exception as e:
                        print(f"⚠️ [KIOSK GET] Error loading metadata for {filename}: {e}")

                bill_files.append({
                    'filename': filename,
                    'filepath': filepath,
                    'modified_time': stat.st_mtime,
                    'metadata': metadata
                })

        if not bill_files:
            return JsonResponse({
                'success': False,
                'error': 'No common expense bills found'
            }, status=404)

        # Sort by modification time (newest first)
        bill_files.sort(key=lambda x: x['modified_time'], reverse=True)
        latest_bill = bill_files[0]

        # Read the image file and encode as base64
        try:
            with open(latest_bill['filepath'], 'rb') as f:
                image_bytes = f.read()

            image_base64 = base64.b64encode(image_bytes).decode('utf-8')

            return JsonResponse({
                'success': True,
                'image_data': f"data:image/jpeg;base64,{image_base64}",
                'filename': latest_bill['filename'],
                'metadata': latest_bill['metadata'],
                'file_size': len(image_bytes)
            })

        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Error reading image file: {str(e)}'
            }, status=500)

    except Exception as e:
        print(f"❌ [KIOSK GET] Error: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Failed to get latest bill: {str(e)}'
        }, status=500)


@csrf_exempt
@require_POST
def list_common_expense_bills(request):
    """
    List all available common expense bill images with metadata.
    """
    try:
        kiosk_dir = os.path.join(settings.BASE_DIR, 'kiosk_images')

        if not os.path.exists(kiosk_dir):
            return JsonResponse({
                'success': False,
                'error': 'No kiosk images directory found'
            }, status=404)

        # Find all common expense bill files
        bill_files = []
        for filename in os.listdir(kiosk_dir):
            if filename.startswith('common_expense_bill_') and filename.endswith('.jpg'):
                filepath = os.path.join(kiosk_dir, filename)
                metadata_file = f"{filename}.meta"
                metadata_filepath = os.path.join(kiosk_dir, metadata_file)

                # Get file stats
                stat = os.stat(filepath)

                # Load metadata if available
                metadata = {}
                if os.path.exists(metadata_filepath):
                    try:
                        with open(metadata_filepath, 'r', encoding='utf-8') as f:
                            metadata = json.load(f)
                    except Exception as e:
                        print(f"⚠️ [KIOSK LIST] Error loading metadata for {filename}: {e}")

                bill_files.append({
                    'filename': filename,
                    'filepath': filepath,
                    'modified_time': stat.st_mtime,
                    'size': stat.st_size,
                    'metadata': metadata
                })

        # Sort by modification time (newest first)
        bill_files.sort(key=lambda x: x['modified_time'], reverse=True)

        return JsonResponse({
            'success': True,
            'bills': bill_files,
            'count': len(bill_files)
        })

    except Exception as e:
        print(f"❌ [KIOSK LIST] Error: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Failed to list bills: {str(e)}'
        }, status=500)


def _safe_max_dt(dts) -> Optional[datetime]:
    """Helper function to safely compute max datetime from a list, ignoring None values."""
    dts = [d for d in dts if d]
    return max(dts) if dts else None


def compute_last_changed(building_id: int) -> datetime:
    """
    Υπολογίζει ένα last_changed timestamp από τα βασικά modules.
    Επιστρέφει το max(updated_at, created_at) από announcements, votes, user_requests, obligations.
    Αν δεν υπάρχουν δεδομένα, fallback στο timezone.now().
    """
    candidates = []

    # Announcements
    try:
        from announcements.models import Announcement
        qs = Announcement.objects.filter(building_id=building_id)
        candidates.append(qs.order_by("-updated_at").values_list("updated_at", flat=True).first())
        candidates.append(qs.order_by("-created_at").values_list("created_at", flat=True).first())
    except Exception:
        pass

    # Votes
    try:
        from votes.models import Vote
        qs = Vote.objects.filter(building_id=building_id)
        candidates.append(qs.order_by("-updated_at").values_list("updated_at", flat=True).first())
        candidates.append(qs.order_by("-created_at").values_list("created_at", flat=True).first())
    except Exception:
        pass

    # User Requests
    try:
        from user_requests.models import UserRequest
        qs = UserRequest.objects.filter(building_id=building_id)
        candidates.append(qs.order_by("-updated_at").values_list("updated_at", flat=True).first())
        candidates.append(qs.order_by("-created_at").values_list("created_at", flat=True).first())
    except Exception:
        pass

    # Obligations
    try:
        from obligations.models import Obligation
        qs = Obligation.objects.filter(building_id=building_id)
        candidates.append(qs.order_by("-updated_at").values_list("updated_at", flat=True).first())
        candidates.append(qs.order_by("-created_at").values_list("created_at", flat=True).first())
    except Exception:
        pass

    last_changed = _safe_max_dt(candidates)
    return last_changed or timezone.now()


def build_etag(building_id: int, last_changed: datetime) -> str:
    """
    Builds a weak ETag (W/) for the kiosk state endpoint.
    Format: W/"kiosk:{building_id}:{timestamp}"
    """
    stamp = int(last_changed.timestamp())
    return f'W/"kiosk:{building_id}:{stamp}"'


@api_view(['GET', 'HEAD'])
@permission_classes([IsAuthenticated])
def kiosk_state(request):
    """
    GET/HEAD /api/kiosk/state/?building=<id>

    Επιστρέφει JSON state payload για kiosk με ETag support.
    Αν ο client στείλει If-None-Match που ταιριάζει, επιστρέφει 304 Not Modified.

    Security:
    - Requires authentication (JWT)
    - Checks building access using BuildingService.user_has_access()

    Returns:
    - 200: JSON payload με {building, server_time, last_changed, version}
    - 304: Αν If-None-Match ταιριάζει (no body)
    - 400: Missing/invalid building parameter
    - 403: User doesn't have access to building
    - 404: Building not found
    """
    building_raw = request.query_params.get("building")
    if not building_raw:
        return Response(
            {"detail": "Missing building parameter"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        building_id = int(building_raw)
    except (ValueError, TypeError):
        return Response(
            {"detail": "Invalid building ID"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check building access
    try:
        from buildings.models import Building
        from buildings.services import BuildingService

        building = Building.objects.filter(id=building_id).first()
        if not building:
            return Response(
                {"detail": "Building not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if not BuildingService.user_has_access(request.user, building):
            return Response(
                {"detail": "Forbidden: You don't have access to this building"},
                status=status.HTTP_403_FORBIDDEN
            )
    except Exception as e:
        return Response(
            {"detail": f"Error checking building access: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Compute last_changed and ETag
    last_changed = compute_last_changed(building_id)
    etag = build_etag(building_id, last_changed)

    # Check If-None-Match header
    client_etag = request.headers.get("If-None-Match")
    if client_etag and client_etag.strip() == etag:
        # No changes - return 304
        response = Response(status=status.HTTP_304_NOT_MODIFIED)
        response["ETag"] = etag
        response["Cache-Control"] = "no-cache"
        return response

    # Build payload
    payload = {
        "building": building_id,
        "server_time": timezone.now().isoformat(),
        "last_changed": last_changed.isoformat(),
        "version": etag,  # Handy for client debugging
    }

    response = Response(payload, status=status.HTTP_200_OK)
    response["ETag"] = etag
    response["Cache-Control"] = "no-cache"
    return response
