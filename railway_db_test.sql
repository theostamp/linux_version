-- Railway Database Test Script
-- Run with: railway connect < railway_db_test.sql

-- Check Public Schema
\echo '=== PUBLIC SCHEMA USERS ==='
SET search_path TO public;
SELECT email, is_superuser, is_staff, role, is_active 
FROM users_customuser 
ORDER BY email;

\echo '=== TENANTS ==='
SELECT schema_name, name, is_active, paid_until 
FROM tenants_client 
ORDER BY schema_name;

\echo '=== DOMAINS ==='
SELECT domain, tenant_id, is_primary 
FROM tenants_domain 
ORDER BY domain;

\echo '=== SUBSCRIPTION PLANS ==='
SELECT name, plan_type, monthly_price, yearly_price 
FROM billing_subscriptionplan 
ORDER BY name;

\echo '=== USER SUBSCRIPTIONS ==='
SELECT u.email, p.name as plan_name, s.status, s.created_at
FROM billing_usersubscription s
JOIN users_customuser u ON s.user_id = u.id
JOIN billing_subscriptionplan p ON s.plan_id = p.id
ORDER BY s.created_at DESC;

-- Check Demo Tenant
\echo '=== DEMO TENANT USERS ==='
SET search_path TO demo;
SELECT email, is_staff, role, is_active 
FROM users_customuser 
ORDER BY email;

\echo '=== DEMO BUILDINGS ==='
SELECT name, address, created_at 
FROM buildings_building 
ORDER BY name;

\echo '=== DEMO APARTMENTS ==='
SELECT apartment_number, floor, area, participation_mills 
FROM apartments_apartment 
ORDER BY apartment_number;

-- Check if any other users exist in public schema
\echo '=== CHECK FOR OTHER USERS ==='
SET search_path TO public;
SELECT COUNT(*) as total_users, 
       COUNT(CASE WHEN is_superuser = true THEN 1 END) as superusers,
       COUNT(CASE WHEN is_superuser = false THEN 1 END) as regular_users
FROM users_customuser;

-- Check if any user subscriptions exist
\echo '=== CHECK USER SUBSCRIPTIONS COUNT ==='
SELECT COUNT(*) as total_subscriptions
FROM billing_usersubscription;

-- Check if any tenants exist other than demo
\echo '=== CHECK TENANTS COUNT ==='
SELECT COUNT(*) as total_tenants
FROM tenants_client;
