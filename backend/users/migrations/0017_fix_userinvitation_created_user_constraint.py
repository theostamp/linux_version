# Generated migration to fix UserInvitation.created_user constraint

from django.db import migrations, connection


def fix_created_user_constraint(apps, schema_editor):
    """Fix the created_user foreign key constraint to use SET NULL on delete"""
    with connection.cursor() as cursor:
        # Find the constraint name for created_user_id
        cursor.execute("""
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public' 
            AND tc.table_name = 'users_userinvitation' 
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'created_user_id';
        """)
        
        constraint = cursor.fetchone()
        
        if constraint:
            constraint_name = constraint[0]
            # Drop the old constraint
            cursor.execute(f"""
                ALTER TABLE users_userinvitation 
                DROP CONSTRAINT IF EXISTS {constraint_name};
            """)
            
            # Recreate with SET NULL
            cursor.execute("""
                ALTER TABLE users_userinvitation 
                ADD CONSTRAINT users_userinvitation_created_user_id_fk 
                FOREIGN KEY (created_user_id) 
                REFERENCES users_customuser(id) 
                ON DELETE SET NULL;
            """)


def reverse_fix_created_user_constraint(apps, schema_editor):
    """Reverse migration - restore original constraint"""
    with connection.cursor() as cursor:
        # Drop the new constraint
        cursor.execute("""
            ALTER TABLE users_userinvitation 
            DROP CONSTRAINT IF EXISTS users_userinvitation_created_user_id_fk;
        """)
        
        # Recreate with CASCADE (original behavior)
        cursor.execute("""
            ALTER TABLE users_userinvitation 
            ADD CONSTRAINT users_userinvitation_created_user_id_fk 
            FOREIGN KEY (created_user_id) 
            REFERENCES users_customuser(id) 
            ON DELETE CASCADE;
        """)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0016_internal_manager_framework'),
    ]

    operations = [
        migrations.RunPython(
            fix_created_user_constraint,
            reverse_fix_created_user_constraint,
        ),
    ]

