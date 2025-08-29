package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlanRepository extends JpaRepository<Plan, Long> {
    Optional<Plan> findBySlug(String slug);
    Optional<Plan> findByStripePriceId(String stripePriceId);
    List<Plan> findAllByActiveTrue();
}

