# backend/users/views.py

from django.contrib.auth import authenticate, get_user_model
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.decorators import api_view, permission_classes, authentication_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.utils import timezone
from .models import CustomUser, UserInvitation, PasswordResetToken
from .auth_cookies import attach_refresh_cookie, clear_refresh_cookie, get_refresh_token_from_request
from .serializers import (
    UserSerializer, OfficeDetailsSerializer, CustomTokenObtainPairSerializer,
    UserRegistrationSerializer, UserInvitationSerializer, UserInvitationCreateSerializer,
    InvitationAcceptanceSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    PasswordChangeSerializer, EmailVerificationSerializer, UserProfileSerializer
)
from .services import EmailService, InvitationService, PasswordResetService, UserVerificationService
from django.db import connection
from django_tenants.utils import schema_context, get_public_schema_name
from core.throttles import (
    LoginThrottle, RegistrationThrottle, PasswordResetThrottle,
    InvitationThrottle, EmailVerificationThrottle, AuthEndpointThrottle,
    MyApartmentLinkEmailUserThrottle, MyApartmentLinkEmailIPThrottle,
)

User = get_user_model()


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
@throttle_classes([MyApartmentLinkEmailUserThrottle, MyApartmentLinkEmailIPThrottle])
def send_myapartment_link_view(request):
    """
    POST /api/users/send-myapartment-link/
    Sends a short "open on laptop" link to the authenticated user's own email.
    Rate limited (50/day per user + additional IP throttle).
    """
    user = request.user

    # Build link on the *public* tenant host (not the internal Railway domain).
    # Our Tenant middleware sets/uses X-Tenant-Host (e.g. theo.newconcierge.app).
    tenant_host = request.headers.get('X-Tenant-Host') or request.get_host()
    proto = request.headers.get('X-Forwarded-Proto') or ('https' if request.is_secure() else 'http')
    link_url = f"{proto}://{tenant_host}/m"

    # Quick config sanity checks (no secrets exposed)
    try:
        import os
        from django.conf import settings
        email_backend = getattr(settings, 'EMAIL_BACKEND', '')
        if 'mailersend' in (email_backend or '').lower():
            if not os.getenv('MAILERSEND_API_KEY'):
                return Response(
                    {
                        "error": "Το σύστημα αποστολής email δεν είναι ρυθμισμένο σωστά (λείπει MailerSend API key).",
                        "error_code": "EMAIL_NOT_CONFIGURED",
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
    except Exception:
        # Don't block sending because of a config check failure
        pass

    try:
        ok = EmailService.send_my_apartment_link_email(user, link_url)
    except Exception:
        ok = False

    if not ok:
        # Keep response stable for frontend parsing; log details in EmailService
        return Response(
            {
                "error": "Αποτυχία αποστολής email. Παρακαλώ δοκιμάστε ξανά αργότερα ή επικοινωνήστε με την υποστήριξη."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {"message": "Στάλθηκε email με τον σύνδεσμο.", "link_url": link_url},
        status=status.HTTP_200_OK,
    )

class SimpleTokenObtainPairView(TokenObtainPairView):
    """
    Standard JWT token view with HttpOnly refresh cookie attachment.
    """
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            refresh_token = None
            if isinstance(getattr(response, "data", None), dict):
                refresh_token = response.data.get("refresh")
            attach_refresh_cookie(response, refresh_token)
        return response


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token view that uses email instead of username
    """
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            refresh_token = None
            if isinstance(getattr(response, "data", None), dict):
                refresh_token = response.data.get("refresh")
            attach_refresh_cookie(response, refresh_token)
        return response


class CustomTokenRefreshView(TokenRefreshView):
    """
    Custom JWT token refresh view that looks up users in the public schema.
    This is necessary because CustomUser is a SHARED_APP and lives in public schema.
    """
    from .serializers import CustomTokenRefreshSerializer
    serializer_class = CustomTokenRefreshSerializer
    throttle_classes = []  # No throttling for refresh

    def post(self, request, *args, **kwargs):
        refresh_token = None
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        refresh_token = data.get("refresh")
        if not refresh_token:
            refresh_token = get_refresh_token_from_request(request)
            if refresh_token:
                data["refresh"] = refresh_token

        if not refresh_token:
            response = Response(status=status.HTTP_204_NO_CONTENT)
            clear_refresh_cookie(response)
            return response

        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except (InvalidToken, TokenError, ValidationError):
            # Treat invalid/expired refresh as no content to avoid noisy 400s.
            response = Response(status=status.HTTP_204_NO_CONTENT)
            clear_refresh_cookie(response)
            return response

        response = Response(serializer.validated_data, status=status.HTTP_200_OK)

        if isinstance(serializer.validated_data, dict) and serializer.validated_data.get("refresh"):
            attach_refresh_cookie(response, serializer.validated_data.get("refresh"))
        elif refresh_token:
            attach_refresh_cookie(response, refresh_token)

        return response


@ensure_csrf_cookie
def get_csrf_token(request):
    """
    GET /api/users/csrf/
    Επιστρέφει CSRF token για frontend.
    """
    return JsonResponse({"message": "CSRF cookie set"})


@api_view(["POST", "OPTIONS"])
@permission_classes([AllowAny])
def login_view(request):
    """
    POST /api/users/login/
    Δέχεται JSON { email, password }, επιστρέφει JWT tokens + user data.
    
    IMPORTANT: Login must always run in public schema to find all users.
    """
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return Response({}, status=status.HTTP_200_OK)
    
    print(">>> LOGIN_VIEW CALLED - Method:", request.method)
    print(">>> LOGIN_VIEW - Request data:", request.data)
    print(">>> LOGIN_VIEW - Request headers:", dict(request.headers))
    
    # Get current schema for debugging
    from django.db import connection
    current_schema = getattr(connection, 'schema_name', 'unknown')
    print(f">>> LOGIN_VIEW - Current schema: {current_schema}")
    
    # Force public schema for authentication - users are stored in public schema
    public_schema = get_public_schema_name()
    
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')

    print(f">>> Ελήφθησαν στοιχεία login: email={email}, password={'****' if password else None}")

    if not email or not password:
        return Response(
            {'error': 'Παρακαλώ δώστε email και password.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Authenticate in public schema context - users are stored in public schema
    user = None
    user_model = None
    with schema_context(public_schema):
        print(f">>> LOGIN_VIEW - Authenticating in schema: {public_schema}")
        user_model = get_user_model()
        print(">>> Όλοι οι χρήστες:", list(user_model.objects.values('id', 'email')))
        
        # Χρήση του custom EmailBackend για authentication με email
        user = authenticate(request, username=email, password=password)
        print(">>> Χρήστης από authenticate():", user)
        
        # Check if user exists for better error message
        if user is None:
            try:
                existing_user = user_model.objects.get(email=email)
                
                # DEBUG: Log user status
                print(f">>> DEBUG: User found but auth failed:")
                print(f">>>   is_active: {existing_user.is_active}")
                print(f">>>   is_staff: {existing_user.is_staff}")
                print(f">>>   is_superuser: {existing_user.is_superuser}")
                print(f">>>   email_verified: {existing_user.email_verified}")
                print(f">>>   role: {existing_user.role}")
                print(f">>>   password check: {existing_user.check_password(password)}")
                
                # Check why authentication failed
                if not existing_user.is_active:
                    if not existing_user.email_verified:
                        return Response(
                            {'error': 'Παρακαλώ επιβεβαιώστε το email σας πριν από τη σύνδεση. Ελέγξτε το inbox σας για το email επιβεβαίωσης.'},
                            status=status.HTTP_401_UNAUTHORIZED
                        )
                    else:
                        return Response(
                            {'error': 'Ο λογαριασμός σας δεν είναι ενεργός. Παρακαλώ επικοινωνήστε με την υποστήριξη.'},
                            status=status.HTTP_401_UNAUTHORIZED
                        )
                else:
                    # Check for unverified staff/superuser (blocked by EmailBackend)
                    if (existing_user.is_staff or existing_user.is_superuser) and not existing_user.email_verified:
                        return Response(
                            {'error': 'Για λόγους ασφαλείας, οι διαχειριστές πρέπει να επιβεβαιώσουν το email τους πριν τη σύνδεση. Ελέγξτε το inbox σας.'},
                            status=status.HTTP_401_UNAUTHORIZED
                        )

                    # User exists and is active but password is wrong
                    return Response(
                        {'error': 'Ο κωδικός που εισάγατε δεν είναι σωστός. Παρακαλώ δοκιμάστε ξανά.'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
            except user_model.DoesNotExist:
                # User doesn't exist
                return Response(
                    {'error': 'Δεν υπάρχει χρήστης με αυτό το email. Παρακαλώ ελέγξτε το email σας.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

    # Δημιουργία JWT tokens
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)

    # Προετοιμασία user data για απάντηση
    role_value = getattr(user, 'role', None)
    print(f">>> DEBUG: user.role = {repr(role_value)}")
    
    tenant_data = None
    if hasattr(user, 'tenant') and user.tenant:
        tenant = user.tenant
        tenant_data = {
            'id': tenant.id,
            'name': tenant.name,
            'schema_name': tenant.schema_name,
            'paid_until': tenant.paid_until,
            'on_trial': tenant.on_trial,
            'is_active': tenant.is_active,
        }

    user_data = {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'role': getattr(user, 'role', None),
        'office_name': user.office_name,
        'office_phone': user.office_phone,
        'office_address': user.office_address,
        'office_logo': user.office_logo.url if user.office_logo else None,
        'office_bank_name': user.office_bank_name,
        'office_bank_account': user.office_bank_account,
        'office_bank_iban': user.office_bank_iban,
        'office_bank_beneficiary': user.office_bank_beneficiary,
        'tenant': tenant_data,
    }
    
    print(f">>> DEBUG: user_data keys = {list(user_data.keys())}")
    print(f">>> DEBUG: user_data['role'] = {repr(user_data.get('role'))}")

    # Determine redirect path based on tenant existence and role
    redirect_path = '/dashboard'  # Default for managers/admins
    tenant_url = None
    if not hasattr(user, 'tenant') or user.tenant is None:
        redirect_path = '/plans'
        print(f">>> DEBUG: User has no tenant, redirecting to /plans")
    else:
        tenant_url = f"{user.tenant.schema_name}.newconcierge.app"
        # Residents go to /my-apartment, managers/admins go to /dashboard
        user_role = getattr(user, 'role', None)
        if user_role == 'resident':
            redirect_path = '/my-apartment'
            print(f">>> DEBUG: User is resident, redirecting to /my-apartment")
        else:
            print(f">>> DEBUG: User has tenant: {user.tenant.schema_name}, role: {user_role}, redirecting to /dashboard")

    response = Response({
        'access': access,
        'refresh': str(refresh),
        'user': user_data,
        'redirect_path': redirect_path,
        'tenant_url': tenant_url,
    }, status=status.HTTP_200_OK)
    attach_refresh_cookie(response, str(refresh))
    return response


@api_view(['GET', 'PATCH', 'PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    GET /api/users/me/
    Επιστρέφει τα στοιχεία του authenticated χρήστη.
    
    PATCH/PUT /api/users/me/
    Ενημερώνει τα στοιχεία του authenticated χρήστη.
    """
    user = request.user
    role = getattr(user, "role", None)

    # Handle PATCH/PUT requests for profile updates
    if request.method in ['PATCH', 'PUT']:
        # Allowed fields for update
        allowed_fields = [
            'first_name', 'last_name', 
            'office_name', 'office_phone', 'office_address',
            'office_bank_name', 'office_bank_account', 
            'office_bank_iban', 'office_bank_beneficiary'
        ]
        
        updated_fields = []
        for field in allowed_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
                updated_fields.append(field)
        
        if updated_fields:
            user.save(update_fields=updated_fields)

    tenant_data = None
    if hasattr(user, 'tenant') and user.tenant:
        tenant = user.tenant
        tenant_data = {
            'id': tenant.id,
            'name': tenant.name,
            'schema_name': tenant.schema_name,
            'paid_until': tenant.paid_until,
            'on_trial': tenant.on_trial,
            'is_active': tenant.is_active,
        }

    # Get office settings - fallback to tenant admin/manager if user doesn't have their own
    office_name = user.office_name
    office_phone = user.office_phone
    office_address = user.office_address
    office_logo_url = user.office_logo.url if user.office_logo else None
    office_bank_name = user.office_bank_name
    office_bank_account = user.office_bank_account
    office_bank_iban = user.office_bank_iban
    office_bank_beneficiary = user.office_bank_beneficiary
    
    # If user doesn't have office settings, try to get from tenant admin/manager
    # This allows internal_managers and residents to see the tenant's office branding
    if not office_logo_url or not office_name:
        try:
            from users.models import CustomUser
            # Find the tenant admin or manager who has office settings
            tenant_admin = CustomUser.objects.filter(
                tenant=user.tenant,
                role__in=['admin', 'manager'],
                office_logo__isnull=False
            ).exclude(office_logo='').first()
            
            if not tenant_admin:
                # Fallback: find any user with office_logo in the tenant
                tenant_admin = CustomUser.objects.filter(
                    tenant=user.tenant,
                    office_logo__isnull=False
                ).exclude(office_logo='').first()
            
            if tenant_admin:
                if not office_logo_url and tenant_admin.office_logo:
                    office_logo_url = tenant_admin.office_logo.url
                if not office_name and tenant_admin.office_name:
                    office_name = tenant_admin.office_name
                if not office_phone and tenant_admin.office_phone:
                    office_phone = tenant_admin.office_phone
                if not office_address and tenant_admin.office_address:
                    office_address = tenant_admin.office_address
                if not office_bank_name and tenant_admin.office_bank_name:
                    office_bank_name = tenant_admin.office_bank_name
                if not office_bank_account and tenant_admin.office_bank_account:
                    office_bank_account = tenant_admin.office_bank_account
                if not office_bank_iban and tenant_admin.office_bank_iban:
                    office_bank_iban = tenant_admin.office_bank_iban
                if not office_bank_beneficiary and tenant_admin.office_bank_beneficiary:
                    office_bank_beneficiary = tenant_admin.office_bank_beneficiary
        except Exception:
            pass  # Keep user's own settings if lookup fails

    return Response({
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'role': role,
        'office_name': office_name,
        'office_phone': office_phone,
        'office_address': office_address,
        'office_logo': office_logo_url,
        'office_bank_name': office_bank_name,
        'office_bank_account': office_bank_account,
        'office_bank_iban': office_bank_iban,
        'office_bank_beneficiary': office_bank_beneficiary,
        'tenant': tenant_data,
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    POST /api/users/logout/
    Blacklist του refresh token για αποσύνδεση.
    Αναμένει JSON { refresh: <refresh_token> }.
    """
    refresh_token = request.data.get('refresh') or get_refresh_token_from_request(request)
    if not refresh_token:
        response = Response(
            {'error': 'Απαιτείται το refresh token.'},
            status=status.HTTP_400_BAD_REQUEST
        )
        clear_refresh_cookie(response)
        return response
    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
        response = Response({'message': 'Αποσυνδεθήκατε επιτυχώς.'}, status=status.HTTP_200_OK)
    except Exception:
        response = Response(
            {'error': 'Άκυρο refresh token.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    clear_refresh_cookie(response)
    return response


@api_view(['PUT', 'PATCH'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def update_office_details(request):
    """
    PUT/PATCH /api/users/office-details/
    Ενημέρωση των στοιχείων γραφείου διαχείρισης του authenticated χρήστη.
    """
    import logging
    logger = logging.getLogger('django')
    
    user = request.user
    content_type = request.content_type or 'unknown'
    has_files = bool(request.FILES)
    data_keys = list(request.data.keys()) if hasattr(request, 'data') else []
    files_keys = list(request.FILES.keys()) if hasattr(request, 'FILES') else []
    
    logger.info(f"[update_office_details] Request received for user {user.id}", extra={
        'content_type': content_type,
        'has_files': has_files,
        'data_keys': data_keys,
        'files_keys': files_keys,
        'method': request.method,
    })
    
    # Log file info if present
    if has_files:
        for key, file_obj in request.FILES.items():
            logger.info(f"[update_office_details] File received: {key}", extra={
                'file_name': file_obj.name,
                'file_size': file_obj.size,
                'file_content_type': getattr(file_obj, 'content_type', 'unknown'),
            })
    
    # DRF's request.data already includes FILES when using multipart/form-data
    # But we need to ensure files are passed correctly to the serializer
    serializer_data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
    
    # Explicitly add files if they exist and aren't already in serializer_data
    if request.FILES:
        for key, file_obj in request.FILES.items():
            if key not in serializer_data:
                serializer_data[key] = file_obj
    
    serializer = OfficeDetailsSerializer(user, data=serializer_data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        # Reload user instance to get updated logo URL
        user.refresh_from_db()
        logger.info(f"[update_office_details] Office details updated successfully for user {user.id}")
        logger.info(f"[update_office_details] Logo URL after save: {user.office_logo.url if user.office_logo else 'None'}")
        
        # Create new serializer instance with refreshed user to get correct logo URL
        response_serializer = OfficeDetailsSerializer(user)
        return Response({
            'message': 'Τα στοιχεία γραφείου διαχείρισης ενημερώθηκαν επιτυχώς.',
            'office_details': response_serializer.data
        }, status=status.HTTP_200_OK)
    
    logger.warning(f"[update_office_details] Validation failed for user {user.id}", extra={
        'errors': serializer.errors,
    })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet για CRUD operations στο CustomUser.
    Protected πίσω από JWT authentication.
    
    Query parameters:
        - building: Filter users by building membership (only users with membership in this building)
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    
    def get_queryset(self):
        """
        Override queryset to filter users by building if building parameter is provided.
        Only returns users that have a BuildingMembership for the specified building.
        """
        queryset = super().get_queryset()
        building_id = self.request.query_params.get('building')
        
        if building_id:
            from buildings.models import BuildingMembership
            # Get user IDs that have membership in this building
            member_user_ids = BuildingMembership.objects.filter(
                building_id=building_id
            ).values_list('resident_id', flat=True)
            queryset = queryset.filter(id__in=member_user_ids)
        
        return queryset
    
    def destroy(self, request, *args, **kwargs):
        """
        DELETE /api/users/<id>/
        Διαγραφή χρήστη - μόνο residents και staff μπορούν να διαγραφούν.
        Admins και managers δεν μπορούν να διαγραφούν.
        """
        from core.permissions import IsManagerOrSuperuser
        
        # Έλεγχος αν ο χρήστης έχει δικαίωμα διαγραφής (πρέπει να είναι manager ή superuser)
        if not IsManagerOrSuperuser().has_permission(request, self):
            return Response({
                'error': 'Μόνο οι διαχειριστές μπορούν να διαγράφουν χρήστες.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user_to_delete = self.get_object()
        user_role = getattr(user_to_delete, 'role', None)
        
        # Ρόλοι που επιτρέπεται να διαγραφούν
        deletable_roles = ['resident', 'staff', 'internal_manager', None, '']
        
        # Προστασία: Δεν επιτρέπεται η διαγραφή του εαυτού σου
        if user_to_delete.id == request.user.id:
            return Response({
                'error': 'Δεν μπορείτε να διαγράψετε τον εαυτό σας.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Επιτρέπεται διαγραφή μόνο αν ο ρόλος είναι στη λίστα deletable_roles
        if user_role not in deletable_roles:
            return Response({
                'error': f'Δεν επιτρέπεται η διαγραφή χρήστη με ρόλο "{user_role}".'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Αν ο χρήστης έχει κατά λάθος is_superuser=True αλλά είναι resident/staff,
        # προχωράμε με τη διαγραφή (data cleanup)
        # Σημείωση: Πραγματικοί superusers δεν θα έχουν role='resident'
        
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """
        POST /api/users/<id>/deactivate/
        Απενεργοποίηση χρήστη - ο χρήστης παραμένει στο σύστημα αλλά δεν μπορεί να συνδεθεί.
        """
        from core.permissions import IsManagerOrSuperuser
        
        # Έλεγχος δικαιωμάτων
        if not IsManagerOrSuperuser().has_permission(request, self):
            return Response({
                'error': 'Μόνο οι διαχειριστές μπορούν να απενεργοποιήσουν χρήστες.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user_to_deactivate = self.get_object()
        
        # Δεν μπορείς να απενεργοποιήσεις τον εαυτό σου
        if user_to_deactivate.id == request.user.id:
            return Response({
                'error': 'Δεν μπορείτε να απενεργοποιήσετε τον εαυτό σας.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Δεν μπορείς να απενεργοποιήσεις superusers ή managers
        if user_to_deactivate.is_superuser or user_to_deactivate.role in ['manager', 'admin']:
            return Response({
                'error': 'Δεν επιτρέπεται η απενεργοποίηση διαχειριστών.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user_to_deactivate.is_active = False
        user_to_deactivate.save()
        
        return Response({
            'message': f'Ο χρήστης {user_to_deactivate.email} απενεργοποιήθηκε επιτυχώς.'
        })

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        POST /api/users/<id>/activate/
        Επανενεργοποίηση χρήστη.
        """
        from core.permissions import IsManagerOrSuperuser
        
        # Έλεγχος δικαιωμάτων
        if not IsManagerOrSuperuser().has_permission(request, self):
            return Response({
                'error': 'Μόνο οι διαχειριστές μπορούν να ενεργοποιήσουν χρήστες.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user_to_activate = self.get_object()
        user_to_activate.is_active = True
        user_to_activate.save()
        
        return Response({
            'message': f'Ο χρήστης {user_to_activate.email} ενεργοποιήθηκε επιτυχώς.'
        })


# ===== AUTHENTICATION ENDPOINTS =====

@api_view(['POST'])
@permission_classes([AllowAny])
# @throttle_classes([RegistrationThrottle])  # Temporarily disabled due to Redis auth issue
def register_view(request):
    """
    POST /api/users/register/
    Εγγραφή νέου χρήστη
    """
    import logging
    logger = logging.getLogger('django')
    
    # Έλεγχος αρχικού schema
    initial_schema = getattr(connection, 'schema_name', 'unknown')
    logger.info(f"[REGISTER] Request received - Initial schema: {initial_schema}")
    logger.info(f"[REGISTER] Request host: {request.get_host()}")
    logger.info(f"[REGISTER] Request data: email={request.data.get('email')}")
    
    # Schema Guard: Απόρριψη αν δεν είμαστε στο public schema πριν την επεξεργασία
    public_schema = get_public_schema_name()
    if initial_schema != public_schema and initial_schema != 'unknown':
        logger.error(f"[REGISTER] Registration attempt on non-public schema: {initial_schema}")
        return Response({
            'error': f'Η εγγραφή πρέπει να γίνεται από το public domain. Τρέχον schema: {initial_schema}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        # Force user creation in the public schema to avoid accidental tenant isolation
        logger.info(f"[REGISTER] Validation successful - Forcing schema to: {public_schema}")
        
        with schema_context(public_schema):
            created_in_schema = getattr(connection, 'schema_name', 'unknown')
            logger.info(f"[REGISTER] Inside schema_context - Active schema: {created_in_schema}")
            
            # Διπλός έλεγχος: Επιβεβαίωση ότι είμαστε στο public schema
            if created_in_schema != public_schema:
                logger.error(f"[REGISTER] CRITICAL: Schema context failed! Expected '{public_schema}', got '{created_in_schema}'")
                return Response({
                    'error': 'Σφάλμα συστήματος: Αποτυχία εξασφάλισης public schema'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            user = serializer.save()
            logger.info(f"[REGISTER] User created successfully - ID: {user.id}, Email: {user.email}, Schema: {created_in_schema}")
        
        # Επιβεβαίωση μετά το schema_context
        final_schema = getattr(connection, 'schema_name', 'unknown')
        logger.info(f"[REGISTER] After schema_context - Schema restored to: {final_schema}")
        
        # Αποστολή email verification
        if EmailService.send_verification_email(user):
            logger.info(f"[REGISTER] Verification email sent successfully to: {user.email}")
            return Response({
                'message': 'Εγγραφή επιτυχής. Παρακαλούμε ελέγξτε το email σας για επιβεβαίωση.',
                'user_id': user.id
            }, status=status.HTTP_201_CREATED)
        else:
            logger.warning(f"[REGISTER] Failed to send verification email to: {user.email}")
            return Response({
                'error': 'Εγγραφή επιτυχής αλλά αποτυχία αποστολής email επιβεβαίωσης.'
            }, status=status.HTTP_201_CREATED)
    
    logger.warning(f"[REGISTER] Validation failed - Errors: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
# @throttle_classes([EmailVerificationThrottle])  # Temporarily disabled due to Redis auth issue
def verify_email_view(request):
    """
    GET /api/users/verify-email/?token=... OR POST /api/users/verify-email/
    Επιβεβαίωση email με token
    """
    # Support both GET (query param) and POST (body) for token
    token = None
    if request.method == 'GET':
        token = request.query_params.get('token')
        if not token:
            return Response({
                'error': 'Token parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
    else:
        serializer = EmailVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        token = serializer.validated_data['token']
    
    # Process verification for both GET and POST
    try:
        user = UserVerificationService.verify_email(token)
        
        # Get tenant URL if user has tenant
        tenant_url = None
        if hasattr(user, 'tenant') and user.tenant:
            tenant_url = f"{user.tenant.schema_name}.newconcierge.app"
        
        return Response({
            'message': 'Email επιβεβαιώθηκε επιτυχώς.',
            'user_id': user.id,
            'email': user.email,
            'tenant_url': tenant_url
        }, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification_view(request):
    """
    POST /api/users/resend-verification/
    Επανάληψη αποστολής email επιβεβαίωσης
    """
    email = request.data.get('email')
    if not email:
        return Response({
            'error': 'Email είναι υποχρεωτικό.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = CustomUser.objects.get(email=email, email_verified=False)
        if EmailService.send_verification_email(user):
            return Response({
                'message': 'Email επιβεβαίωσης στάλθηκε ξανά.'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Αποτυχία αποστολής email.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except CustomUser.DoesNotExist:
        return Response({
            'error': 'Δεν βρέθηκε χρήστης με αυτό το email ή το email είναι ήδη επιβεβαιωμένο.'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def request_magic_link_view(request):
    """
    POST /api/users/request-magic-link/
    Αποστολή magic link για passwordless login (για residents/ενοίκους).
    
    Ο χρήστης εισάγει μόνο το email του και λαμβάνει link για αυτόματη σύνδεση.
    
    Request:
        - email: str (required)
    
    Response:
        - message: str (επιτυχία ή γενικό μήνυμα για ασφάλεια)
    """
    email = request.data.get('email', '').strip().lower()
    
    if not email:
        return Response({
            'error': 'Το email είναι υποχρεωτικό.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Για λόγους ασφαλείας, πάντα επιστρέφουμε το ίδιο μήνυμα
    # ανεξάρτητα αν βρέθηκε ο χρήστης ή όχι
    success_message = 'Αν υπάρχει λογαριασμός με αυτό το email, θα λάβετε σύνδεσμο σύνδεσης.'
    
    try:
        from django_tenants.utils import schema_context
        from buildings.models import Building, BuildingMembership
        from apartments.models import Apartment
        from django.db.models import Q
        
        # Αναζήτηση χρήστη στο public schema
        with schema_context('public'):
            user = CustomUser.objects.filter(email=email).first()
            
            if not user:
                # Χρήστης δεν βρέθηκε - επιστροφή γενικού μηνύματος
                return Response({
                    'message': success_message
                }, status=status.HTTP_200_OK)
            
            # Ελέγχουμε αν ο χρήστης είναι resident
            if user.role not in ['resident', None, '']:
                # Δεν είναι resident - δεν στέλνουμε magic link, αλλά δεν το αποκαλύπτουμε
                return Response({
                    'message': success_message
                }, status=status.HTTP_200_OK)
            
            # Βρες το building του χρήστη
            building = None
            apartment = None
            
            if user.tenant:
                with schema_context(user.tenant.schema_name):
                    # Βρες το πρώτο building που έχει πρόσβαση ο χρήστης
                    membership = BuildingMembership.objects.filter(resident=user).first()
                    if membership:
                        building = membership.building
                        
                        # Προσπάθεια να βρούμε το διαμέρισμα
                        apt = Apartment.objects.filter(
                            Q(owner_user=user) | Q(tenant_user=user),
                            building=building
                        ).first()
                        if apt:
                            apartment = apt
            
            if not building:
                # Ο χρήστης δεν έχει building - δεν μπορούμε να στείλουμε magic link
                return Response({
                    'message': success_message
                }, status=status.HTTP_200_OK)
            
            # Αποστολή magic link email
            if user.tenant:
                with schema_context(user.tenant.schema_name):
                    EmailService.send_magic_login_email(user, building, apartment)
            else:
                EmailService.send_magic_login_email(user, building, apartment)
            
            return Response({
                'message': success_message
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in request_magic_link_view: {e}")
        
        # Πάντα επιστρέφουμε το ίδιο μήνυμα για ασφάλεια
        return Response({
            'message': success_message
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def resident_login_view(request):
    """
    POST /api/users/resident-login/
    Σύνδεση ενοίκου με email ΚΑΙ τηλέφωνο (χωρίς password).
    
    Ο χρήστης εισάγει και τα δύο στοιχεία και αν είναι καταχωρημένος
    σε κάποιο διαμέρισμα με αυτά, συνδέεται απευθείας.
    
    Request:
        - email: str
        - phone: str
    
    Response:
        - access: JWT access token
        - refresh: JWT refresh token
        - user: User data
    """
    import re
    import logging
    logger = logging.getLogger(__name__)
    
    email = request.data.get('email', '').strip().lower()
    phone = request.data.get('phone', '').strip()
    
    if not email:
        return Response({
            'error': 'Παρακαλώ εισάγετε το email σας.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not phone:
        return Response({
            'error': 'Παρακαλώ εισάγετε το τηλέφωνό σας.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate email format
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return Response({
            'error': 'Το email δεν είναι έγκυρο.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def normalize_phone(phone_str):
        """
        Κανονικοποίηση τηλεφώνου - αφαίρεση κωδικών χώρας και ειδικών χαρακτήρων.
        Υποστηρίζει: +30, 0030, 30 (για Ελλάδα) και άλλους κωδικούς.
        Επιστρέφει τα τελευταία 10 ψηφία (ελληνικό κινητό) ή όλο τον αριθμό.
        """
        if not phone_str:
            return ''
        # Αφαίρεση κενών, παύλων, τελειών, παρενθέσεων
        cleaned = re.sub(r'[\s\-\.\(\)]', '', phone_str)
        # Αφαίρεση + στην αρχή
        cleaned = cleaned.lstrip('+')
        # Αφαίρεση κωδικού χώρας Ελλάδας (30 ή 0030)
        if cleaned.startswith('0030'):
            cleaned = cleaned[4:]
        elif cleaned.startswith('30') and len(cleaned) > 10:
            cleaned = cleaned[2:]
        # Αφαίρεση αρχικού 0 αν υπάρχει (π.χ. 0694... -> 694...)
        if cleaned.startswith('0') and len(cleaned) > 10:
            cleaned = cleaned[1:]
        return cleaned
    
    # Κανονικοποίηση τηλεφώνου εισόδου
    phone_clean = normalize_phone(phone)
    
    if not phone_clean or len(phone_clean) < 10:
        return Response({
            'error': 'Το τηλέφωνο δεν είναι έγκυρο. Παρακαλώ εισάγετε έγκυρο αριθμό.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from django_tenants.utils import schema_context
        from apartments.models import Apartment
        from tenants.models import Client
        
        user = None
        building = None
        apartment = None
        tenant = None
        
        # Ψάχνουμε σε όλα τα tenant schemas
        with schema_context('public'):
            tenants = Client.objects.exclude(schema_name='public')
        
        for t in tenants:
            with schema_context(t.schema_name):
                # Αναζήτηση στο Apartment model - πρέπει να ταιριάζουν ΚΑΙ τα δύο
                apts = Apartment.objects.all()
                
                for a in apts:
                    # Καθαρίζουμε τα αποθηκευμένα τηλέφωνα με την ίδια λογική
                    owner_phones = [
                        normalize_phone(a.owner_phone),
                        normalize_phone(a.owner_phone2),
                    ]
                    tenant_phones = [
                        normalize_phone(a.tenant_phone),
                        normalize_phone(a.tenant_phone2),
                    ]
                    
                    # Έλεγχος αν ταιριάζουν email + τηλέφωνο για owner
                    if a.owner_email and a.owner_email.lower() == email:
                        if phone_clean in owner_phones and phone_clean:
                            apartment = a
                            building = a.building
                            tenant = t
                            user = a.owner_user
                            break
                    
                    # Έλεγχος αν ταιριάζουν email + τηλέφωνο για tenant
                    if a.tenant_email and a.tenant_email.lower() == email:
                        if phone_clean in tenant_phones and phone_clean:
                            apartment = a
                            building = a.building
                            tenant = t
                            user = a.tenant_user
                            break
                
                if user:
                    break
        
        if not user:
            return Response({
                'error': 'Δεν βρέθηκε λογαριασμός με αυτά τα στοιχεία. Βεβαιωθείτε ότι το email και το τηλέφωνο είναι σωστά καταχωρημένα στην πολυκατοικία σας.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Έλεγχος αν ο χρήστης είναι active
        if not user.is_active:
            return Response({
                'error': 'Ο λογαριασμός σας δεν είναι ενεργός. Παρακαλώ επικοινωνήστε με τη διαχείριση.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Δημιουργία JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Ενημέρωση last_login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        logger.info(f"Resident login successful for user {user.email} with email+phone verification")
        
        # Επιστροφή response
        response_data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
            },
            'building': {
                'id': building.id if building else None,
                'name': building.name if building else None,
            } if building else None,
            'apartment': {
                'id': apartment.id if apartment else None,
                'number': apartment.number if apartment else None,
            } if apartment else None,
        }
        
        # Προσθήκη tenant URL αν υπάρχει
        if tenant and hasattr(tenant, 'get_primary_domain'):
            try:
                domain = tenant.get_primary_domain()
                if domain:
                    response_data['tenant_url'] = domain.domain
            except Exception:
                pass
        
        response = Response(response_data, status=status.HTTP_200_OK)
        attach_refresh_cookie(response, str(refresh))
        return response
        
    except Exception as e:
        logger.error(f"Error in resident_login_view: {e}", exc_info=True)
        return Response({
            'error': 'Προέκυψε σφάλμα. Παρακαλώ δοκιμάστε ξανά.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===== INVITATION ENDPOINTS =====

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
# @throttle_classes([InvitationThrottle])  # Temporarily disabled due to Redis auth issue
def create_invitation_view(request):
    """
    POST /api/users/invite/
    Δημιουργία πρόσκλησης χρήστη (μόνο για Managers)
    """
    from core.permissions import IsManager
    
    # Έλεγχος δικαιωμάτων
    if not IsManager().has_permission(request, None):
        return Response({
            'error': 'Μόνο οι διαχειριστές μπορούν να δημιουργούν προσκλήσεις.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    serializer = UserInvitationCreateSerializer(data=request.data)
    if serializer.is_valid():
        try:
            invitation = InvitationService.create_invitation(
                invited_by=request.user,
                **serializer.validated_data
            )
            return Response(UserInvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def list_invitations_view(request):
    """
    GET /api/users/invitations/
    Λίστα προσκλήσεων που έχει στείλει ο χρήστης
    """
    invitations = UserInvitation.objects.filter(invited_by=request.user).order_by('-created_at')
    serializer = UserInvitationSerializer(invitations, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_invitation_view(request):
    """
    GET /api/users/invitations/verify/?token=xxx
    Verify invitation token and return invitation details (public endpoint)
    Used by kiosk self-registration to validate tokens before showing the form
    """
    token = request.query_params.get('token')
    
    if not token:
        return Response({
            'error': 'Token είναι υποχρεωτικό'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        invitation = UserInvitation.objects.get(token=token, status='pending')
    except UserInvitation.DoesNotExist:
        return Response({
            'error': 'Μη έγκυρος ή ληγμένος σύνδεσμος'
        }, status=status.HTTP_404_NOT_FOUND)
    
    if invitation.is_expired:
        invitation.expire()
        return Response({
            'error': 'Ο σύνδεσμος έχει λήξει'
        }, status=status.HTTP_410_GONE)
    
    # Get building info if available
    building_name = None
    building_address = None
    if invitation.building_id:
        try:
            from buildings.models import Building
            building = Building.objects.get(id=invitation.building_id)
            building_name = building.name
            building_address = building.address
        except:
            pass
    
    return Response({
        'email': invitation.email,
        'first_name': invitation.first_name,
        'last_name': invitation.last_name,
        'building_id': invitation.building_id,
        'building_name': building_name,
        'building_address': building_address,
        'assigned_role': invitation.assigned_role,
        'expires_at': invitation.expires_at.isoformat(),
        'source': getattr(invitation, 'source', 'admin'),
        'auto_approved': getattr(invitation, 'auto_approved', False)
    })


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def resend_invitation_view(request):
    """
    POST /api/users/invitations/resend/
    Επαναποστολή πρόσκλησης
    Body: { "invitation_id": 123 } ή { "email": "user@example.com", "building_id": 1 }
    """
    from core.permissions import IsManager
    
    # Έλεγχος δικαιωμάτων
    if not IsManager().has_permission(request, None):
        return Response({
            'error': 'Μόνο οι διαχειριστές μπορούν να επαναστέλουν προσκλήσεις.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    invitation_id = request.data.get('invitation_id')
    email = request.data.get('email')
    building_id = request.data.get('building_id')
    
    try:
        if invitation_id:
            # Βρες invitation από ID
            invitation = UserInvitation.objects.get(
                id=invitation_id,
                invited_by=request.user
            )
        elif email:
            # Βρες το πιο πρόσφατο pending invitation για αυτό το email
            query = UserInvitation.objects.filter(
                email=email,
                invited_by=request.user,
                status=UserInvitation.InvitationStatus.PENDING
            )
            if building_id:
                query = query.filter(building_id=building_id)
            
            invitation = query.order_by('-created_at').first()
            
            if not invitation:
                # Αν δεν υπάρχει pending, δημιούργησε νέο
                from .services import InvitationService
                invitation = InvitationService.create_invitation(
                    invited_by=request.user,
                    email=email,
                    building_id=building_id,
                    assigned_role=request.data.get('assigned_role')
                )
                return Response({
                    'message': 'Η πρόσκληση δημιουργήθηκε και στάλθηκε επιτυχώς',
                    'invitation': UserInvitationSerializer(invitation).data
                }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'error': 'Πρέπει να δοθεί invitation_id ή email'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Έλεγχος αν η πρόσκληση μπορεί να σταλεί ξανά
        if invitation.status != UserInvitation.InvitationStatus.PENDING:
            return Response({
                'error': f'Η πρόσκληση δεν μπορεί να σταλεί ξανά (κατάσταση: {invitation.status})'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if invitation.is_expired:
            # Ανανέωσε την ημερομηνία λήξης
            from django.utils import timezone
            invitation.expires_at = timezone.now() + timezone.timedelta(days=7)
            invitation.save()
        
        # Αποστολή email
        from .services import EmailService
        success = EmailService.send_invitation_email(invitation)
        
        if success:
            return Response({
                'message': 'Η πρόσκληση στάλθηκε ξανά επιτυχώς',
                'invitation': UserInvitationSerializer(invitation).data
            })
        else:
            return Response({
                'error': 'Αποτυχία αποστολής email'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except UserInvitation.DoesNotExist:
        return Response({
            'error': 'Η πρόσκληση δεν βρέθηκε'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': f'Σφάλμα: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_invitation_view(request, pk):
    """
    DELETE /api/users/invitations/<id>/
    Διαγραφή πρόσκλησης (μόνο για Managers ή Superusers)
    """
    from core.permissions import IsManagerOrSuperuser
    
    # Έλεγχος δικαιωμάτων
    if not IsManagerOrSuperuser().has_permission(request, None):
        return Response({
            'error': 'Μόνο οι διαχειριστές μπορούν να διαγράφουν προσκλήσεις.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        invitation = UserInvitation.objects.get(
            id=pk,
            invited_by=request.user
        )
        
        invitation.delete()
        return Response({'message': 'Η πρόσκληση διαγράφηκε επιτυχώς'}, status=status.HTTP_200_OK)
        
    except UserInvitation.DoesNotExist:
        return Response({
            'error': 'Η πρόσκληση δεν βρέθηκε'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def revoke_user_access_view(request):
    """
    POST /api/users/revoke-access/
    Αφαίρεση πρόσβασης χρήστη από κτίριο/διαμερίσματα
    
    Request body:
        - user_id: ID του χρήστη (required)
        - building_id: ID του κτιρίου (optional, αν δεν δοθεί αφαιρείται από όλα)
        - delete_user: Boolean - αν διαγραφεί και ο χρήστης (default: false)
    
    Returns:
        - memberships_deleted: Αριθμός διαγραμμένων BuildingMemberships
        - apartments_unlinked: Αριθμός αποσυνδεδεμένων διαμερισμάτων
        - internal_manager_removed: Boolean - αν αφαιρέθηκε από internal_manager
        - user_deleted: Boolean - αν διαγράφηκε ο χρήστης
        - invitations_cancelled: Αριθμός ακυρωμένων προσκλήσεων
    """
    from core.permissions import IsManagerOrSuperuser
    
    # Έλεγχος δικαιωμάτων
    if not IsManagerOrSuperuser().has_permission(request, None):
        return Response({
            'error': 'Μόνο οι διαχειριστές μπορούν να αφαιρούν πρόσβαση χρηστών.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    user_id = request.data.get('user_id')
    building_id = request.data.get('building_id')
    delete_user = request.data.get('delete_user', False)
    
    if not user_id:
        return Response({
            'error': 'Το user_id είναι υποχρεωτικό.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        results = InvitationService.revoke_user_access(
            user_id=user_id,
            building_id=building_id,
            delete_user=delete_user,
            revoked_by=request.user
        )
        
        message = f"Αφαιρέθηκε η πρόσβαση: {results['memberships_deleted']} membership(s), {results['apartments_unlinked']} διαμέρισμα(τα)"
        if results['user_deleted']:
            message += ", ο χρήστης διαγράφηκε"
        
        return Response({
            'message': message,
            'results': results
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': f'Σφάλμα: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def accept_invitation_view(request):
    """
    POST /api/users/accept-invitation/
    Αποδοχή πρόσκλησης και δημιουργία λογαριασμού
    """
    print(f">>> ACCEPT_INVITATION: Request data keys: {list(request.data.keys())}")
    print(f">>> ACCEPT_INVITATION: Password provided: {'password' in request.data}")
    
    serializer = InvitationAcceptanceSerializer(data=request.data)
    if serializer.is_valid():
        password = serializer.validated_data['password']
        first_name = serializer.validated_data.get('first_name', '')
        last_name = serializer.validated_data.get('last_name', '')
        print(f">>> ACCEPT_INVITATION: Validated password length: {len(password) if password else 0}")
        
        try:
            # Pass request.tenant to handle kiosk registrations where invited_by has no tenant
            current_tenant = getattr(request, 'tenant', None)
            
            user = InvitationService.accept_invitation(
                token=serializer.validated_data['token'],
                password=password,
                first_name=first_name,
                last_name=last_name,
                tenant=current_tenant
            )
            
            # Δημιουργία JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Get tenant URL for cross-subdomain redirect
            tenant_url = None
            redirect_path = '/dashboard'
            if hasattr(user, 'tenant') and user.tenant:
                tenant_url = f"{user.tenant.schema_name}.newconcierge.app"
                # Residents go to /my-apartment
                if getattr(user, 'role', None) == 'resident':
                    redirect_path = '/my-apartment'
            
            # Get building_id from the invitation for frontend context
            invitation = UserInvitation.objects.filter(
                email=user.email,
                status=UserInvitation.InvitationStatus.ACCEPTED
            ).order_by('-accepted_at').first()
            building_id = invitation.building_id if invitation else None
            
            response = Response({
                'message': 'Πρόσκληση αποδεχτή επιτυχώς.',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': getattr(user, 'role', None),
                },
                'tokens': {
                    'access': access_token,
                    'refresh': refresh_token,
                },
                'tenant_url': tenant_url,
                'redirect_path': redirect_path,
                'building_id': building_id,
            }, status=status.HTTP_201_CREATED)
            attach_refresh_cookie(response, refresh_token)
            return response
            
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ===== PASSWORD MANAGEMENT ENDPOINTS =====

@api_view(['POST'])
@permission_classes([AllowAny])
# @throttle_classes([PasswordResetThrottle])  # Temporarily disabled due to Redis auth issue
def request_password_reset_view(request):
    """
    POST /api/users/password-reset/
    Αίτηση επαναφοράς κωδικού
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        try:
            PasswordResetService.request_password_reset(serializer.validated_data['email'])
            return Response({
                'message': 'Οδηγίες επαναφοράς κωδικού στάλθηκαν στο email σας.'
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
# @throttle_classes([PasswordResetThrottle])  # Temporarily disabled due to Redis auth issue
def confirm_password_reset_view(request):
    """
    POST /api/users/password-reset-confirm/
    Επιβεβαίωση επαναφοράς κωδικού
    """
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        try:
            user = PasswordResetService.confirm_password_reset(
                token=serializer.validated_data['token'],
                new_password=serializer.validated_data['password']
            )
            return Response({
                'message': 'Κωδικός επαναφοράς επιτυχώς.'
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    POST /api/users/change-password/
    Αλλαγή κωδικού από ενεργό χρήστη
    """
    serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'message': 'Κωδικός αλλάχθηκε επιτυχώς.'
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ===== USER PROFILE ENDPOINTS =====

@api_view(['GET', 'PUT', 'PATCH'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """
    GET/PUT/PATCH /api/users/profile/
    Λήψη και ενημέρωση προφίλ χρήστη
    """
    if request.method == 'GET':
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = UserProfileSerializer(
            request.user, 
            data=request.data, 
            partial=request.method == 'PATCH'
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# UserViewSet is defined above (line ~321) - removed duplicate definition


# ===== FREE TENANT CREATION ENDPOINT =====

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def create_free_tenant_view(request):
    """
    POST /api/users/create-free-tenant/
    Δημιουργία free tenant για authenticated user χωρίς Stripe.
    
    Body: { "subdomain": "my-building", "apartments": 5 }
    """
    import logging
    from tenants.services import TenantService
    from billing.models import SubscriptionPlan
    
    logger = logging.getLogger('django')
    user = request.user
    
    # Check if user already has a tenant
    if hasattr(user, 'tenant') and user.tenant:
        return Response({
            'error': 'Έχετε ήδη workspace',
            'tenant_url': f"{user.tenant.schema_name}.newconcierge.app"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    subdomain = request.data.get('subdomain', '').strip().lower()
    apartments = request.data.get('apartments', 7)
    
    # Validate subdomain
    if not subdomain:
        return Response({
            'error': 'Το subdomain είναι υποχρεωτικό'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    import re
    if not re.match(r'^[a-z0-9-]+$', subdomain):
        return Response({
            'error': 'Το subdomain πρέπει να περιέχει μόνο πεζά γράμματα, αριθμούς και παύλες'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check apartments limit for free plan
    try:
        apartments = int(apartments)
    except (TypeError, ValueError):
        apartments = 7
    
    if apartments > 7:
        return Response({
            'error': 'Το Free plan υποστηρίζει έως 7 διαμερίσματα'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get the free plan
    try:
        free_plan = SubscriptionPlan.objects.get(plan_type='free')
    except SubscriptionPlan.DoesNotExist:
        # Try to find by name if plan_type doesn't exist
        try:
            free_plan = SubscriptionPlan.objects.filter(
                name__icontains='free'
            ).first()
            if not free_plan:
                # Create a default free plan if it doesn't exist
                free_plan = SubscriptionPlan.objects.create(
                    name='Free',
                    plan_type='free',
                    description='Δωρεάν πλάνο για μικρές πολυκατοικίες (1-7 διαμερίσματα)',
                    monthly_price=0,
                    yearly_price=0,
                    max_buildings=1,
                    max_apartments_per_building=7,
                    trial_days=0,
                    is_active=True
                )
                logger.info(f"Created default free plan: {free_plan.id}")
        except Exception as e:
            logger.error(f"Failed to get/create free plan: {e}")
            return Response({
                'error': 'Δεν βρέθηκε το δωρεάν πλάνο'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Create tenant
    try:
        from django.db import transaction
        
        tenant_service = TenantService()
        
        with transaction.atomic():
            # Create tenant and subscription with empty Stripe IDs
            tenant, subscription = tenant_service.create_tenant_and_subscription(
                schema_name=subdomain,
                user=user,
                plan_id=free_plan.id,
                stripe_customer_id='',  # No Stripe for free plan
                stripe_subscription_id='',  # No Stripe for free plan
                stripe_checkout_session_id=None
            )
            
            # Update subscription status to active (not trial) for free plan
            subscription.status = 'active'
            subscription.trial_start = None
            subscription.trial_end = None
            subscription.save(update_fields=['status', 'trial_start', 'trial_end'])
            
            # Link user to tenant
            user.tenant = tenant
            user.is_staff = True
            user.role = 'manager'
            user.is_active = True
            user.email_verified = True  # Auto-verify for free plan
            user.save(update_fields=['tenant', 'is_staff', 'role', 'is_active', 'email_verified'])
            
            logger.info(f"[FREE TENANT] Created free tenant '{subdomain}' for user {user.email}")
        
        # Generate new tokens with updated user info
        refresh = RefreshToken.for_user(user)
        
        tenant_url = f"{tenant.schema_name}.newconcierge.app"
        
        response = Response({
            'success': True,
            'message': 'Το workspace δημιουργήθηκε επιτυχώς!',
            'tenantUrl': tenant_url,
            'tenant': {
                'id': tenant.id,
                'name': tenant.name,
                'schema_name': tenant.schema_name
            },
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
        }, status=status.HTTP_201_CREATED)
        attach_refresh_cookie(response, str(refresh))
        return response
        
    except Exception as e:
        logger.error(f"[FREE TENANT] Failed to create tenant: {e}", exc_info=True)
        return Response({
            'error': f'Αποτυχία δημιουργίας workspace: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
