from django.urls import path

from .views import mailersend_webhook


urlpatterns = [
    path("mailersend/", mailersend_webhook, name="mailersend-webhook"),
    path("mailersend", mailersend_webhook, name="mailersend-webhook-no-slash"),
]
