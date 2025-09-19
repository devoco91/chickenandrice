// app/inventory/print/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../../utils/apiBase";

const fmtNum = (n) => Number(n || 0).toLocaleString("en-NG");
const fmtQty = (unit, v) => (unit === "gram" ? `${fmtNum(v)} g` : `${fmtNum(v)} pcs`);

const uniqBy = (rows = []) => {
  const seen = new Set();
  return rows.filter((r) => {
    const k = `${r?.slug || r?.sku || ""}|${r?.unit || ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
const sortByName = (rows = []) =>
  [...rows].sort((a, b) =>
    String(a?.sku || "").localeCompare(String(b?.sku || ""), undefined, { sensitivity: "base" })
  );

export default function InventoryPrintPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const abortRef = useRef(null);

  useEffect(() => {
    const ac = new AbortController();
    abortRef.current = ac;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_BASE}/inventory/summary?ts=${Date.now()}`, {
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSummary(await res.json());
      } catch (e) {
        if (e?.name !== "AbortError") setErr(e?.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
    return () => abortRef.current?.abort?.();
  }, []);

  const now = useMemo(() => new Date(), []);

  // Source rows
  const foodAll = uniqBy(Array.isArray(summary?.food) ? summary.food : []).filter((r) => !r?._extra);
  const drinksAll = uniqBy(Array.isArray(summary?.drinks) ? summary.drinks : []);
  const proteinsAll = uniqBy(Array.isArray(summary?.proteins) ? summary.proteins : []);

  // Arrange properly
  const foodGram = sortByName(foodAll.filter((r) => r.unit === "gram"));
  const foodPiece = sortByName(foodAll.filter((r) => r.unit !== "gram"));
  const drinks = sortByName(drinksAll);
  const proteins = sortByName(proteinsAll);

  const sum = (rows, field) => rows.reduce((s, r) => s + Number(r?.[field] || 0), 0);

  return (
    <div className="min-h-screen bg-white text-black p-6 print:p-4">
      <div className="flex items-start justify-between mb-4 print:mb-2">
        <div>
          <h1 className="text-2xl font-extrabold">Inventory Summary (Today)</h1>
          <p className="text-sm text-gray-600">Generated: {now.toLocaleString()}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={() => window.print()} className="px-4 py-2 rounded-lg text-white bg-slate-800 hover:bg-slate-900">
            Print
          </button>
          <a href="/inventory" className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50">
            Back
          </a>
        </div>
      </div>

      {err && <div className="mb-3 text-rose-700 font-semibold">⚠️ {err}</div>}
      {loading && <div className="mb-3 text-gray-700">Loading…</div>}

      {/* Food (grams) */}
      <section className="mb-4">
        <h2 className="font-bold text-lg border-b border-gray-300 pb-1">Food (grams)</h2>
        <MiniTable
          headers={["Item", "Added", "Used", "Remaining"]}
          rows={foodGram}
          numericUnit="gram"
          render={(r, i) => (
            <tr key={r.slug || r.sku || i} className="border-b last:border-0">
              <td className="py-1 pr-2">{r?.sku}</td>
              <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums">{fmtQty("gram", r?.added)}</td>
              <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums">{fmtQty("gram", r?.used)}</td>
              <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums font-semibold">{fmtQty("gram", r?.remaining)}</td>
            </tr>
          )}
          footer={[
            "Totals",
            fmtQty("gram", sum(foodGram, "added")),
            fmtQty("gram", sum(foodGram, "used")),
            fmtQty("gram", sum(foodGram, "remaining")),
          ]}
        />
      </section>

      {/* Food (pieces) + Drinks + Proteins */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Food (pieces) */}
        <section>
          <h2 className="font-bold text-lg border-b border-gray-300 pb-1">Food (pieces)</h2>
          <MiniTable
            headers={["Item", "Added", "Used", "Remaining"]}
            rows={foodPiece}
            numericUnit="piece"
            render={(r, i) => (
              <tr key={r.slug || r.sku || i} className="border-b last:border-0">
                <td className="py-1 pr-2">{r?.sku}</td>
                <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums">{fmtQty("piece", r?.added)}</td>
                <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums">{fmtQty("piece", r?.used)}</td>
                <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums font-semibold">{fmtQty("piece", r?.remaining)}</td>
              </tr>
            )}
            footer={[
              "Totals",
              fmtQty("piece", sum(foodPiece, "added")),
              fmtQty("piece", sum(foodPiece, "used")),
              fmtQty("piece", sum(foodPiece, "remaining")),
            ]}
          />
        </section>

        {/* Drinks */}
        <section>
          <h2 className="font-bold text-lg border-b border-gray-300 pb-1">Drinks (pieces)</h2>
          <MiniTable
            headers={["Item", "Added", "Used", "Remaining"]}
            rows={drinks}
            numericUnit="piece"
            render={(r, i) => (
              <tr key={r.slug || r.sku || i} className="border-b last:border-0">
                <td className="py-1 pr-2">{r?.sku}</td>
                <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums">{fmtQty("piece", r?.added)}</td>
                <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums">{fmtQty("piece", r?.used)}</td>
                <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums font-semibold">{fmtQty("piece", r?.remaining)}</td>
              </tr>
            )}
            footer={[
              "Totals",
              fmtQty("piece", sum(drinks, "added")),
              fmtQty("piece", sum(drinks, "used")),
              fmtQty("piece", sum(drinks, "remaining")),
            ]}
          />
        </section>

        {/* Proteins */}
        <section>
          <h2 className="font-bold text-lg border-b border-gray-300 pb-1">Proteins (pieces)</h2>
          <MiniTable
            headers={["Item", "Added", "Used", "Remaining"]}
            rows={proteins}
            numericUnit="piece"
            render={(r, i) => (
              <tr key={r.slug || r.sku || i} className="border-b last:border-0">
                <td className="py-1 pr-2">{r?.sku}</td>
                <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums">{fmtQty("piece", r?.added)}</td>
                <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums">{fmtQty("piece", r?.used)}</td>
                <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums font-semibold">{fmtQty("piece", r?.remaining)}</td>
              </tr>
            )}
            footer={[
              "Totals",
              fmtQty("piece", sum(proteins, "added")),
              fmtQty("piece", sum(proteins, "used")),
              fmtQty("piece", sum(proteins, "remaining")),
            ]}
          />
        </section>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        /* Make digits align nicely in qty columns */
        .tabular-nums { font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1, "lnum" 1; }
      `}</style>
    </div>
  );
}

function MiniTable({ headers, rows, render, footer, numericUnit }) {
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <table className="w-full text-sm table-fixed">
        {/* Fixed column grid: 40% / 20% / 20% / 20% (prevents header/body drift) */}
        <colgroup>
          <col style={{ width: "40%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left py-1.5 px-2 font-semibold">{headers[0]}</th>
            <th className="text-right py-1.5 px-2 font-semibold whitespace-nowrap">{headers[1]}</th>
            <th className="text-right py-1.5 px-2 font-semibold whitespace-nowrap">{headers[2]}</th>
            <th className="text-right py-1.5 px-2 font-semibold whitespace-nowrap">{headers[3]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => render(r, i))
          ) : (
            <tr>
              <td className="py-2 px-2 text-gray-500" colSpan={headers.length}>
                No rows.
              </td>
            </tr>
          )}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className="py-1.5 px-2 text-left">{footer[0]}</td>
              <td className="py-1.5 px-2 text-right whitespace-nowrap tabular-nums">{footer[1]}</td>
              <td className="py-1.5 px-2 text-right whitespace-nowrap tabular-nums">{footer[2]}</td>
              <td className="py-1.5 px-2 text-right whitespace-nowrap tabular-nums">{footer[3]}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
