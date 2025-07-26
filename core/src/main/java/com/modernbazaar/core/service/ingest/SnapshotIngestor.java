package com.modernbazaar.core.service.ingest;

import com.modernbazaar.core.domain.BazaarOrderEntry;
import com.modernbazaar.core.domain.BazaarProductSnapshot;
import lombok.RequiredArgsConstructor;
import org.hibernate.StatelessSession;
import org.hibernate.SessionFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

@Component
@RequiredArgsConstructor
public class SnapshotIngestor {

    private final SessionFactory sessionFactory;
    private final TransactionTemplate txTemplate;

    /**
     * Bulk‑inserts snapshots + their order entries with no first‑level cache.
     */
    public void bulkInsert(List<BazaarProductSnapshot> snapshots) {
        txTemplate.executeWithoutResult(status -> {
            try (StatelessSession ss = sessionFactory.openStatelessSession()) {
                for (BazaarProductSnapshot snap : snapshots) {
                    ss.insert(snap);
                    // manually insert child entries since statelessSession ignores cascade
                    snap.getBuyOrders().forEach(ss::insert);
                    snap.getSellOrders().forEach(ss::insert);
                }
            }
        });
    }
}
