package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.SkyblockItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SkyblockItemRepository extends JpaRepository<SkyblockItem, String> {

    @Query(value = """
        select max(s.last_refreshed) from skyblock_item s
        """, nativeQuery = true)
    Instant findMaxLastRefreshed();

    List<SkyblockItem> findAllByIdIn(Collection<String> ids);

    @Query(value = """
        select i.* 
        from skyblock_item i
        left join bazaar_item b on b.product_id = i.id
        where (:q is null or i.name ilike concat('%', :q, '%') or i.id ilike concat('%', :q, '%'))
          and (:tier is null or i.tier = :tier)
          and (:category is null or i.category = :category)
          and (:inBazaar = false or b.product_id is not null)
        order by i.name asc
        """,
            countQuery = """
        select count(*) 
        from skyblock_item i
        left join bazaar_item b on b.product_id = i.id
        where (:q is null or i.name ilike concat('%', :q, '%') or i.id ilike concat('%', :q, '%'))
          and (:tier is null or i.tier = :tier)
          and (:category is null or i.category = :category)
          and (:inBazaar = false or b.product_id is not null)
        """,
            nativeQuery = true)
    Page<SkyblockItem> search(
            @Param("q") String q,
            @Param("tier") String tier,
            @Param("category") String category,
            @Param("inBazaar") boolean inBazaar,
            Pageable pageable
    );

    Optional<SkyblockItem> findById(String id);
}
