import { Injectable } from '@nestjs/common';
import Holidays from 'date-holidays';

export interface Holiday {
  date: string;
  name: string;
  localName: string;
  type: string;
}

export interface Country {
  code: string;
  name: string;
}

// Popular countries with their codes
const POPULAR_COUNTRIES: Country[] = [
  { code: 'VN', name: 'Việt Nam' },
  { code: 'US', name: 'United States' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'AU', name: 'Australia' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'CA', name: 'Canada' },
  { code: 'IN', name: 'India' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
];

@Injectable()
export class HolidaysService {
  private hd: Holidays;

  constructor() {
    this.hd = new Holidays();
  }

  /**
   * Get list of popular countries
   */
  getCountries(): Country[] {
    return POPULAR_COUNTRIES;
  }

  /**
   * Get all countries supported by the library
   */
  getAllCountries(): Country[] {
    const countries = this.hd.getCountries();
    return Object.entries(countries).map(([code, name]) => ({
      code,
      name: name as string,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get holidays for a specific country and year
   */
  getHolidays(countryCode: string, year: number): Holiday[] {
    this.hd.init(countryCode);

    const holidays = this.hd.getHolidays(year);

    if (!holidays) {
      return [];
    }

    return holidays
      .filter(h => h.type === 'public') // Only public holidays
      .map(h => ({
        date: h.date.split(' ')[0], // Get only the date part (YYYY-MM-DD)
        name: h.name,
        localName: h.name, // The library already provides localized names
        type: h.type,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get available years for selection
   */
  getAvailableYears(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = currentYear - 1; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  }
}
