package com.modernbazaar.core.domain;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

@Entity
@DiscriminatorValue("BUY")
public class BuyOrderEntry extends BazaarOrderEntry {
    // no extra fields ‑ only serves to filter by side='BUY'
}
