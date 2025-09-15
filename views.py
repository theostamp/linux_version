from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from decimal import Decimal
from datetime import datetime

from .models import DocumentUpload
from .serializers import DocumentUploadSerializer
from financial.models import Expense # ⬅️ Εισαγωγή του Expense model

class DocumentUploadViewSet(viewsets.ModelViewSet):
    queryset = DocumentUpload.objects.all().order_by('-created_at')
    serializer_class = DocumentUploadSerializer
    # ... (permission_classes, filter_backends, etc.)

    def perform_create(self, serializer):
        # ... (Η λογική για το ανέβασμα αρχείου)
        pass

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm_and_create_expense(self, request, pk=None):
        """
        Επιβεβαιώνει τα δεδομένα από το AI και δημιουργεί μια νέα δαπάνη (Expense).
        """
        document = self.get_object()

        if document.status not in ['awaiting_confirmation', 'completed']:
            return Response(
                {'error': 'Το παραστατικό δεν είναι έτοιμο για επιβεβαίωση.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Δεδομένα που επιβεβαίωσε ο χρήστης από τη φόρμα του frontend
        confirmed_data = request.data

        try:
            # 1. Έλεγχος για υπάρχουσα δαπάνη για αποφυγή διπλοεγγραφών
            if document.linked_expense:
                return Response(
                    {'message': 'Αυτό το παραστατικό έχει ήδη συνδεθεί με μια δαπάνη.'},
                    status=status.HTTP_409_CONFLICT
                )

            # 2. Αντιστοίχιση δεδομένων από τη φόρμα στα πεδία του Expense
            expense_title = confirmed_data.get('supplier_name', document.original_filename)
            total_amount = Decimal(confirmed_data.get('total_amount', 0))
            
            # Έξυπνη διαχείριση ημερομηνίας
            issue_date_str = confirmed_data.get('invoice_date')
            try:
                issue_date = datetime.strptime(issue_date_str, '%Y-%m-%d').date() if issue_date_str else timezone.now().date()
            except (ValueError, TypeError):
                issue_date = timezone.now().date()

            # 3. Δημιουργία της νέας δαπάνης
            new_expense = Expense.objects.create(
                building=document.building,
                title=f"Από παραστατικό: {expense_title}",
                amount=total_amount,
                date=issue_date,
                category='general_expenses', # Προσωρινά, μπορεί να γίνει πιο έξυπνο
                description=f"Αυτόματη καταχώρηση από το παραστατικό ID: {document.id}.",
                created_by=request.user
            )

            # 4. Σύνδεση του παραστατικού με τη νέα δαπάνη
            document.linked_expense = new_expense
            document.status = 'completed'
            document.confirmed_by = request.user
            document.confirmed_at = timezone.now()
            document.save()

            return Response({'message': 'Η δαπάνη δημιουργήθηκε και συνδέθηκε επιτυχώς.', 'expense_id': new_expense.id}, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': f'Σφάλμα κατά τη δημιουργία της δαπάνης: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)