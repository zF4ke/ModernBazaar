package com.modernbazaar.core.repository.projection;

/** Generic (label, count) row for grouped admin analytics queries. */
public interface LabelCountRow {
    String getLabel();
    long getCnt();
}
