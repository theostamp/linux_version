# newconcierge — Payments Data Model (Tables, Enums, Indexes)

Έκδοση: 0.1  
Στόχος: καθαρό μοντέλο για charges/payments με audit και reconciliation.

---

## 1) Enums

### ChargeCategory
- `operational` — Λειτουργικά (τρέχοντα)
- `reserve` — Αποθεματικό
- `fee` — Αμοιβή διαχείρισης

### ChargeStatus
- `unpaid`
- `pending`
- `paid`
- `failed`
- `cancelled`
- `refunded`

### PaymentAttemptStatus
- `created`
- `redirected`
- `succeeded`
- `failed`
- `cancelled`

### ManualPaymentMethod
- `cash`
- `bank_deposit`
- `other`

### RouteDestination
- `client_funds`
- `office_fees`

---

## 2) Tables

## 2.1 payee_settings
Columns:
- `id` (uuid, pk)
- `tenant_id` (uuid, indexed, unique)
- `mode` (enum: `two_iban`, `one_iban`)
- `client_funds_iban` (encrypted string, nullable if one_iban)
- `office_fees_iban` (encrypted string, nullable if one_iban)
- `provider` (enum: `stripe`)
- `created_at`, `updated_at`

Indexes:
- unique(`tenant_id`)

## 2.2 charges
Columns:
- `id` (uuid, pk)
- `tenant_id` (uuid, indexed)
- `building_id` (uuid, indexed)
- `unit_id` (uuid, indexed)
- `resident_id` (uuid, nullable, indexed)
- `category` (ChargeCategory)
- `amount` (decimal(10,2))
- `currency` (char(3), default 'EUR')
- `period` (char(7), e.g. '2025-12', indexed)
- `description` (text)
- `status` (ChargeStatus, indexed)
- `due_date` (date, nullable)
- `created_by_user_id` (uuid)
- `paid_at` (timestamp, nullable)
- `created_at`, `updated_at`

## 2.3 payment_attempts
Columns:
- `id` (uuid, pk)
- `charge_id` (uuid, fk -> charges.id, indexed)
- `tenant_id` (uuid, indexed)
- `building_id` (uuid, indexed)
- `provider` (enum: stripe)
- `provider_session_id` (string, indexed, unique)
- `provider_payment_intent_id` (string, nullable, indexed)
- `status` (PaymentAttemptStatus, indexed)
- `amount` (decimal(10,2))
- `currency` (char(3))
- `routed_to` (RouteDestination)
- `created_at`, `updated_at`

## 2.4 payments
Columns:
- `id` (uuid, pk)
- `charge_id` (uuid, fk, indexed)
- `provider` (enum: stripe)
- `provider_payment_id` (string, indexed, unique)
- `paid_at` (timestamp)
- `amount` (decimal(10,2))
- `currency` (char(3))
- `method` (string, e.g. 'card', 'sepa_debit', 'unknown')
- `routed_to` (RouteDestination)
- `raw_summary` (json, safe subset)
- `created_at`

## 2.5 manual_payments
Columns:
- `id` (uuid, pk)
- `charge_id` (uuid, fk, indexed)
- `method` (ManualPaymentMethod)
- `recorded_by_user_id` (uuid)
- `recorded_at` (timestamp)
- `note` (text, nullable)
- `attachment_url` (text, nullable)

## 2.6 webhook_events
Columns:
- `id` (uuid, pk)
- `provider` (enum: stripe)
- `event_id` (string, indexed, unique)
- `received_at` (timestamp)
- `signature_valid` (bool)
- `payload_json` (json/text, stored securely)
- `processed_at` (timestamp, nullable)
- `processing_status` (enum: `ok`, `duplicate`, `failed`)
- `error_message` (text, nullable)

## 2.7 audit_logs
Columns:
- `id` (uuid, pk)
- `tenant_id` (uuid, indexed)
- `actor_user_id` (uuid)
- `action` (string enum-like)
- `entity_type` (string)
- `entity_id` (uuid/string)
- `before` (json, nullable)
- `after` (json, nullable)
- `created_at`

---

## 3) Suggested “action” values (audit)
- `charge.create`
- `charge.update`
- `charge.category_change`
- `charge.mark_paid_manual`
- `payment.checkout_created`
- `payment.webhook_succeeded`
- `payment.webhook_failed`
- `payment.refund_recorded`
