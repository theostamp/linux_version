"""
Building Context Mixin για DRF ViewSets

Παρέχει automatic building context resolution και filtering για ViewSets.

Usage:
    from buildings.mixins import BuildingContextMixin
    
    class ExpenseViewSet(BuildingContextMixin, viewsets.ModelViewSet):
        queryset = Expense.objects.all()
        serializer_class = ExpenseSerializer
        building_required = True  # Default: True
        
        def list(self, request):
            building = self.get_building_context()
            # building είναι BuildingDTO με permissions
            queryset = self.get_queryset()  # Auto-filtered με building
            ...
"""

from rest_framework import viewsets
from .services import BuildingService
from .dto import BuildingDTO


class BuildingContextMixin:
    """
    Mixin για DRF ViewSets που χρειάζονται building context.
    
    Features:
    - Automatic building resolution από request
    - Auto-filtering του queryset με το building
    - Caching του building context στο request
    - Configurable building requirement
    
    Attributes:
        building_required (bool): Αν True, το building είναι υποχρεωτικό.
                                  Default: True
        building_field_name (str): Το field name στο model για το building.
                                   Default: 'building'
        auto_filter_by_building (bool): Αν True, φιλτράρει αυτόματα το queryset.
                                        Default: True
    
    Examples:
        # Basic usage
        class MyViewSet(BuildingContextMixin, viewsets.ModelViewSet):
            queryset = MyModel.objects.all()
            
            def list(self, request):
                building = self.get_building_context()
                # queryset is already filtered by building
                ...
        
        # Optional building
        class MyViewSet(BuildingContextMixin, viewsets.ModelViewSet):
            building_required = False
            
            def list(self, request):
                building = self.get_building_context()
                if building:
                    # Filter by building
                else:
                    # Show all (for superusers)
                ...
        
        # Custom building field name
        class MyViewSet(BuildingContextMixin, viewsets.ModelViewSet):
            building_field_name = 'related_building'
            ...
    """
    
    # Configuration attributes (override in ViewSet)
    building_required = True
    building_field_name = 'building'
    auto_filter_by_building = True
    
    def get_building_context(self) -> BuildingDTO:
        """
        Επιστρέφει το BuildingDTO για το τρέχον request.
        
        Caching:
            Το building context cached στο request για performance.
            Multiple calls σε ένα request επιστρέφουν το ίδιο instance.
        
        Returns:
            BuildingDTO με permissions
        
        Raises:
            ValidationError: Αν building_required=True και δεν βρεθεί building
            PermissionDenied: Αν ο user δεν έχει πρόσβαση
        
        Examples:
            def my_action(self, request):
                building = self.get_building_context()
                print(f"Building: {building.name}")
                print(f"Can edit: {building.permissions.can_edit}")
        """
        if not hasattr(self.request, '_building_context'):
            self.request._building_context = BuildingService.resolve_building_from_request(
                self.request,
                required=self.building_required
            )
        return self.request._building_context
    
    def get_queryset(self):
        """
        Override του default get_queryset για auto-filtering με building.
        
        Λογική:
        - Αν το model έχει building field και auto_filter_by_building=True:
          φιλτράρει αυτόματα με το building από context
        - Αν building_required=False και δεν υπάρχει building:
          επιστρέφει το queryset χωρίς φιλτράρισμα
        - Καλεί το parent get_queryset() για να σεβαστεί άλλα filters
        
        Returns:
            Filtered QuerySet
        
        Examples:
            # Auto-filtering by building
            class ExpenseViewSet(BuildingContextMixin, viewsets.ModelViewSet):
                queryset = Expense.objects.all()
                # get_queryset() θα επιστρέψει μόνο expenses για το current building
        """
        # Get base queryset από parent
        queryset = super().get_queryset()
        
        # Check αν το model έχει building field
        model = queryset.model
        has_building_field = hasattr(model, self.building_field_name)
        
        if not has_building_field or not self.auto_filter_by_building:
            # No building field ή auto-filtering disabled
            return queryset
        
        # Get building context
        building = self.get_building_context()
        
        if building:
            # Filter by building
            filter_kwargs = {f'{self.building_field_name}_id': building.id}
            queryset = queryset.filter(**filter_kwargs)
        else:
            # Building not required και δεν βρέθηκε
            # Return unfiltered (για superusers που βλέπουν όλα)
            pass
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Override perform_create για auto-set του building στο instance.
        
        Αν το model έχει building field και δεν έχει οριστεί,
        το ορίζει αυτόματα από το building context.
        
        Examples:
            # Automatic building assignment
            class ExpenseViewSet(BuildingContextMixin, viewsets.ModelViewSet):
                # Όταν δημιουργείται expense, το building ορίζεται αυτόματα
                pass
        """
        building = self.get_building_context()
        
        # Αν το model έχει building field και δεν έχει οριστεί
        if building and hasattr(serializer.Meta.model, self.building_field_name):
            # Check αν έχει ήδη οριστεί στο validated_data
            if self.building_field_name not in serializer.validated_data:
                # Auto-set το building
                serializer.save(**{self.building_field_name: building})
                return
        
        # Default behavior
        serializer.save()
    
    def get_serializer_context(self):
        """
        Override get_serializer_context για προσθήκη building στο context.
        
        Το building προστίθεται στο serializer context με key 'building_context'.
        Χρήσιμο για serializers που χρειάζονται το building για validation ή
        για calculated fields.
        
        Returns:
            dict με 'building_context' key
        
        Examples:
            # In a serializer
            class ExpenseSerializer(serializers.ModelSerializer):
                def validate(self, data):
                    building = self.context.get('building_context')
                    if building:
                        # Use building for validation
                        ...
        """
        context = super().get_serializer_context()
        
        # Add building context (may be None if not required)
        building = self.get_building_context()
        context['building_context'] = building
        
        return context


class OptionalBuildingContextMixin(BuildingContextMixin):
    """
    Variant του BuildingContextMixin όπου το building ΔΕΝ είναι required.
    
    Χρήσιμο για views που μπορούν να δουλέψουν με ή χωρίς building context.
    
    Examples:
        # Dashboard που μπορεί να δείχνει όλα τα buildings ή ένα συγκεκριμένο
        class DashboardViewSet(OptionalBuildingContextMixin, viewsets.ViewSet):
            def list(self, request):
                building = self.get_building_context()
                if building:
                    # Show data for specific building
                    data = get_building_data(building.id)
                else:
                    # Show aggregated data for all buildings
                    data = get_all_buildings_data()
                return Response(data)
    """
    
    building_required = False


class ReadOnlyBuildingContextMixin(BuildingContextMixin):
    """
    Variant του BuildingContextMixin για read-only operations.
    
    Δεν override το perform_create() γιατί δεν υπάρχουν write operations.
    Χρήσιμο για ReadOnlyModelViewSet.
    
    Examples:
        class ReportViewSet(ReadOnlyBuildingContextMixin, viewsets.ReadOnlyModelViewSet):
            queryset = Report.objects.all()
            # Auto-filtered by building, read-only
    """
    
    def perform_create(self, serializer):
        """Override to prevent modifications"""
        raise NotImplementedError("This ViewSet is read-only")
    
    def perform_update(self, serializer):
        """Override to prevent modifications"""
        raise NotImplementedError("This ViewSet is read-only")
    
    def perform_destroy(self, instance):
        """Override to prevent modifications"""
        raise NotImplementedError("This ViewSet is read-only")

