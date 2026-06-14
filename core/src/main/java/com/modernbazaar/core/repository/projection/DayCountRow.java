package com.modernbazaar.core.repository.projection;

/** (day 'YYYY-MM-DD', count) row for time-series admin analytics. */
public interface DayCountRow {
    String getDay();
    long getCnt();
}
