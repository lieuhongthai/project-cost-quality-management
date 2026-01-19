import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';

interface Holiday {
  date: string;
  name: string;
  localName: string;
  type: string;
}

interface Country {
  code: string;
  name: string;
}

interface HolidayImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (dates: string[]) => void;
  existingHolidays: string[];
}

const API_BASE_URL = 'http://localhost:3000/api';

export const HolidayImportDialog: React.FC<HolidayImportDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  existingHolidays,
}) => {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedCountry, setSelectedCountry] = useState<string>('VN');
  const [countries, setCountries] = useState<Country[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Available years
  const years = useMemo(() => {
    const result: number[] = [];
    for (let i = currentYear - 1; i <= currentYear + 5; i++) {
      result.push(i);
    }
    return result;
  }, [currentYear]);

  // Existing holidays set for quick lookup
  const existingSet = useMemo(() => new Set(existingHolidays), [existingHolidays]);

  // Fetch countries on mount
  useEffect(() => {
    if (isOpen) {
      fetchCountries();
    }
  }, [isOpen]);

  // Fetch holidays when year or country changes
  useEffect(() => {
    if (isOpen && selectedCountry && selectedYear) {
      fetchHolidays();
    }
  }, [isOpen, selectedCountry, selectedYear]);

  // Reset selections when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDates(new Set());
      setError(null);
    }
  }, [isOpen]);

  const fetchCountries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/holidays/countries`);
      if (response.ok) {
        const data = await response.json();
        setCountries(data);
      }
    } catch (err) {
      console.error('Failed to fetch countries:', err);
    }
  };

  const fetchHolidays = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/holidays/${selectedCountry}/${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setHolidays(data);
      } else {
        setError('Failed to fetch holidays');
      }
    } catch (err) {
      setError('Failed to fetch holidays');
      console.error('Failed to fetch holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDate = (date: string) => {
    if (existingSet.has(date)) return; // Don't allow selecting already added holidays

    const newSelected = new Set(selectedDates);
    if (newSelected.has(date)) {
      newSelected.delete(date);
    } else {
      newSelected.add(date);
    }
    setSelectedDates(newSelected);
  };

  const handleSelectAll = () => {
    const newSelected = new Set<string>();
    holidays.forEach((h) => {
      if (!existingSet.has(h.date)) {
        newSelected.add(h.date);
      }
    });
    setSelectedDates(newSelected);
  };

  const handleDeselectAll = () => {
    setSelectedDates(new Set());
  };

  const handleImport = () => {
    const datesToImport = Array.from(selectedDates);
    onImport(datesToImport);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  };

  // Group holidays by month
  const holidaysByMonth = useMemo(() => {
    const grouped: Record<string, Holiday[]> = {};
    holidays.forEach((h) => {
      const month = h.date.substring(0, 7); // YYYY-MM
      if (!grouped[month]) {
        grouped[month] = [];
      }
      grouped[month].push(h);
    });
    return grouped;
  }, [holidays]);

  const getMonthName = (monthKey: string) => {
    const date = new Date(monthKey + '-01');
    return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  };

  const availableCount = holidays.filter((h) => !existingSet.has(h.date)).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import ngày nghỉ lễ"
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Đã chọn: <span className="font-semibold text-blue-600">{selectedDates.size}</span> / {availableCount} ngày
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleImport}
              disabled={selectedDates.size === 0}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedDates.size === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Import ({selectedDates.size})
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quốc gia
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Năm
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Tìm thấy <span className="font-semibold">{holidays.length}</span> ngày nghỉ lễ
            {existingHolidays.length > 0 && (
              <span className="text-orange-600 ml-2">
                ({holidays.filter((h) => existingSet.has(h.date)).length} đã được thêm)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              disabled={availableCount === 0}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Chọn tất cả
            </button>
            <button
              onClick={handleDeselectAll}
              disabled={selectedDates.size === 0}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Bỏ chọn tất cả
            </button>
          </div>
        </div>

        {/* Holiday List */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Đang tải...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-500">
              {error}
            </div>
          ) : holidays.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              Không tìm thấy ngày nghỉ lễ nào
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {Object.entries(holidaysByMonth).map(([month, monthHolidays]) => (
                <div key={month}>
                  {/* Month Header */}
                  <div className="sticky top-0 px-4 py-2 bg-gray-100 border-b border-gray-200 font-medium text-gray-700">
                    {getMonthName(month)}
                  </div>

                  {/* Holidays in this month */}
                  {monthHolidays.map((holiday) => {
                    const isExisting = existingSet.has(holiday.date);
                    const isSelected = selectedDates.has(holiday.date);

                    return (
                      <div
                        key={holiday.date}
                        onClick={() => handleToggleDate(holiday.date)}
                        className={`flex items-center px-4 py-3 border-b border-gray-100 transition-colors ${
                          isExisting
                            ? 'bg-gray-50 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-blue-50 cursor-pointer'
                            : 'hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="mr-3">
                          {isExisting ? (
                            <div className="w-5 h-5 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : (
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Date */}
                        <div className="w-24 text-sm font-mono text-gray-600">
                          {formatDate(holiday.date)}
                        </div>

                        {/* Holiday Name */}
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${isExisting ? 'text-gray-500' : 'text-gray-900'}`}>
                            {holiday.name}
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isExisting && (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            Đã thêm
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <strong>Gợi ý:</strong> Chọn các ngày nghỉ lễ cần thiết cho dự án của bạn.
          Những ngày này sẽ được loại trừ khi tính toán ngày kết thúc dự án.
        </div>
      </div>
    </Modal>
  );
};
