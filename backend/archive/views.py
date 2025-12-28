from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.http import FileResponse, Http404
from .models import ArchiveDocument
from .serializers import ArchiveDocumentSerializer
import logging
import os
import mimetypes

logger = logging.getLogger(__name__)


class ArchiveDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet για το Ηλεκτρονικό Αρχείο."""

    queryset = ArchiveDocument.objects.select_related(
        "building",
        "uploaded_by",
        "linked_expense",
    ).all()
    serializer_class = ArchiveDocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        "building",
        "category",
        "document_type",
        "supplier_vat",
        "linked_expense",
    ]
    search_fields = [
        "title",
        "document_number",
        "supplier_vat",
        "supplier_name",
        "original_filename",
    ]
    ordering_fields = ["created_at", "document_date", "amount"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=True, methods=["get"], permission_classes=[])
    def download(self, request, pk=None):
        # Allow token-in-query access similar to document_parser preview.
        # This enables direct streaming download in a new tab without relying on Authorization headers.
        from rest_framework.permissions import IsAuthenticated as _IsAuthenticated
        from django.contrib.auth import get_user_model

        User = get_user_model()
        token = request.GET.get("token")
        if token:
            from rest_framework_simplejwt.tokens import AccessToken
            try:
                validated_token = AccessToken(token)
                user_id = validated_token.get("user_id")
                if user_id:
                    request.user = User.objects.get(id=user_id)
                else:
                    return Response(
                        {"error": "Invalid token"},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
            except Exception as e:
                logger.error(f"Token validation failed: {str(e)}")
                return Response(
                    {"error": "Authentication failed"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
        else:
            permission_check = _IsAuthenticated()
            if not permission_check.has_permission(request, self):
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

        document = self.get_object()
        if not document.file:
            raise Http404("Document file not found")
        try:
            file_path = document.file.path
            if not os.path.exists(file_path):
                raise Http404("File not found on server")
            content_type = (document.mime_type or "").strip() or mimetypes.guess_type(file_path)[0] or "application/octet-stream"
            response = FileResponse(
                open(file_path, "rb"),
                content_type=content_type,
            )
            response["Content-Disposition"] = (
                f'attachment; filename="{document.original_filename}"'
            )
            return response
        except Exception as e:
            logger.error(f"Error downloading archive document {document.id}: {str(e)}")
            raise Http404("Error downloading file")

    @action(detail=True, methods=["get"], permission_classes=[])
    def preview(self, request, pk=None):
        # Allow token-in-query access similar to document_parser preview.
        # This enables direct streaming preview in a new tab without relying on Authorization headers.
        from rest_framework.permissions import IsAuthenticated as _IsAuthenticated
        from django.contrib.auth import get_user_model

        User = get_user_model()
        token = request.GET.get("token")
        if token:
            from rest_framework_simplejwt.tokens import AccessToken
            try:
                validated_token = AccessToken(token)
                user_id = validated_token.get("user_id")
                if user_id:
                    request.user = User.objects.get(id=user_id)
                else:
                    return Response(
                        {"error": "Invalid token"},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
            except Exception as e:
                logger.error(f"Token validation failed: {str(e)}")
                return Response(
                    {"error": "Authentication failed"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
        else:
            permission_check = _IsAuthenticated()
            if not permission_check.has_permission(request, self):
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

        document = self.get_object()
        if not document.file:
            raise Http404("Document file not found")
        try:
            file_path = document.file.path
            if not os.path.exists(file_path):
                raise Http404("File not found on server")
            content_type = (document.mime_type or "").strip() or mimetypes.guess_type(file_path)[0] or "application/octet-stream"
            response = FileResponse(
                open(file_path, "rb"),
                content_type=content_type,
            )
            response["X-Frame-Options"] = "SAMEORIGIN"
            response["Content-Disposition"] = (
                f'inline; filename="{document.original_filename}"'
            )
            return response
        except Exception as e:
            logger.error(f"Error previewing archive document {document.id}: {str(e)}")
            raise Http404("Error previewing file")

    @action(detail=False, methods=["get"])
    def categories(self, request):
        categories = [
            {"value": choice[0], "label": choice[1]}
            for choice in ArchiveDocument.Category.choices
        ]
        return Response(categories, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def document_types(self, request):
        doc_types = [
            {"value": choice[0], "label": choice[1]}
            for choice in ArchiveDocument.DocumentType.choices
        ]
        return Response(doc_types, status=status.HTTP_200_OK)
