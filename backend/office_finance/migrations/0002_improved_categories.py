# Generated manually for improved categories

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('office_finance', '0001_initial'),
    ]

    operations = [
        # Add group_type to OfficeExpenseCategory
        migrations.AddField(
            model_name='officeexpensecategory',
            name='group_type',
            field=models.CharField(
                choices=[
                    ('fixed', 'Πάγια Έξοδα'),
                    ('operational', 'Λειτουργικά Έξοδα'),
                    ('collaborators', 'Συνεργάτες & Εξωτερικοί'),
                    ('suppliers', 'Προμηθευτές'),
                    ('staff', 'Προσωπικό'),
                    ('taxes_legal', 'Φόροι & Νομικά'),
                    ('other', 'Λοιπά'),
                ],
                default='other',
                max_length=20,
                verbose_name='Ομάδα Κατηγορίας'
            ),
        ),
        migrations.AddField(
            model_name='officeexpensecategory',
            name='description',
            field=models.TextField(blank=True, verbose_name='Περιγραφή'),
        ),
        migrations.AddField(
            model_name='officeexpensecategory',
            name='display_order',
            field=models.PositiveIntegerField(default=0, verbose_name='Σειρά Εμφάνισης'),
        ),
        migrations.AlterField(
            model_name='officeexpensecategory',
            name='category_type',
            field=models.CharField(
                choices=[
                    ('rent', 'Ενοίκιο Γραφείου'),
                    ('common_charges', 'Κοινόχρηστα Γραφείου'),
                    ('insurance', 'Ασφάλειες'),
                    ('equipment_depreciation', 'Αποσβέσεις Εξοπλισμού'),
                    ('utilities', 'Πάγιοι Λογαριασμοί (ΔΕΗ/Νερό/Τηλ)'),
                    ('office_supplies', 'Γραφική Ύλη & Αναλώσιμα'),
                    ('platform', 'Πλατφόρμα & Λογισμικό'),
                    ('equipment', 'Εξοπλισμός'),
                    ('maintenance', 'Συντήρηση & Επισκευές'),
                    ('transport', 'Μετακινήσεις & Καύσιμα'),
                    ('accountant', 'Λογιστής'),
                    ('lawyer', 'Δικηγόρος'),
                    ('technical_consultant', 'Τεχνικός Σύμβουλος'),
                    ('external_services', 'Εξωτερικές Υπηρεσίες'),
                    ('supplier_materials', 'Υλικά & Προμήθειες'),
                    ('supplier_services', 'Υπηρεσίες Προμηθευτών'),
                    ('subcontractors', 'Υπεργολάβοι'),
                    ('salaries', 'Μισθοδοσία'),
                    ('social_security', 'Ασφαλιστικές Εισφορές'),
                    ('benefits', 'Παροχές Προσωπικού'),
                    ('taxes', 'Φόροι & Τέλη'),
                    ('legal_fees', 'Νομικά Έξοδα'),
                    ('fines', 'Πρόστιμα'),
                    ('marketing', 'Marketing & Διαφήμιση'),
                    ('events', 'Εκδηλώσεις'),
                    ('bank_fees', 'Τραπεζικά Έξοδα'),
                    ('other', 'Λοιπά Έξοδα'),
                ],
                default='other',
                max_length=30,
                verbose_name='Τύπος Κατηγορίας'
            ),
        ),
        
        # Add group_type to OfficeIncomeCategory
        migrations.AddField(
            model_name='officeincomecategory',
            name='group_type',
            field=models.CharField(
                choices=[
                    ('building_fees', 'Αμοιβές Κτιρίων'),
                    ('services', 'Υπηρεσίες'),
                    ('commissions', 'Προμήθειες'),
                    ('other', 'Λοιπά'),
                ],
                default='other',
                max_length=20,
                verbose_name='Ομάδα Κατηγορίας'
            ),
        ),
        migrations.AddField(
            model_name='officeincomecategory',
            name='description',
            field=models.TextField(blank=True, verbose_name='Περιγραφή'),
        ),
        migrations.AddField(
            model_name='officeincomecategory',
            name='display_order',
            field=models.PositiveIntegerField(default=0, verbose_name='Σειρά Εμφάνισης'),
        ),
        migrations.AddField(
            model_name='officeincomecategory',
            name='links_to_management_expense',
            field=models.BooleanField(
                default=False,
                help_text='Αν ενεργοποιηθεί, τα έσοδα αυτής της κατηγορίας θα αντιστοιχούν στις δαπάνες διαχείρισης κτιρίων',
                verbose_name='Συνδέεται με Δαπάνες Διαχείρισης'
            ),
        ),
        migrations.AlterField(
            model_name='officeincomecategory',
            name='category_type',
            field=models.CharField(
                choices=[
                    ('management_fee_monthly', 'Αμοιβή Διαχείρισης (Μηνιαία)'),
                    ('management_fee_annual', 'Αμοιβή Διαχείρισης (Ετήσια)'),
                    ('special_assembly_fee', 'Αμοιβή Έκτακτης Γ.Σ.'),
                    ('audit_fee', 'Αμοιβή Ελέγχου/Απολογισμού'),
                    ('certificate_issue', 'Έκδοση Πιστοποιητικών'),
                    ('assembly_attendance', 'Παράσταση σε Γ.Σ.'),
                    ('technical_advice', 'Τεχνική Συμβουλή'),
                    ('mediation', 'Διαμεσολάβηση'),
                    ('document_preparation', 'Σύνταξη Εγγράφων'),
                    ('project_supervision', 'Επίβλεψη Έργων'),
                    ('contractor_commission', 'Προμήθεια Συνεργείου'),
                    ('supplier_commission', 'Προμήθεια Προμηθευτή'),
                    ('insurance_commission', 'Προμήθεια Ασφάλειας'),
                    ('interest_income', 'Τόκοι Καταθέσεων'),
                    ('late_payment_fees', 'Προσαυξήσεις Καθυστέρησης'),
                    ('other', 'Λοιπά Έσοδα'),
                ],
                default='other',
                max_length=30,
                verbose_name='Τύπος Κατηγορίας'
            ),
        ),
        
        # Update ordering
        migrations.AlterModelOptions(
            name='officeexpensecategory',
            options={
                'ordering': ['group_type', 'display_order', 'name'],
                'verbose_name': 'Κατηγορία Εξόδων Γραφείου',
                'verbose_name_plural': 'Κατηγορίες Εξόδων Γραφείου'
            },
        ),
        migrations.AlterModelOptions(
            name='officeincomecategory',
            options={
                'ordering': ['group_type', 'display_order', 'name'],
                'verbose_name': 'Κατηγορία Εσόδων Γραφείου',
                'verbose_name_plural': 'Κατηγορίες Εσόδων Γραφείου'
            },
        ),
    ]

