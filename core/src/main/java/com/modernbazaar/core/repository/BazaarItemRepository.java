package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BazaarItemRepository extends JpaRepository<BazaarItem, String> { }