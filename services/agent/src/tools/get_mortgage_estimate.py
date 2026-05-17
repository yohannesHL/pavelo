"""
get_mortgage_estimate — Calculate monthly payment (S5-05)

Given price, deposit, interest rate, and term, calculate:
- Monthly payment (repayment mortgage)
- Total interest paid
- Total amount repayable
- LTV ratio
"""

from __future__ import annotations

import json
import math
from typing import Any

import structlog
from langchain_core.tools import tool

logger = structlog.get_logger()


def calculate_mortgage(
    price: int,
    deposit: int,
    annual_rate: float = 4.5,
    term_years: int = 25,
) -> dict[str, Any]:
    """Calculate mortgage details.

    Uses standard annuity formula for repayment mortgage.

    Args:
        price: Property price in GBP.
        deposit: Deposit amount in GBP.
        annual_rate: Annual interest rate (percentage, e.g. 4.5).
        term_years: Mortgage term in years.

    Returns:
        Mortgage calculation results.
    """
    loan_amount = price - deposit
    if loan_amount <= 0:
        return {
            "status": "error",
            "message": "Deposit must be less than the property price",
        }

    ltv = round((loan_amount / price) * 100, 1)
    monthly_rate = (annual_rate / 100) / 12
    num_payments = term_years * 12

    if monthly_rate == 0:
        monthly_payment = loan_amount / num_payments
    else:
        monthly_payment = loan_amount * (
            monthly_rate * (1 + monthly_rate) ** num_payments
        ) / (
            (1 + monthly_rate) ** num_payments - 1
        )

    total_repayable = monthly_payment * num_payments
    total_interest = total_repayable - loan_amount

    # Stamp duty calculation (England/Northern Ireland, main home)
    stamp_duty = _calculate_stamp_duty(price)

    return {
        "status": "success",
        "estimate": {
            "price": price,
            "deposit": deposit,
            "loanAmount": loan_amount,
            "rate": annual_rate,
            "term": term_years,
            "ltv": ltv,
            "monthlyPayment": round(monthly_payment),
            "totalRepayable": round(total_repayable),
            "totalInterest": round(total_interest),
            "stampDuty": stamp_duty,
            "totalUpfrontCosts": deposit + stamp_duty,
        },
    }


def _calculate_stamp_duty(price: int) -> int:
    """Calculate stamp duty for England/Northern Ireland (main residence).

    2024/2025 thresholds:
    - £0 - £250,000: 0%
    - £250,001 - £925,000: 5%
    - £925,001 - £1,500,000: 10%
    - Over £1,500,000: 12%
    """
    if price <= 250_000:
        return 0

    duty = 0
    if price > 250_000:
        duty += min(price - 250_000, 675_000) * 0.05
    if price > 925_000:
        duty += min(price - 925_000, 575_000) * 0.10
    if price > 1_500_000:
        duty += (price - 1_500_000) * 0.12

    return round(duty)


async def get_mortgage_estimate_impl(
    price: int,
    deposit: int | None = None,
    deposit_percent: float | None = None,
    annual_rate: float = 4.5,
    term_years: int = 25,
) -> dict[str, Any]:
    """Calculate mortgage estimate.

    Args:
        price: Property price in GBP.
        deposit: Deposit in GBP (or use deposit_percent).
        deposit_percent: Deposit as percentage of price.
        annual_rate: Annual interest rate (default 4.5%).
        term_years: Mortgage term in years (default 25).

    Returns:
        Mortgage estimate with monthly payment.
    """
    if deposit is None and deposit_percent is not None:
        deposit = round(price * (deposit_percent / 100))
    elif deposit is None:
        deposit = round(price * 0.1)  # Default 10% deposit

    return calculate_mortgage(price, deposit, annual_rate, term_years)


@tool
async def get_mortgage_estimate(
    price: int,
    deposit: int | None = None,
    deposit_percent: float | None = None,
    annual_rate: float = 4.5,
    term_years: int = 25,
) -> str:
    """Calculate monthly mortgage payment for a property.

    Use this when the user asks about mortgage costs, monthly payments,
    or affordability for a given property price.

    Args:
        price: Property price in GBP.
        deposit: Deposit amount in GBP. If not provided, defaults to 10%.
        deposit_percent: Deposit as percentage (e.g. 10 for 10%). Alternative to deposit.
        annual_rate: Annual interest rate percentage (default 4.5).
        term_years: Mortgage term in years (default 25).

    Returns:
        JSON string with mortgage details.
    """
    result = await get_mortgage_estimate_impl(
        price=price,
        deposit=deposit,
        deposit_percent=deposit_percent,
        annual_rate=annual_rate,
        term_years=term_years,
    )
    return json.dumps(result, indent=2)
