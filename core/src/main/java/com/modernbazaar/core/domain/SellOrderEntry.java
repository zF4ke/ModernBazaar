package com.modernbazaar.core.domain;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@DiscriminatorValue("SELL")
@SuperBuilder
@NoArgsConstructor
public class SellOrderEntry extends BazaarOrderEntry {
    // no extra fields ‑ only serves to filter by side='SELL'
}
