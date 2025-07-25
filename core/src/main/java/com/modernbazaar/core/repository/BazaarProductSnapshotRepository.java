package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarProductSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;

public interface BazaarProductSnapshotRepository
        extends JpaRepository<BazaarProductSnapshot, Long> {

    void deleteByFetchedAtBefore(Instant cutoff);

    BazaarProductSnapshot findTopByProductIdOrderByLastUpdatedDesc(String productId);
}
