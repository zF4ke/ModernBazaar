package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.ReferralCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReferralCodeRepository extends JpaRepository<ReferralCode, Long> {
    Optional<ReferralCode> findByUserId(String userId);
    Optional<ReferralCode> findByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);
}
