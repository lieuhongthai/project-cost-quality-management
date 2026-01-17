import { Controller, Get, Param } from '@nestjs/common';
import { HolidaysService } from './holidays.service';

@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  /**
   * GET /api/holidays/countries
   * Get list of popular countries
   */
  @Get('countries')
  getCountries() {
    return this.holidaysService.getCountries();
  }

  /**
   * GET /api/holidays/countries/all
   * Get all countries supported by the library
   */
  @Get('countries/all')
  getAllCountries() {
    return this.holidaysService.getAllCountries();
  }

  /**
   * GET /api/holidays/years
   * Get available years for selection
   */
  @Get('years')
  getAvailableYears() {
    return this.holidaysService.getAvailableYears();
  }

  /**
   * GET /api/holidays/:countryCode/:year
   * Get holidays for a specific country and year
   */
  @Get(':countryCode/:year')
  getHolidays(
    @Param('countryCode') countryCode: string,
    @Param('year') year: string,
  ) {
    const yearNum = parseInt(year, 10);
    return this.holidaysService.getHolidays(countryCode.toUpperCase(), yearNum);
  }
}
