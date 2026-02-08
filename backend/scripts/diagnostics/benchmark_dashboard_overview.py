#!/usr/bin/env python3
"""
Benchmark script for:
  GET /api/financial/dashboard/overview/

Measures:
  - uncached timings (force_refresh=1)
  - cached timings (regular calls)
  - SQL queries per call

Usage examples:
  ./venv/bin/python scripts/diagnostics/benchmark_dashboard_overview.py \
    --schema demo --user-email admin@example.com --iterations 8

  ./venv/bin/python scripts/diagnostics/benchmark_dashboard_overview.py \
    --schema demo --building-id 3 --iterations 6
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import statistics
import sys
import time
from dataclasses import dataclass
from types import SimpleNamespace
from typing import List, Optional

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")

import django  # noqa: E402

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.db import connection  # noqa: E402
from django.test.utils import CaptureQueriesContext  # noqa: E402
from django_tenants.utils import get_public_schema_name, schema_context  # noqa: E402
from rest_framework.test import APIRequestFactory, force_authenticate  # noqa: E402

from financial.views import FinancialDashboardViewSet  # noqa: E402


@dataclass
class SeriesResult:
    latencies_ms: List[float]
    query_counts: List[int]
    statuses: List[int]


def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]
    ordered = sorted(values)
    idx = (len(ordered) - 1) * (p / 100.0)
    lower = int(idx)
    upper = min(lower + 1, len(ordered) - 1)
    if lower == upper:
        return ordered[lower]
    weight = idx - lower
    return ordered[lower] * (1.0 - weight) + ordered[upper] * weight


def pick_user(user_email: Optional[str]):
    User = get_user_model()
    public_schema = get_public_schema_name()

    with schema_context(public_schema):
        if user_email:
            user = User.objects.filter(email=user_email, is_active=True).first()
            if user is None:
                raise RuntimeError(f"No active user found with email: {user_email}")
            return user

        # Fallback order: superuser -> staff -> any active user
        user = (
            User.objects.filter(is_active=True, is_superuser=True).order_by("id").first()
            or User.objects.filter(is_active=True, is_staff=True).order_by("id").first()
            or User.objects.filter(is_active=True).order_by("id").first()
        )
        if user is None:
            raise RuntimeError("No active users found in public schema.")
        return user


def run_once(
    *,
    view,
    factory: APIRequestFactory,
    user,
    schema_name: str,
    building_id: Optional[int],
    force_refresh: bool,
) -> tuple[float, int, int]:
    query_params = {}
    if building_id is not None:
        query_params["building_id"] = building_id
    if force_refresh:
        query_params["force_refresh"] = "1"

    request = factory.get("/api/financial/dashboard/overview/", data=query_params)
    request.tenant = SimpleNamespace(schema_name=schema_name)
    force_authenticate(request, user=user)

    with schema_context(schema_name):
        with CaptureQueriesContext(connection) as query_ctx:
            start = time.perf_counter()
            response = view(request)
            if hasattr(response, "render"):
                response.render()
            elapsed_ms = (time.perf_counter() - start) * 1000

    return elapsed_ms, len(query_ctx), int(response.status_code)


def run_series(
    *,
    view,
    factory: APIRequestFactory,
    user,
    schema_name: str,
    building_id: Optional[int],
    iterations: int,
    force_refresh: bool,
    sleep_ms: int,
) -> SeriesResult:
    latencies_ms: List[float] = []
    query_counts: List[int] = []
    statuses: List[int] = []

    for i in range(iterations):
        latency_ms, query_count, status_code = run_once(
            view=view,
            factory=factory,
            user=user,
            schema_name=schema_name,
            building_id=building_id,
            force_refresh=force_refresh,
        )

        latencies_ms.append(latency_ms)
        query_counts.append(query_count)
        statuses.append(status_code)

        print(
            f"  #{i + 1:02d} | status={status_code} | "
            f"latency={latency_ms:.2f} ms | sql_queries={query_count}"
        )

        if sleep_ms > 0 and i < iterations - 1:
            time.sleep(sleep_ms / 1000.0)

    return SeriesResult(latencies_ms=latencies_ms, query_counts=query_counts, statuses=statuses)


def print_summary(label: str, result: SeriesResult) -> None:
    lat = result.latencies_ms
    qry = result.query_counts

    print(f"\n[{label}]")
    print(f"  calls: {len(lat)}")
    print(f"  status codes: {sorted(set(result.statuses))}")
    print(f"  latency avg: {statistics.mean(lat):.2f} ms")
    print(f"  latency p50: {percentile(lat, 50):.2f} ms")
    print(f"  latency p95: {percentile(lat, 95):.2f} ms")
    print(f"  latency min/max: {min(lat):.2f} / {max(lat):.2f} ms")
    print(f"  sql avg: {statistics.mean(qry):.2f}")
    print(f"  sql min/max: {min(qry)} / {max(qry)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark financial dashboard overview endpoint.")
    parser.add_argument("--schema", default=os.getenv("BENCHMARK_SCHEMA", "demo"), help="Tenant schema (default: demo)")
    parser.add_argument("--user-email", default=os.getenv("BENCHMARK_USER_EMAIL"), help="Authenticate as this user")
    parser.add_argument("--building-id", type=int, default=None, help="Optional building filter")
    parser.add_argument("--iterations", type=int, default=6, help="Calls per phase (default: 6)")
    parser.add_argument("--sleep-ms", type=int, default=0, help="Sleep between calls in milliseconds")
    args = parser.parse_args()

    if args.iterations < 1:
        print("iterations must be >= 1", file=sys.stderr)
        return 2

    try:
        user = pick_user(args.user_email)
    except Exception as exc:
        print(f"Failed to select user: {exc}", file=sys.stderr)
        return 2

    print("Benchmark configuration:")
    print(f"  schema: {args.schema}")
    print(f"  user: {getattr(user, 'email', None) or getattr(user, 'username', user.pk)} (id={user.pk})")
    print(f"  building_id: {args.building_id}")
    print(f"  iterations: {args.iterations}")
    print(f"  sleep_ms: {args.sleep_ms}")

    view = FinancialDashboardViewSet.as_view({"get": "overview"})
    factory = APIRequestFactory()

    print("\nRunning UNCACHED series (force_refresh=1)...")
    uncached = run_series(
        view=view,
        factory=factory,
        user=user,
        schema_name=args.schema,
        building_id=args.building_id,
        iterations=args.iterations,
        force_refresh=True,
        sleep_ms=args.sleep_ms,
    )

    print("\nWarming cache with one regular call...")
    warm_latency, warm_queries, warm_status = run_once(
        view=view,
        factory=factory,
        user=user,
        schema_name=args.schema,
        building_id=args.building_id,
        force_refresh=False,
    )
    print(
        f"  warm call | status={warm_status} | latency={warm_latency:.2f} ms | sql_queries={warm_queries}"
    )

    print("\nRunning CACHED series (force_refresh=0)...")
    cached = run_series(
        view=view,
        factory=factory,
        user=user,
        schema_name=args.schema,
        building_id=args.building_id,
        iterations=args.iterations,
        force_refresh=False,
        sleep_ms=args.sleep_ms,
    )

    print_summary("UNCACHED", uncached)
    print_summary("CACHED", cached)

    uncached_avg = statistics.mean(uncached.latencies_ms)
    cached_avg = statistics.mean(cached.latencies_ms)
    improvement = ((uncached_avg - cached_avg) / uncached_avg * 100.0) if uncached_avg > 0 else 0.0

    print("\n[DELTA]")
    print(f"  avg latency improvement: {improvement:.2f}%")
    print(f"  avg latency delta: {uncached_avg - cached_avg:.2f} ms")
    print(
        f"  avg sql delta: {statistics.mean(uncached.query_counts) - statistics.mean(cached.query_counts):.2f}"
    )

    if any(status >= 400 for status in uncached.statuses + cached.statuses):
        print("\nWarning: benchmark completed with non-2xx responses.")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
