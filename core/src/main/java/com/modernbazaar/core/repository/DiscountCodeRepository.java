package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.DiscountCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DiscountCodeRepository extends JpaRepository<DiscountCode, Long> {
    Optional<DiscountCode> findByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);
}
