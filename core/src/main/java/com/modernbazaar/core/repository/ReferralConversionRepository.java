package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.ReferralConversion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferralConversionRepository extends JpaRepository<ReferralConversion, Long> {
    boolean existsByReferredUserId(String referredUserId);
}
