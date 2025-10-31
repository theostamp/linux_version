import logging

from django.db import connection
from django.db.utils import DatabaseError, OperationalError, ProgrammingError
from django_tenants.utils import get_public_schema_name


logger = logging.getLogger(__name__)


def resident_table_exists() -> bool:
    """Check if the residents_resident table exists in the current schema.

    In the public schema (or when schema is unknown) the Resident table is not available,
    so we skip any lookups to avoid UndefinedTable errors. We explicitly ping Postgres via
    to_regclass which is safe and cheap.
    """

    current_schema = getattr(connection, "schema_name", None)
    public_schema = get_public_schema_name()

    if not current_schema or current_schema == public_schema:
        # Public schema (or schema not initialised) never contains resident data.
        return False

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT to_regclass(%s)", ["residents_resident"])
            result = cursor.fetchone()
            return bool(result and result[0])
    except (ProgrammingError, OperationalError, DatabaseError) as exc:
        logger.debug(
            "resident_table_exists check failed in schema '%s': %s",
            current_schema,
            exc,
        )
        return False
    except Exception as exc:  # pragma: no cover - defensive guard
        logger.debug(
            "Unexpected error during resident table existence check in schema '%s': %s",
            current_schema,
            exc,
        )
        return False

