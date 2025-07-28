package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

public interface BazaarItemRepository extends JpaRepository<BazaarItem, String> {
    @Modifying
    @Transactional
    @Query(value = """
        insert into bazaar_item(product_id, display_name)
        values (:id, null)
        on conflict do nothing
        """, nativeQuery = true)
    void insertIgnore(String id);

    @Query("""
           select bi
           from BazaarItem bi
           left join fetch bi.skyblockItem si
           where bi.productId in :ids
           """)
    List<BazaarItem> findAllWithSkyblockByIdIn(@Param("ids") Set<String> ids);

    @EntityGraph(attributePaths = "skyblockItem")
    List<BazaarItem> findAllByProductIdIn(Set<String> ids);
}