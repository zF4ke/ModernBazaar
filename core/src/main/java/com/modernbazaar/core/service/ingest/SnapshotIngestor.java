package com.modernbazaar.core.service.ingest;

import com.modernbazaar.core.domain.BazaarOrderEntry;
import com.modernbazaar.core.domain.BazaarProductSnapshot;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.hibernate.StatelessSession;
import org.hibernate.SessionFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

@Component
public class SnapshotIngestor {

    @PersistenceContext
    private EntityManager em;

    private static final int JDBC_BATCH_SIZE = 50;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ingestBatch(List<BazaarProductSnapshot> batch) {
        int i = 0;
        for (BazaarProductSnapshot s : batch) {
            em.persist(s);
            if (++i % JDBC_BATCH_SIZE == 0) {
                em.flush();
                em.clear(); // drop references from the persistence context
            }
        }
        em.flush();
        em.clear();
    }
}