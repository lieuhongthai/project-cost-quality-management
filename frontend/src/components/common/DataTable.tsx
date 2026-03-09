import React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Checkbox from "@mui/material/Checkbox";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { LoadingSpinner, EmptyState } from "./UIComponents";

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: string | number;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => React.ReactNode;
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
  // Checkbox/selection support
  selectable?: boolean;
  selectedKeys?: (string | number)[];
  onSelectionChange?: (keys: (string | number)[]) => void;
  isRowSelectable?: (row: T) => boolean;
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
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  isRowSelectable,
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

  const selectableKeys = selectable
    ? data
        .filter((row) => !isRowSelectable || isRowSelectable(row))
        .map(keyExtractor)
    : [];

  const allSelected =
    selectableKeys.length > 0 &&
    selectableKeys.every((k) => selectedKeys.includes(k));

  const indeterminate =
    !allSelected && selectableKeys.some((k) => selectedKeys.includes(k));

  const handleToggleAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    onSelectionChange(checked ? selectableKeys : []);
  };

  const handleToggleRow = (row: T, checked: boolean) => {
    if (!onSelectionChange) return;
    const key = keyExtractor(row);
    if (checked) {
      onSelectionChange([...selectedKeys, key]);
    } else {
      onSelectionChange(selectedKeys.filter((k) => k !== key));
    }
  };

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={maxHeight ? { maxHeight, overflow: "auto" } : undefined}
    >
      <Table stickyHeader={stickyHeader} size="small">
        <TableHead>
          <TableRow>
            {selectable && (
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={indeterminate}
                  onChange={(e) => handleToggleAll(e.target.checked)}
                />
              </TableCell>
            )}
            {columns.map((col) => (
              <TableCell
                key={col.key}
                align={col.align ?? "left"}
                width={col.width}
                sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                sortDirection={sortBy === col.key ? sortOrder : false}
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
          {data.map((row, index) => {
            const key = keyExtractor(row);
            const rowSelectable = !isRowSelectable || isRowSelectable(row);
            return (
              <TableRow
                key={key}
                hover={!!onRowClick}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={{
                  cursor: onRowClick ? "pointer" : "default",
                  ...(rowSx ? rowSx(row) : {}),
                }}
              >
                {selectable && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selectedKeys.includes(key)}
                      disabled={!rowSelectable}
                      onChange={(e) => handleToggleRow(row, e.target.checked)}
                    />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    align={col.align ?? "left"}
                    width={col.width}
                  >
                    {col.render
                      ? col.render(row, index)
                      : String(
                          (row as Record<string, unknown>)[col.key] ?? ""
                        )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
