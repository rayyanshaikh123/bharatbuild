// frontend/components/ui/DataTable.tsx
"use client";

import { useState } from "react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  itemsPerPage?: number;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchKeys = [],
  onRowClick,
  emptyMessage = "No data available",
  itemsPerPage = 10,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredData = searchable && searchTerm
    ? data.filter((row) =>
        searchKeys.some((key) =>
          String(row[key]).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;

  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      })
    : filteredData;

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIdx, startIdx + itemsPerPage);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {searchable && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "28rem" }}>
            <svg
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "1rem",
                height: "1rem",
                color: "var(--muted-foreground)",
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                height: "2.5rem",
                paddingLeft: "2.25rem",
                paddingRight: "0.75rem",
                backgroundColor: "rgba(var(--background-rgb, 255, 255, 255), 0.5)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                color: "var(--foreground)",
              }}
            />
          </div>
        </div>
      )}

      <div
        style={{
          backgroundColor: "var(--card)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(var(--border-rgb, 148, 163, 184), 0.5)",
          borderRadius: "1rem",
          overflow: "hidden",
          boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead
              style={{
                backgroundColor: "rgba(var(--muted-rgb, 241, 245, 249), 0.3)",
                borderBottom: "1px solid rgba(var(--border-rgb, 148, 163, 184), 0.5)",
              }}
            >
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--muted-foreground)",
                      cursor: column.sortable ? "pointer" : "default",
                      width: column.width,
                    }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {column.label}
                      {column.sortable && sortKey === column.key && (
                        <span style={{ color: "var(--primary)" }}>
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{
                      padding: "3rem 1rem",
                      textAlign: "center",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      cursor: onRowClick ? "pointer" : "default",
                      transition: "background-color 0.2s",
                      borderBottom: "1px solid rgba(var(--border-rgb, 148, 163, 184), 0.3)",
                    }}
                    onClick={() => onRowClick?.(row)}
                    onMouseEnter={(e) => {
                      if (onRowClick) {
                        e.currentTarget.style.backgroundColor =
                          "rgba(var(--muted-rgb, 241, 245, 249), 0.2)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        style={{
                          padding: "0.75rem 1rem",
                          fontSize: "0.875rem",
                          color: "var(--foreground)",
                        }}
                      >
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1rem",
              borderTop: "1px solid rgba(var(--border-rgb, 148, 163, 184), 0.5)",
              backgroundColor: "rgba(var(--muted-rgb, 241, 245, 249), 0.2)",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
              Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, sortedData.length)} of{" "}
              {sortedData.length} results
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: "0.5rem",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "0.5rem",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                ‹
              </button>
              <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", padding: "0 0.5rem" }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: "0.5rem",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              >
                ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "0.5rem",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}