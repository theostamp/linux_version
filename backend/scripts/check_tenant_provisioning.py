#!/usr/bin/env python
"""
Check tenant provisioning status in public schema database.
Executes SQL queries to verify user-tenant mappings and schema existence.
"""
import os
import sys
import django
from django.db import connection

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from users.models import CustomUser
from tenants.models import Client


def check_user_tenant_mapping(email):
    """
    Check user-tenant mapping in public schema.
    
    Args:
        email (str): User email to check
    
    Returns:
        dict: User and tenant information
    """
    result = {
        'email': email,
        'user_found': False,
        'user_id': None,
        'tenant_id': None,
        'tenant_schema': None,
        'has_tenant': False,
        'status': 'not_found'
    }
    
    try:
        user = CustomUser.objects.get(email=email)
        result['user_found'] = True
        result['user_id'] = user.id
        
        if user.tenant:
            result['has_tenant'] = True
            result['tenant_id'] = user.tenant_id
            result['tenant_schema'] = user.tenant.schema_name
            result['status'] = 'provisioned'
        else:
            result['status'] = 'no_tenant'
            
    except CustomUser.DoesNotExist:
        result['status'] = 'user_not_found'
    
    return result


def check_schema_exists(schema_name):
    """
    Check if tenant schema exists in tenants_client table.
    
    Args:
        schema_name (str): Schema name to check
    
    Returns:
        dict: Schema existence and details
    """
    result = {
        'schema_name': schema_name,
        'exists': False,
        'tenant_id': None,
        'tenant_name': None,
        'is_active': None
    }
    
    try:
        tenant = Client.objects.get(schema_name=schema_name)
        result['exists'] = True
        result['tenant_id'] = tenant.id
        result['tenant_name'] = tenant.name
        result['is_active'] = tenant.is_active
    except Client.DoesNotExist:
        pass
    
    return result


def execute_raw_query(query, params=None):
    """
    Execute raw SQL query in public schema.
    
    Args:
        query (str): SQL query to execute
        params (list, optional): Query parameters
    
    Returns:
        list: Query results
    """
    with connection.cursor() as cursor:
        cursor.execute(query, params or [])
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def check_user_with_sql(email):
    """
    Check user using raw SQL query.
    
    Args:
        email (str): User email
    
    Returns:
        list: Query results
    """
    query = """
        SELECT id, email, tenant_id, is_active, is_staff, role
        FROM users_customuser
        WHERE email = %s
    """
    return execute_raw_query(query, [email])


def check_schema_with_sql(schema_name):
    """
    Check tenant schema using raw SQL query.
    
    Args:
        schema_name (str): Schema name
    
    Returns:
        list: Query results
    """
    query = """
        SELECT id, schema_name, name, is_active, paid_until, on_trial
        FROM tenants_client
        WHERE schema_name = %s
    """
    return execute_raw_query(query, [schema_name])


def check_all_pending_provisioning():
    """
    Check all users with checkout sessions but no tenant.
    
    Returns:
        dict: Summary of pending provisioning
    """
    query = """
        SELECT 
            u.id,
            u.email,
            u.stripe_checkout_session_id,
            u.tenant_id,
            u.created_at
        FROM users_customuser u
        WHERE u.stripe_checkout_session_id IS NOT NULL
          AND u.tenant_id IS NULL
        ORDER BY u.created_at DESC
    """
    
    results = execute_raw_query(query)
    
    return {
        'pending_count': len(results),
        'users': results
    }


def print_user_status(user_result):
    """Print formatted user status."""
    print("\n" + "=" * 80)
    print("USER-TENANT MAPPING STATUS")
    print("=" * 80)
    print(f"Email: {user_result['email']}")
    print(f"User Found: {user_result['user_found']}")
    
    if user_result['user_found']:
        print(f"User ID: {user_result['user_id']}")
        print(f"Has Tenant: {user_result['has_tenant']}")
        
        if user_result['has_tenant']:
            print(f"✅ Tenant ID: {user_result['tenant_id']}")
            print(f"✅ Tenant Schema: {user_result['tenant_schema']}")
            print(f"Status: PROVISIONED")
        else:
            print(f"❌ No tenant assigned (tenant_id is NULL)")
            print(f"Status: NOT PROVISIONED")
    else:
        print(f"❌ User not found")
        print(f"Status: USER_NOT_FOUND")
    
    print("=" * 80)


