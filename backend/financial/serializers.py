from rest_framework import serializers
from .models import Payment, FinancialReceipt, BuildingAccount, FinancialTransaction
from apartments.models import Apartment
from buildings.models import Building


class PaymentSerializer(serializers.ModelSerializer):
    apartment_number = serializers.CharField(source='apartment.number', read_only=True)
    apartment_identifier = serializers.CharField(source='apartment.identifier', read_only=True)
    building_name = serializers.CharField(source='apartment.building.name', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'apartment', 'apartment_number', 'apartment_identifier', 'building_name',
            'payment_type', 'payment_type_display', 'amount', 'due_date', 'status',
            'status_display', 'payment_date', 'amount_paid', 'payment_method',
            'reference_number', 'notes', 'is_overdue', 'remaining_amount',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


class FinancialReceiptSerializer(serializers.ModelSerializer):
    payment_info = serializers.CharField(source='payment.__str__', read_only=True)
    apartment_number = serializers.CharField(source='payment.apartment.number', read_only=True)
    receipt_type_display = serializers.CharField(source='get_receipt_type_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = FinancialReceipt
        fields = [
            'id', 'payment', 'payment_info', 'apartment_number', 'receipt_type',
            'receipt_type_display', 'amount', 'receipt_date', 'receipt_file',
            'reference_number', 'notes', 'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']


class BuildingAccountSerializer(serializers.ModelSerializer):
    account_type_display = serializers.CharField(source='get_account_type_display', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)

    class Meta:
        model = BuildingAccount
        fields = [
            'id', 'building', 'building_name', 'account_type', 'account_type_display',
            'account_number', 'bank_name', 'current_balance', 'description',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FinancialTransactionSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    account_info = serializers.CharField(source='account.__str__', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = FinancialTransaction
        fields = [
            'id', 'building', 'building_name', 'account', 'account_info',
            'transaction_type', 'transaction_type_display', 'amount', 'description',
            'transaction_date', 'reference_number', 'category', 'notes',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']


class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'apartment', 'payment_type', 'amount', 'due_date', 'status',
            'payment_date', 'amount_paid', 'payment_method', 'reference_number', 'notes'
        ]

    def validate(self, data):
        # Έλεγχος ότι το ποσό που πληρώθηκε δεν υπερβαίνει το συνολικό ποσό
        if data.get('amount_paid', 0) > data.get('amount', 0):
            raise serializers.ValidationError("Το ποσό που πληρώθηκε δεν μπορεί να υπερβαίνει το συνολικό ποσό")
        
        # Έλεγχος ότι αν έχει πληρωθεί, έχει ημερομηνία πληρωμής
        if data.get('amount_paid', 0) > 0 and not data.get('payment_date'):
            raise serializers.ValidationError("Πρέπει να καθορίσετε ημερομηνία πληρωμής")
        
        return data


class FinancialTransactionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialTransaction
        fields = [
            'building', 'account', 'transaction_type', 'amount', 'description',
            'transaction_date', 'reference_number', 'category', 'notes'
        ]

    def validate(self, data):
        # Έλεγχος ότι το λογαριασμός ανήκει στο κτίριο
        if data['account'].building != data['building']:
            raise serializers.ValidationError("Ο λογαριασμός πρέπει να ανήκει στο επιλεγμένο κτίριο")
        
        return data 