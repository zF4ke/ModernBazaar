package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.ReferralPayout;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReferralPayoutRepository extends JpaRepository<ReferralPayout, Long> {
    List<ReferralPayout> findAllByOrderByCreatedAtDesc();
    List<ReferralPayout> findByCodeOrderByCreatedAtDesc(String code);
}
