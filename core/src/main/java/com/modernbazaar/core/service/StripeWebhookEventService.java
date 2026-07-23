package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.StripeWebhookEvent;
import com.modernbazaar.core.repository.StripeWebhookEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class StripeWebhookEventService {
    private final StripeWebhookEventRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean begin(String eventId, String eventType) {
        OffsetDateTime now = OffsetDateTime.now();
        var existing = repository.findById(eventId).orElse(null);
        if (existing == null) {
            repository.saveAndFlush(StripeWebhookEvent.builder()
                    .eventId(eventId)
                    .eventType(eventType)
                    .status("processing")
                    .attemptCount(1)
                    .receivedAt(now)
                    .build());
            return true;
        }
        if ("processed".equals(existing.getStatus())) return false;
        if ("processing".equals(existing.getStatus())
                && existing.getReceivedAt() != null
                && existing.getReceivedAt().isAfter(now.minusMinutes(10))) {
            return false;
        }
        existing.setStatus("processing");
        existing.setAttemptCount(existing.getAttemptCount() + 1);
        existing.setReceivedAt(now);
        existing.setLastError(null);
        repository.saveAndFlush(existing);
        return true;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markProcessed(String eventId) {
        repository.findById(eventId).ifPresent(event -> {
            event.setStatus("processed");
            event.setProcessedAt(OffsetDateTime.now());
            event.setLastError(null);
            repository.save(event);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(String eventId, Exception error) {
        repository.findById(eventId).ifPresent(event -> {
            event.setStatus("failed");
            String message = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
            event.setLastError(message.substring(0, Math.min(message.length(), 1000)));
            repository.save(event);
        });
    }
}