def print_schema_status(schema_result):
    """Print formatted schema status."""
    print("\n" + "=" * 80)
    print("TENANT SCHEMA STATUS")
    print("=" * 80)
    print(f"Schema Name: {schema_result['schema_name']}")
    
    if schema_result['exists']:
        print(f"✅ Schema EXISTS")
        print(f"   Tenant ID: {schema_result['tenant_id']}")
        print(f"   Tenant Name: {schema_result['tenant_name']}")
        print(f"   Active: {schema_result['is_active']}")
    else:
        print(f"❌ Schema DOES NOT EXIST")
        print(f"   Webhook may not have created the schema yet")
    
    print("=" * 80)


def print_pending_summary(pending_result):
    """Print formatted summary of pending provisioning."""
    print("\n" + "=" * 80)
    print("PENDING PROVISIONING SUMMARY")
    print("=" * 80)
    print(f"Total Pending: {pending_result['pending_count']}")
    
    if pending_result['pending_count'] > 0:
        print("\nUsers with checkout sessions but no tenant:")
        for user in pending_result['users']:
            print(f"\n  - {user['email']}")
            print(f"    User ID: {user['id']}")
            print(f"    Session ID: {user['stripe_checkout_session_id']}")
            print(f"    Created: {user['created_at']}")
    
    print("=" * 80)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Check tenant provisioning status in database'
    )
    parser.add_argument(
        '--email',
        help='Check user-tenant mapping for specific email'
    )
    parser.add_argument(
        '--schema',
        help='Check if tenant schema exists'
    )
    parser.add_argument(
        '--pending',
        action='store_true',
        help='List all users pending provisioning'
    )
    parser.add_argument(
        '--sql',
        action='store_true',
        help='Use raw SQL queries instead of ORM'
    )
    
    args = parser.parse_args()
    
    if args.pending:
        pending_result = check_all_pending_provisioning()
        print_pending_summary(pending_result)
        return
    
    if args.email:
        if args.sql:
            # Use raw SQL
            sql_results = check_user_with_sql(args.email)
            if sql_results:
                user_data = sql_results[0]
                print("\n" + "=" * 80)
                print("USER QUERY (SQL)")
                print("=" * 80)
                for key, value in user_data.items():
                    print(f"{key}: {value}")
                
                if user_data['tenant_id']:
                    print(f"\n✅ User has tenant_id: {user_data['tenant_id']}")
                    
                    # Check tenant schema
                    schema_query = f"SELECT schema_name FROM tenants_client WHERE id = %s"
                    schema_results = execute_raw_query(schema_query, [user_data['tenant_id']])
                    if schema_results:
                        print(f"✅ Tenant schema: {schema_results[0]['schema_name']}")
                    else:
                        print(f"❌ Tenant ID exists but schema not found in tenants_client")
                else:
                    print(f"\n❌ User has NULL tenant_id - provisioning not complete")
            else:
                print(f"❌ User {args.email} not found")
        else:
            # Use ORM
            user_result = check_user_tenant_mapping(args.email)
            print_user_status(user_result)
            
            # Also check schema if tenant exists
            if user_result['has_tenant']:
                schema_result = check_schema_exists(user_result['tenant_schema'])
                print_schema_status(schema_result)
    
    elif args.schema:
        if args.sql:
            # Use raw SQL
            sql_results = check_schema_with_sql(args.schema)
            if sql_results:
                schema_data = sql_results[0]
                print("\n" + "=" * 80)
                print("SCHEMA QUERY (SQL)")
                print("=" * 80)
                for key, value in schema_data.items():
                    print(f"{key}: {value}")
            else:
                print(f"❌ Schema {args.schema} not found")
        else:
            # Use ORM
            schema_result = check_schema_exists(args.schema)
            print_schema_status(schema_result)
    
    else:
        parser.print_help()
        print("\nExamples:")
        print("  python check_tenant_provisioning.py --email user@example.com")
        print("  python check_tenant_provisioning.py --schema tenant-name")
        print("  python check_tenant_provisioning.py --pending")
        print("  python check_tenant_provisioning.py --email user@example.com --sql")


if __name__ == '__main__':
    main()

