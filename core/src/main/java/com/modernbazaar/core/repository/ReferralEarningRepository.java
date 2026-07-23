package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.ReferralEarning;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReferralEarningRepository extends JpaRepository<ReferralEarning, Long> {
    Optional<ReferralEarning> findByStripeInvoiceId(String stripeInvoiceId);
    Optional<ReferralEarning> findFirstByStripeChargeId(String stripeChargeId);
    List<ReferralEarning> findAllByCode(String code);
}
