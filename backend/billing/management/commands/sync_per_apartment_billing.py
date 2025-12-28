from django.core.management.base import BaseCommand

from billing.models import UserSubscription
from billing.apartment_billing import sync_subscription_items_for_tenant


class Command(BaseCommand):
    help = "Sync per-apartment billing quantities (web + premium add-on) to Stripe subscription items"

    def add_arguments(self, parser):
        parser.add_argument(
            "--subscription-id",
            dest="subscription_id",
            default=None,
            help="Sync only a specific UserSubscription UUID",
        )
        parser.add_argument(
            "--schema-name",
            dest="schema_name",
            default=None,
            help="Sync only subscriptions whose tenant schema_name matches",
        )
        parser.add_argument(
            "--proration-behavior",
            dest="proration_behavior",
            default="create_prorations",
            help="Stripe proration_behavior (e.g. create_prorations, none, always_invoice)",
        )
        parser.add_argument(
            "--include-inactive",
            action="store_true",
            help="Include inactive/canceled subscriptions (default: only trial/active)",
        )

    def handle(self, *args, **options):
        subscription_id = options.get("subscription_id")
        schema_name = options.get("schema_name")
        proration_behavior = options.get("proration_behavior") or "create_prorations"
        include_inactive = bool(options.get("include_inactive"))

        qs = UserSubscription.objects.select_related("user", "user__tenant")
        if not include_inactive:
            qs = qs.filter(status__in=["trial", "active", "trialing"])
        if subscription_id:
            qs = qs.filter(id=subscription_id)

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.WARNING("No subscriptions matched filters."))
            return

        ok_count = 0
        fail_count = 0

        for sub in qs.iterator():
            tenant = getattr(sub.user, "tenant", None)
            if not tenant:
                self.stdout.write(self.style.WARNING(f"⚠️  Subscription {sub.id}: user has no tenant, skipping"))
                continue
            if schema_name and tenant.schema_name != schema_name:
                continue

            result = sync_subscription_items_for_tenant(
                tenant=tenant,
                subscription=sub,
                proration_behavior=proration_behavior,
            )
            if result.get("ok"):
                ok_count += 1
                counts = result.get("counts") or {}
                stripe = result.get("stripe") or {}
                skipped = stripe.get("skipped")
                suffix = " (stripe skipped)" if skipped else ""
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✅ {tenant.schema_name} | sub={sub.id} | total_apts={counts.get('total_apartments')} "
                        f"premium_apts={counts.get('premium_apartments')}{suffix}"
                    )
                )
            else:
                fail_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"❌ {tenant.schema_name} | sub={sub.id} | error={result.get('error')}"
                    )
                )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Done. OK={ok_count} Failed={fail_count} Total={total}"))


