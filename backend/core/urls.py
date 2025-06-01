from django.urls import path # type: ignore  # type: ignore  # type: ignore  # type: ignore
from .views import get_csrf_token, api_root

urlpatterns = [
    path("", api_root, name="api_root"),
    path("csrf/", get_csrf_token, name="get_csrf_token"),
]
