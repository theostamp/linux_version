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
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone
from .models import CustomUser, UserInvitation, PasswordResetToken
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
    InvitationThrottle, EmailVerificationThrottle, AuthEndpointThrottle
)

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token view that uses email instead of username
    """
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginThrottle]

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

    return Response({
        'access': access,
        'refresh': str(refresh),
        'user': user_data,
        'redirect_path': redirect_path,
        'tenant_url': tenant_url,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    GET /api/users/me/
    Επιστρέφει τα στοιχεία του authenticated χρήστη.
    """
    user = request.user
    role = getattr(user, "role", None)

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

    return Response({
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'role': role,
        'office_name': user.office_name,
        'office_phone': user.office_phone,
        'office_address': user.office_address,
        'office_logo': user.office_logo.url if user.office_logo else None,
        'office_bank_name': user.office_bank_name,
        'office_bank_account': user.office_bank_account,
        'office_bank_iban': user.office_bank_iban,
        'office_bank_beneficiary': user.office_bank_beneficiary,
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
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response(
            {'error': 'Απαιτείται το refresh token.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
    except Exception:
        return Response(
            {'error': 'Άκυρο refresh token.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    return Response({'message': 'Αποσυνδεθήκατε επιτυχώς.'}, status=status.HTTP_200_OK)


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
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    
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
@permission_classes([AllowAny])
def accept_invitation_view(request):
    """
    POST /api/users/accept-invitation/
    Αποδοχή πρόσκλησης και δημιουργία λογαριασμού
    """
    serializer = InvitationAcceptanceSerializer(data=request.data)
    if serializer.is_valid():
        try:
            user = InvitationService.accept_invitation(
                token=serializer.validated_data['token'],
                password=serializer.validated_data['password']
            )
            
            # Δημιουργία JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            return Response({
                'message': 'Πρόσκληση αποδεχτή επιτυχώς.',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                },
                'tokens': {
                    'access': access_token,
                    'refresh': refresh_token,
                }
            }, status=status.HTTP_201_CREATED)
            
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
