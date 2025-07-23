# backend/users/views.py

from django.http import JsonResponse 
 
  
from django.views.decorators.csrf import ensure_csrf_cookie 
 
  
from rest_framework import status, viewsets 
from rest_framework.decorators import api_view, permission_classes, authentication_classes 
from rest_framework.permissions import AllowAny, IsAuthenticated 
from rest_framework.response import Response 
from rest_framework_simplejwt.tokens import RefreshToken 
from rest_framework_simplejwt.authentication import JWTAuthentication 
from django.contrib.auth import authenticate, login, logout 
 
  
from django.views.decorators.csrf import csrf_exempt       #  <-- πρόσθεσε αυτό
 
  

from rest_framework.decorators import api_view 
from rest_framework.response import Response 
from django.contrib.auth import get_user_model 
 
  
from .models import CustomUser
from .serializers import UserSerializer


@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Endpoint για τοποθέτηση CSRF cookie (εφόσον το χρειάζεστε ακόμα για άλλες φόρμες).
    GET /api/users/csrf/
    """
    return JsonResponse({"message": "CSRF cookie set"})


@api_view(["POST", "OPTIONS"])
@permission_classes([AllowAny])
@csrf_exempt  # Χρειάζεται αν δεν χρησιμοποιείτε CSRF token
def login_view(request):
    """
    POST /api/users/login/
    Δέχεται JSON { email, password }, επιστρέφει JWT tokens + user data.
    """
    # Debug πριν την αυθεντικοποίηση
    user_model = get_user_model()
    print(">>> Όλοι οι χρήστες:", list(user_model.objects.values('id', 'email')))

    email = request.data.get('email')
    password = request.data.get('password')

    print(f">>> Ελήφθησαν στοιχεία login: email={email}, password={'****' if password else None}")

    if not email or not password:
        return Response(
            {'error': 'Παρακαλώ δώστε email και password.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Χρήση του custom EmailBackend για authentication με email
    user = authenticate(request, email=email, password=password)
    print(">>> Χρήστης από authenticate():", user)

    if user is None:
        return Response(
            {'error': 'Μη έγκυρα στοιχεία σύνδεσης'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Δημιουργία JWT tokens
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)

    # Προετοιμασία user data για απάντηση
    user_data = {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
    }

    return Response({
        'access': access,
        'refresh': str(refresh),
        'user': user_data,
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

    return Response({
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'role': role,
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


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet για CRUD operations στο CustomUser.
    Protected πίσω από JWT authentication.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
