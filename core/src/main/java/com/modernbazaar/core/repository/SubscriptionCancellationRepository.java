package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.SubscriptionCancellation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionCancellationRepository extends JpaRepository<SubscriptionCancellation, Long> {
}
