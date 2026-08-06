import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { AddSubcontractorModal } from "../components/AddSubcontractorModal";
import { formatDate, formatOrgNr } from "../lib/format";

export function SubcontractorsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { flash } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [owner, setOwner] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data: filters } = useQuery({ queryKey: ["subcontractor-filters"], queryFn: api.subcontractors.filters });
  const { data: list } = useQuery({
    queryKey: ["subcontractors", search, category, owner],
    queryFn: () => api.subcontractors.list({ search, category, owner }),
  });

  function resetFilters() {
    setSearch("");
    setCategory("");
    setOwner("");
  }

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10 pb-16">
      <div className="mb-6 flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[27px] font-semibold tracking-tight">Subcontractors</h1>
          <p className="text-[14.5px] text-muted">{list ? `${list.length} shown` : "Loading…"}</p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          Add subcontractor
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-subtle p-4">
        <div className="relative min-w-[260px] flex-1 basis-[320px]">
          <span className="absolute left-3 top-[9px]">
            <Icon name="search" size={16} color="#96A5B0" />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name or organisation number"
            className="w-full rounded-sm border border-border bg-white py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-accent"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-sm border border-border bg-white px-3 py-2.5 text-[13px]"
        >
          <option value="">All categories</option>
          {filters?.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="rounded-sm border border-border bg-white px-3 py-2.5 text-[13px]"
        >
          <option value="">All internal owners</option>
          {filters?.owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <Button onClick={resetFilters}>Reset</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-surface-subtle">
                {["Company", "Org. no.", "Category", "Internal owner", "Latest change", "New events", "Follow-up", "Last checked"].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted first:px-5">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {(list ?? []).map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-border hover:bg-surface-subtle"
                  onClick={() => navigate(`/subcontractors/${row.id}`)}
                >
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium">{row.company}</td>
                  <td className="whitespace-nowrap px-3.5 py-3.5 tabular-nums text-muted">{formatOrgNr(row.orgNr)}</td>
                  <td className="whitespace-nowrap px-3.5 py-3.5">{row.category}</td>
                  <td className="whitespace-nowrap px-3.5 py-3.5 text-muted">{row.owner?.name ?? "—"}</td>
                  <td className="px-3.5 py-3.5">{row.latestChange}</td>
                  <td className="px-3.5 py-3.5">
                    <span
                      className={`inline-block min-w-[22px] rounded-full px-2 py-0.5 text-center text-[11.5px] font-semibold ${
                        row.newEventsCount > 0 ? "bg-surface-chip text-link" : "bg-neutral-bg text-placeholder"
                      }`}
                    >
                      {row.newEventsCount}
                    </span>
                  </td>
                  <td className="px-3.5 py-3.5">
                    <Badge label={row.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-muted">{formatDate(row.lastCheckedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list?.length === 0 && (
          <div className="flex flex-col items-center gap-2.5 px-6 py-14 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface-tint">
              <Icon name="search" size={20} color="#4A9FD1" />
            </div>
            <span className="text-[15px] font-semibold">No subcontractors match these filters</span>
            <span className="max-w-[340px] text-[13px] text-muted">
              Try a different search term, or reset the filters to see all monitored subcontractors.
            </span>
            <Button className="mt-1.5" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        )}
      </Card>

      {showAdd && (
        <AddSubcontractorModal
          onClose={() => setShowAdd(false)}
          onCreated={(sub) => {
            setShowAdd(false);
            queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
            queryClient.invalidateQueries({ queryKey: ["subcontractor-filters"] });
            flash(`${sub.company} added.`);
            navigate(`/subcontractors/${sub.id}`);
          }}
        />
      )}
    </div>
  );
}
