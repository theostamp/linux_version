"""
Refactored Payment Views - Χρήση του νέου PaymentService
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction as db_transaction
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import datetime

from .models import Payment
from .serializers import PaymentSerializer
from .permissions import PaymentPermission
from .payment_service import PaymentService, BalanceCalculator, PaymentValidator
from .audit import FinancialAuditLog


class PaymentViewSet(viewsets.ModelViewSet):
    """
    Αναδιοργανωμένο ViewSet για πληρωμές με χρήση PaymentService
    """

    queryset = Payment.objects.select_related('apartment', 'apartment__building').all()
    serializer_class = PaymentSerializer
    permission_classes = [PaymentPermission]

    def get_queryset(self):
        """Φιλτράρισμα ανά building και μήνα"""
        queryset = super().get_queryset()

        building_id = self.request.query_params.get('building_id')
        if building_id:
            queryset = queryset.filter(apartment__building_id=building_id)

        month = self.request.query_params.get('month')
        if month:
            try:
                year, month_num = month.split('-')
                year = int(year)
                month_num = int(month_num)

                from datetime import date
                start_date = date(year, month_num, 1)
                if month_num == 12:
                    end_date = date(year + 1, 1, 1)
                else:
                    end_date = date(year, month_num + 1, 1)

                queryset = queryset.filter(date__gte=start_date, date__lt=end_date)
            except (ValueError, TypeError):
                pass

        return queryset.order_by('-date', '-id')

    @db_transaction.atomic
    def create(self, request):
        """Δημιουργία πληρωμής μέσω PaymentService"""
        try:
            data = request.data

            # Λήψη building_id
            apartment_id = data.get('apartment')
            if not apartment_id:
                return Response(
                    {'error': 'Το διαμέρισμα είναι υποχρεωτικό'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            from apartments.models import Apartment
            apartment = Apartment.objects.get(id=apartment_id)
            building_id = apartment.building_id

            # Χρήση PaymentService
            service = PaymentService(building_id)

            # Προετοιμασία allocations αν υπάρχουν
            allocations = None
            if 'allocations' in data:
                allocations = data['allocations']
            elif 'reserve_fund_amount' in data or 'previous_obligations_amount' in data:
                allocations = {}
                if data.get('reserve_fund_amount'):
                    allocations['reserve_fund'] = Decimal(str(data['reserve_fund_amount']))
                if data.get('previous_obligations_amount'):
                    allocations['previous_obligations'] = Decimal(str(data['previous_obligations_amount']))

                # Το υπόλοιπο πάει σε κοινόχρηστα
                total_allocated = sum(allocations.values())
                remaining = Decimal(str(data['amount'])) - total_allocated
                if remaining > 0:
                    allocations['common_expenses'] = remaining

            # Δημιουργία πληρωμής
            payment = service.create_payment(
                apartment_id=apartment_id,
                amount=Decimal(str(data['amount'])),
                payment_date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
                method=data['method'],
                reference_number=data.get('reference_number'),
                notes=data.get('notes'),
                allocations=allocations
            )

            # Audit log
            FinancialAuditLog.log_payment_action(
                user=request.user,
                action='CREATE',
                payment=payment,
                request=request
            )

            # Serialize και επιστροφή
            serializer = self.get_serializer(payment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Apartment.DoesNotExist:
            return Response(
                {'error': 'Το διαμέρισμα δεν βρέθηκε'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @db_transaction.atomic
    def update(self, request, pk=None):
        """Ενημέρωση πληρωμής μέσω PaymentService"""
        try:
            payment = self.get_object()
            building_id = payment.apartment.building_id

            service = PaymentService(building_id)

            # Ενημέρωση μέσω service
            updated_payment = service.update_payment(
                payment_id=payment.id,
                amount=Decimal(str(request.data['amount'])) if 'amount' in request.data else None,
                method=request.data.get('method'),
                reference_number=request.data.get('reference_number'),
                notes=request.data.get('notes')
            )

            # Audit log
            FinancialAuditLog.log_payment_action(
                user=request.user,
                action='UPDATE',
                payment=updated_payment,
                request=request
            )

            serializer = self.get_serializer(updated_payment)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @db_transaction.atomic
    def destroy(self, request, pk=None):
        """Διαγραφή πληρωμής μέσω PaymentService"""
        try:
            payment = self.get_object()
            building_id = payment.apartment.building_id

            # Audit log πριν τη διαγραφή
            FinancialAuditLog.log_payment_action(
                user=request.user,
                action='DELETE',
                payment=payment,
                request=request
            )

            service = PaymentService(building_id)
            service.delete_payment(payment.id)

            return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def balances(self, request):
        """Λήψη υπολοίπων διαμερισμάτων"""
        try:
            building_id = request.query_params.get('building_id')
            if not building_id:
                return Response(
                    {'error': 'Το building_id είναι υποχρεωτικό'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            calculator = BalanceCalculator(int(building_id))

            from apartments.models import Apartment
            apartments = Apartment.objects.filter(building_id=building_id)

            balances = []
            for apartment in apartments:
                balance_info = calculator.calculate_apartment_balance(apartment.id)
                balances.append({
                    'apartment_id': apartment.id,
                    'apartment_number': apartment.number,
                    'owner_name': apartment.owner_name,
                    **balance_info
                })

            return Response(balances)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def validate_balance(self, request):
        """Επικύρωση υπολοίπου διαμερίσματος"""
        try:
            apartment_id = request.data.get('apartment_id')
            if not apartment_id:
                return Response(
                    {'error': 'Το apartment_id είναι υποχρεωτικό'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            is_valid, validation_data = PaymentValidator.validate_apartment_balance(apartment_id)

            return Response({
                'is_valid': is_valid,
                'validation_data': validation_data
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def validate_payment(self, request, pk=None):
        """Επικύρωση ακεραιότητας πληρωμής"""
        try:
            payment = self.get_object()
            is_valid, errors = PaymentValidator.validate_payment_integrity(payment.id)

            return Response({
                'is_valid': is_valid,
                'errors': errors
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        """Μηνιαία σύνοψη πληρωμών"""
        try:
            building_id = request.query_params.get('building_id')
            month = request.query_params.get('month')  # Format: YYYY-MM

            if not building_id or not month:
                return Response(
                    {'error': 'building_id και month είναι υποχρεωτικά'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            year, month_num = map(int, month.split('-'))
            calculator = BalanceCalculator(int(building_id))

            from apartments.models import Apartment
            apartments = Apartment.objects.filter(building_id=building_id)

            summary = []
            total_charges = Decimal('0')
            total_payments = Decimal('0')
            total_debt = Decimal('0')

            for apartment in apartments:
                monthly_balance = calculator.calculate_monthly_balance(
                    apartment.id, year, month_num
                )

                summary.append({
                    'apartment_id': apartment.id,
                    'apartment_number': apartment.number,
                    'owner_name': apartment.owner_name,
                    **monthly_balance
                })

                total_charges += monthly_balance['month_charges']
                total_payments += monthly_balance['month_payments']
                if monthly_balance['ending_balance'] < 0:
                    total_debt += abs(monthly_balance['ending_balance'])

            return Response({
                'month': month,
                'apartments': summary,
                'totals': {
                    'total_charges': total_charges,
                    'total_payments': total_payments,
                    'total_debt': total_debt,
                    'collection_rate': (total_payments / total_charges * 100) if total_charges > 0 else 0
                }
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def refresh_balances(self, request):
        """Ανανέωση υπολοίπων όλων των διαμερισμάτων"""
        try:
            building_id = request.data.get('building_id')
            if not building_id:
                return Response(
                    {'error': 'Το building_id είναι υποχρεωτικό'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            from apartments.models import Apartment
            from .models import Transaction
            from django.db.models import Sum

            apartments = Apartment.objects.filter(building_id=building_id)
            updated_count = 0

            # Use BalanceCalculationService for consistent balance calculation
            from financial.balance_service import BalanceCalculationService

            for apartment in apartments:
                old_balance = apartment.current_balance or Decimal('0.00')
                new_balance = BalanceCalculationService.update_apartment_balance(apartment, use_locking=True)

                if old_balance != new_balance:
                    updated_count += 1

            return Response({
                'success': True,
                'updated_apartments': updated_count,
                'message': f'Ενημερώθηκαν {updated_count} διαμερίσματα'
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def methods(self, request):
        """Λήψη διαθέσιμων μεθόδων πληρωμής"""
        methods = [
            {'value': choice[0], 'label': choice[1]}
            for choice in Payment.PAYMENT_METHODS
        ]
        return Response(methods)