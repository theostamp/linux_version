"""
Office Finance Serializers
"""

from rest_framework import serializers
from .models import (
    OfficeExpenseCategory,
    OfficeIncomeCategory,
    OfficeExpense,
    OfficeIncome,
    OfficeFinancialSummary
)


class OfficeExpenseCategorySerializer(serializers.ModelSerializer):
    group_type_display = serializers.CharField(
        source='get_group_type_display',
        read_only=True
    )
    category_type_display = serializers.CharField(
        source='get_category_type_display',
        read_only=True
    )

    class Meta:
        model = OfficeExpenseCategory
        fields = [
            'id', 'name',
            'group_type', 'group_type_display',
            'category_type', 'category_type_display',
            'icon', 'color', 'description', 'display_order',
            'is_active', 'is_system'
        ]
        read_only_fields = ['is_system']


class OfficeIncomeCategorySerializer(serializers.ModelSerializer):
    group_type_display = serializers.CharField(
        source='get_group_type_display',
        read_only=True
    )
    category_type_display = serializers.CharField(
        source='get_category_type_display',
        read_only=True
    )

    class Meta:
        model = OfficeIncomeCategory
        fields = [
            'id', 'name',
            'group_type', 'group_type_display',
            'category_type', 'category_type_display',
            'icon', 'color', 'description', 'display_order',
            'links_to_management_expense',
            'is_active', 'is_system'
        ]
        read_only_fields = ['is_system']


class OfficeExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_type = serializers.CharField(source='category.category_type', read_only=True)
    payment_method_display = serializers.CharField(
        source='get_payment_method_display',
        read_only=True
    )
    recurrence_display = serializers.CharField(
        source='get_recurrence_display',
        read_only=True
    )
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OfficeExpense
        fields = [
            'id', 'title', 'description', 'amount', 'date',
            'category', 'category_name', 'category_type',
            'payment_method', 'payment_method_display',
            'is_paid', 'paid_date',
            'recurrence', 'recurrence_display',
            'supplier_name', 'supplier_vat',
            'document', 'document_number',
            'notes',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, attrs):
        """
        Prevent duplicate office expense entries when supplier_vat + document_number are provided.
        """
        supplier_vat = (
            attrs.get('supplier_vat')
            if 'supplier_vat' in attrs
            else getattr(self.instance, 'supplier_vat', '')
        )
        document_number = (
            attrs.get('document_number')
            if 'document_number' in attrs
            else getattr(self.instance, 'document_number', '')
        )

        if isinstance(supplier_vat, str):
            supplier_vat = supplier_vat.strip()
            if 'supplier_vat' in attrs:
                attrs['supplier_vat'] = supplier_vat
        if isinstance(document_number, str):
            document_number = document_number.strip()
            if 'document_number' in attrs:
                attrs['document_number'] = document_number

        if supplier_vat and document_number:
            qs = OfficeExpense.objects.filter(
                supplier_vat__iexact=supplier_vat,
                document_number__iexact=document_number,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'document_number': 'Υπάρχει ήδη έξοδο με ίδιο ΑΦΜ προμηθευτή και αριθμό παραστατικού.'}
                )

        return attrs


class OfficeIncomeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_type = serializers.CharField(source='category.category_type', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(
        source='get_payment_method_display',
        read_only=True
    )
    recurrence_display = serializers.CharField(
        source='get_recurrence_display',
        read_only=True
    )
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OfficeIncome
        fields = [
            'id', 'title', 'description', 'amount', 'date',
            'category', 'category_name', 'category_type',
            'building', 'building_name',
            'status', 'status_display',
            'payment_method', 'payment_method_display',
            'received_date',
            'recurrence', 'recurrence_display',
            'client_name', 'client_vat',
            'document', 'invoice_number',
            'notes',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, attrs):
        """
        Prevent duplicate office income entries when invoice_number is provided.
        """
        invoice_number = (
            attrs.get('invoice_number')
            if 'invoice_number' in attrs
            else getattr(self.instance, 'invoice_number', '')
        )
        if isinstance(invoice_number, str):
            invoice_number = invoice_number.strip()
            if 'invoice_number' in attrs:
                attrs['invoice_number'] = invoice_number

        if invoice_number:
            qs = OfficeIncome.objects.filter(invoice_number__iexact=invoice_number)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'invoice_number': 'Υπάρχει ήδη έσοδο με αυτόν τον αριθμό τιμολογίου.'}
                )

        return attrs


class OfficeFinancialSummarySerializer(serializers.ModelSerializer):
    period_display = serializers.CharField(read_only=True)

    class Meta:
        model = OfficeFinancialSummary
        fields = [
            'id', 'year', 'month', 'period_display',
            'total_income', 'total_expenses', 'net_result',
            'income_by_category', 'expenses_by_category',
            'income_by_building',
            'is_closed', 'closed_at', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'total_income', 'total_expenses', 'net_result',
            'income_by_category', 'expenses_by_category',
            'income_by_building', 'created_at', 'updated_at'
        ]


class OfficeDashboardSerializer(serializers.Serializer):
    """
    Serializer για το dashboard οικονομικών γραφείου.
    """

    # Σύνοψη τρέχοντος μήνα
    current_month = serializers.DictField()

    # Σύγκριση με προηγούμενο μήνα
    previous_month = serializers.DictField()

    # Τελευταίες κινήσεις
    recent_expenses = OfficeExpenseSerializer(many=True)
    recent_incomes = OfficeIncomeSerializer(many=True)

    # Εκκρεμή έσοδα
    pending_incomes = OfficeIncomeSerializer(many=True)

    # Ανάλυση ανά κτίριο
    income_by_building = serializers.ListField()

    # Ετήσια σύνοψη
    yearly_summary = serializers.DictField()

