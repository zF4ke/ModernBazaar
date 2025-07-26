package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface BazaarItemRepository extends JpaRepository<BazaarItem, String> {
    @Query("select i.productId from BazaarItem i")
    List<String> findAllIds();

    @Modifying
    @Transactional
    @Query(value = """
        insert into bazaar_item(product_id, display_name)
        values (:id, null)
        on conflict do nothing
        """, nativeQuery = true)
    void insertIgnore(String id);
}