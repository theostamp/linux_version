from django.db import migrations


class Migration(migrations.Migration):
    """
    Fix: users_customuser.username exists in model/state (via state-only migration 0013),
    but the DB column was never created. This migration adds the column safely.
    """

    dependencies = [
        ("users", "0022_add_tenant_schema_name_to_invitation"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE public.users_customuser
                    ADD COLUMN IF NOT EXISTS username VARCHAR(150) NOT NULL DEFAULT '';

                    UPDATE public.users_customuser
                    SET username = email
                    WHERE username = '' OR username IS NULL;
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                )
            ],
            state_operations=[],
        )
    ]


