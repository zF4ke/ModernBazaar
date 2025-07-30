package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarItemHourPoint;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BazaarHourPointRepository
        extends JpaRepository<BazaarItemHourPoint,Long> {}