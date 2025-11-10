import os
import base64
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils import timezone
from django.conf import settings
import json
import uuid


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
