"use client";

/**
 * MortgageCalculator — Interactive mortgage widget (S8-07)
 *
 * Inputs: property price, deposit (amount or %), interest rate, term
 * Outputs: monthly payment, total cost, stamp duty, affordability
 * Real-time calculation as inputs change
 * Design: JetBrains Mono for numbers, gold for key figures
 */

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";

interface MortgageCalculatorProps {
  initialPrice?: number;
  compact?: boolean;
}

// --- Stamp Duty Calculator (England/NI) ---
function calculateStampDuty(price: number): number {
  if (price <= 250_000) return 0;
  let duty = 0;
  if (price > 250_000) duty += Math.min(price - 250_000, 675_000) * 0.05;
  if (price > 925_000) duty += Math.min(price - 925_000, 575_000) * 0.10;
  if (price > 1_500_000) duty += (price - 1_500_000) * 0.12;
  return Math.round(duty);
}

// --- Mortgage Calculation ---
function calculateMortgage(
  price: number,
  depositPercent: number,
  rate: number,
  termYears: number,
) {
  const deposit = Math.round(price * (depositPercent / 100));
  const loan = price - deposit;
  if (loan <= 0) return null;

  const monthlyRate = rate / 100 / 12;
  const numPayments = termYears * 12;

  const monthly =
    monthlyRate === 0
      ? loan / numPayments
      : loan *
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

  const totalRepayable = monthly * numPayments;
  const totalInterest = totalRepayable - loan;
  const stampDuty = calculateStampDuty(price);
  const ltv = ((loan / price) * 100).toFixed(1);

  return {
    price,
    deposit,
    loan,
    rate,
    term: termYears,
    monthly: Math.round(monthly),
    totalRepayable: Math.round(totalRepayable),
    totalInterest: Math.round(totalInterest),
    stampDuty,
    totalUpfront: deposit + stampDuty,
    ltv: parseFloat(ltv),
  };
}

export function MortgageCalculator({
  initialPrice = 450000,
  compact = false,
}: MortgageCalculatorProps) {
  const [price, setPrice] = useState(initialPrice);
  const [depositPercent, setDepositPercent] = useState(10);
  const [rate, setRate] = useState(4.5);
  const [term, setTerm] = useState(25);
  const [income, setIncome] = useState<number | null>(null);

  const result = useMemo(
    () => calculateMortgage(price, depositPercent, rate, term),
    [price, depositPercent, rate, term]
  );

  const affordabilityRatio = useMemo(() => {
    if (!income || !result) return null;
    return ((result.monthly * 12) / income * 100).toFixed(1);
  }, [income, result]);

  const formatGBP = useCallback((n: number) => {
    return `£${n.toLocaleString("en-GB")}`;
  }, []);

  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--border)] bg-white shadow-[var(--shadow-card)] overflow-hidden ${
        compact ? "" : "max-w-lg mx-auto"
      }`}
    >
      {/* Header */}
      <div className="bg-[var(--color-primary)] px-5 py-3">
        <h3 className="text-sm font-semibold text-white">
          🏦 Mortgage Calculator
        </h3>
      </div>

      <div className="p-5 space-y-5">
        {/* Property Price */}
        <InputGroup label="Property Price">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--muted-foreground)]">£</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
              className="flex-1 rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2 text-sm font-[var(--font-data)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              step={5000}
            />
          </div>
        </InputGroup>

        {/* Deposit Slider */}
        <InputGroup
          label="Deposit"
          right={
            <span className="font-[var(--font-data)] text-sm font-bold text-[var(--color-primary)]">
              {depositPercent}% ({formatGBP(Math.round(price * depositPercent / 100))})
            </span>
          }
        >
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={depositPercent}
            onChange={(e) => setDepositPercent(Number(e.target.value))}
            className="w-full slider-thumb accent-[var(--color-accent)]"
            aria-label="Deposit percentage"
          />
          <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
            <span>5%</span>
            <span>50%</span>
          </div>
        </InputGroup>

        {/* Interest Rate */}
        <InputGroup
          label="Interest Rate"
          right={
            <span className="font-[var(--font-data)] text-sm font-bold">{rate}%</span>
          }
        >
          <input
            type="range"
            min={1}
            max={10}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full slider-thumb accent-[var(--color-accent)]"
            aria-label="Interest rate"
          />
          <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
            <span>1%</span>
            <span>10%</span>
          </div>
        </InputGroup>

        {/* Term Slider */}
        <InputGroup
          label="Mortgage Term"
          right={
            <span className="font-[var(--font-data)] text-sm font-bold">{term} years</span>
          }
        >
          <input
            type="range"
            min={5}
            max={40}
            step={1}
            value={term}
            onChange={(e) => setTerm(Number(e.target.value))}
            className="w-full slider-thumb accent-[var(--color-accent)]"
            aria-label="Mortgage term"
          />
          <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
            <span>5yr</span>
            <span>40yr</span>
          </div>
        </InputGroup>

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[var(--radius-card)] bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-gold)]/10 p-4"
          >
            {/* Monthly Payment — Hero */}
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                Monthly Payment
              </p>
              <p
                className="mt-1 text-3xl font-bold"
                style={{
                  fontFamily: "var(--font-data)",
                  color: "var(--color-gold)",
                }}
              >
                {formatGBP(result.monthly)}<span className="text-base font-normal text-[var(--muted-foreground)]">/mo</span>
              </p>
            </div>

            {/* Stats Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ResultStat label="Loan Amount" value={formatGBP(result.loan)} />
              <ResultStat label="LTV" value={`${result.ltv}%`} />
              <ResultStat label="Total Interest" value={formatGBP(result.totalInterest)} />
              <ResultStat label="Total Repayable" value={formatGBP(result.totalRepayable)} />
              <ResultStat
                label="Stamp Duty (SDLT)"
                value={result.stampDuty > 0 ? formatGBP(result.stampDuty) : "£0"}
                highlight={result.stampDuty === 0}
              />
              <ResultStat label="Total Upfront" value={formatGBP(result.totalUpfront)} />
            </div>
          </motion.div>
        )}

        {/* Affordability Check */}
        {!compact && (
          <div className="border-t border-[var(--border)] pt-4">
            <InputGroup label="Annual Income (optional)">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--muted-foreground)]">£</span>
                <input
                  type="number"
                  value={income || ""}
                  onChange={(e) =>
                    setIncome(e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="e.g. 60000"
                  className="flex-1 rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2 text-sm font-[var(--font-data)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  step={1000}
                />
              </div>
            </InputGroup>
            {affordabilityRatio !== null && (
              <div
                className={`mt-2 rounded-[var(--radius-input)] px-3 py-2 text-xs font-medium ${
                  parseFloat(affordabilityRatio) <= 28
                    ? "bg-green-50 text-green-700"
                    : parseFloat(affordabilityRatio) <= 36
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {parseFloat(affordabilityRatio) <= 28
                  ? "✅ "
                  : parseFloat(affordabilityRatio) <= 36
                  ? "⚠️ "
                  : "🚫 "}
                Mortgage payments would be {affordabilityRatio}% of your income.
                {parseFloat(affordabilityRatio) <= 28
                  ? " This is within the recommended range."
                  : parseFloat(affordabilityRatio) <= 36
                  ? " This is at the upper limit of affordability."
                  : " This exceeds recommended affordability thresholds."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function InputGroup({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
          {label}
        </label>
        {right}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ResultStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold ${
          highlight ? "text-[var(--color-success)]" : "text-[var(--foreground)]"
        }`}
        style={{ fontFamily: "var(--font-data)" }}
      >
        {value}
      </p>
    </div>
  );
}
