package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.UserSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {
    Optional<UserSubscription> findFirstByUserIdOrderByIdDesc(String userId);
}

