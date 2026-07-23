package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.StripeWebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StripeWebhookEventRepository extends JpaRepository<StripeWebhookEvent, String> {
}
