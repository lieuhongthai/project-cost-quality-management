import React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { LoadingSpinner, EmptyState } from "./UIComponents";

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: string | number;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  keyExtractor: (row: T) => string | number;
  stickyHeader?: boolean;
  maxHeight?: string | number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  rowSx?: (row: T) => object;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle = "No data",
  emptyDescription,
  emptyIcon,
  keyExtractor,
  stickyHeader = false,
  maxHeight,
  sortBy,
  sortOrder = "asc",
  onSort,
  onRowClick,
  rowSx,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <Box py={4}>
        <LoadingSpinner size="md" />
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
      />
    );
  }

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={maxHeight ? { maxHeight, overflow: "auto" } : undefined}
    >
      <Table stickyHeader={stickyHeader} size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                align={col.align ?? "left"}
                width={col.width}
                sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                sortDirection={
                  sortBy === col.key ? sortOrder : false
                }
              >
                {col.sortable && onSort ? (
                  <TableSortLabel
                    active={sortBy === col.key}
                    direction={sortBy === col.key ? sortOrder : "asc"}
                    onClick={() => onSort(col.key)}
                  >
                    {col.header}
                  </TableSortLabel>
                ) : (
                  col.header
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={keyExtractor(row)}
              hover={!!onRowClick}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{
                cursor: onRowClick ? "pointer" : "default",
                ...(rowSx ? rowSx(row) : {}),
              }}
            >
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align ?? "left"}
                  width={col.width}
                >
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
