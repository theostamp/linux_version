# Generated manually for cascade delete improvements
# Αφαιρεί το single project ForeignKey και κρατά μόνο το projects ManyToManyField

from django.db import migrations, models


def migrate_project_to_projects(apps, schema_editor):
    """
    Μεταφέρει υπάρχοντα δεδομένα από το project ForeignKey στο projects ManyToMany
    """
    Announcement = apps.get_model('announcements', 'Announcement')
    
    # Βρες όλες τις ανακοινώσεις που έχουν project (single)
    announcements_with_project = Announcement.objects.exclude(project__isnull=True)
    
    count = 0
    for announcement in announcements_with_project:
        # Πρόσθεσε το project στο projects ManyToMany (αν δεν υπάρχει ήδη)
        if announcement.project and announcement.project not in announcement.projects.all():
            announcement.projects.add(announcement.project)
            count += 1
    
    if count > 0:
        print(f"✅ Migrated {count} announcements: single project → projects ManyToMany")


class Migration(migrations.Migration):

    dependencies = [
        ('announcements', '0006_announcement_projects'),
        ('projects', '0006_alter_projectvote_offer_alter_projectvote_project'),
    ]

    operations = [
        # Step 1: Μεταφορά δεδομένων από project → projects
        migrations.RunPython(
            migrate_project_to_projects,
            reverse_code=migrations.RunPython.noop,
        ),
        
        # Step 2: Ενημέρωση related_name του projects ManyToMany
        # (αλλαγή από 'assembly_announcements' σε 'announcements')
        migrations.AlterField(
            model_name='announcement',
            name='projects',
            field=models.ManyToManyField(
                blank=True,
                help_text='Έργα που σχετίζονται με την ανακοίνωση (διαγράφονται CASCADE όταν διαγραφεί έργο)',
                related_name='announcements',
                to='projects.project'
            ),
        ),
        
        # Step 3: Αφαίρεση του single project ForeignKey
        migrations.RemoveField(
            model_name='announcement',
            name='project',
        ),
    ]

