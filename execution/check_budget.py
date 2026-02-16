#!/usr/bin/env python3
"""
Check Replicate API spend against budget.

Estimates spend based on generation events and model pricing.
Warns when approaching budget threshold.
"""

import argparse
import json
import os
import sys
from typing import Dict, Any

# Model pricing (per generation)
MODEL_PRICING = {
    "sdxl": 0.02,
    "imagen": 0.05,
    "flux": 0.03,
    "default": 0.025  # Average if model unknown
}

def count_generations_from_firestore(project_id: str) -> Dict[str, int]:
    """Count generations by model from Firestore."""
    from google.cloud import firestore

    client = firestore.Client(project=project_id)

    # Try generation_events collection first
    events_ref = client.collection("generation_events")
    event_count = len(list(events_ref.limit(1).stream()))

    if event_count > 0:
        # Use dedicated generation_events collection
        counts = {}
        for doc in events_ref.stream():
            data = doc.to_dict()
            model = data.get('model', 'default')
            counts[model] = counts.get(model, 0) + 1
        return counts

    # Fallback: count version documents as proxy
    print("No generation_events collection, using version count as proxy")
    users_ref = client.collection("users")

    total = 0
    for user_doc in users_ref.stream():
        designs_ref = user_doc.reference.collection("designs")
        for design_doc in designs_ref.stream():
            versions_ref = design_doc.reference.collection("versions")
            total += len(list(versions_ref.stream()))

    # Assume all are default model
    return {"default": total}

def calculate_spend(generation_counts: Dict[str, int]) -> Dict[str, Any]:
    """Calculate estimated spend from generation counts."""
    total_spend = 0.0
    total_generations = 0
    breakdown = {}

    for model, count in generation_counts.items():
        price = MODEL_PRICING.get(model, MODEL_PRICING["default"])
        spend = count * price
        total_spend += spend
        total_generations += count

        breakdown[model] = {
            "count": count,
            "price_per_gen": price,
            "spend": spend
        }

    return {
        "total_generations": total_generations,
        "total_spend": total_spend,
        "breakdown": breakdown
    }

def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Check Replicate API spend against budget"
    )
    parser.add_argument(
        "--budget",
        type=float,
        default=500.0,
        help="Total budget in USD"
    )
    parser.add_argument(
        "--warn-threshold",
        type=float,
        default=0.75,
        help="Warning threshold as fraction (0.75 = 75%%)"
    )
    parser.add_argument(
        "--project-id",
        help="GCP project ID (defaults to GCP_PROJECT_ID env var)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    args = parser.parse_args()

    try:
        project_id = args.project_id or os.environ.get("GCP_PROJECT_ID")
        if not project_id:
            print("ERROR: --project-id or GCP_PROJECT_ID must be set")
            return 1

        # Count generations
        generation_counts = count_generations_from_firestore(project_id)

        # Calculate spend
        spend_data = calculate_spend(generation_counts)
        total_spend = spend_data["total_spend"]
        total_generations = spend_data["total_generations"]

        # Calculate percentage
        percent_used = (total_spend / args.budget) * 100
        remaining = args.budget - total_spend

        # Check threshold
        over_threshold = percent_used >= (args.warn_threshold * 100)

        if args.json:
            output = {
                "budget": args.budget,
                "spend": total_spend,
                "remaining": remaining,
                "percent_used": percent_used,
                "total_generations": total_generations,
                "breakdown": spend_data["breakdown"],
                "over_threshold": over_threshold,
                "threshold": args.warn_threshold * 100
            }
            print(json.dumps(output, indent=2))
        else:
            print("=== Replicate API Budget Check ===\n")
            print(f"Total generations: {total_generations}")
            print(f"Estimated spend: ${total_spend:.2f} / ${args.budget:.2f} ({percent_used:.1f}%)")
            print(f"Remaining budget: ${remaining:.2f}")

            print("\nBreakdown by model:")
            for model, data in spend_data["breakdown"].items():
                print(f"  {model}: {data['count']} gens × ${data['price_per_gen']:.3f} = ${data['spend']:.2f}")

            if over_threshold:
                print(f"\n⚠ WARNING: Spend exceeds {args.warn_threshold * 100:.0f}% threshold")
            else:
                print(f"\n✓ Spend is below {args.warn_threshold * 100:.0f}% threshold")

        return 1 if over_threshold else 0

    except Exception as e:
        print(f"ERROR: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
