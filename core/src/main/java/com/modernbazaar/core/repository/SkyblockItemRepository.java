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

    @Query("""
  select s from SkyblockItem s
  where (:q     is null
         or lower(s.name) like lower(concat('%', cast(:q as string), '%')))
    and (:tier is null or s.tier     = :tier)
    and (:category is null or s.category = :category)
    and (:inBazaar = false or exists (
         select 1 from BazaarItem bi join bi.skyblockItem si where si.id = s.id
       ))
    and (:minNpc is null or s.npcSellPrice >= :minNpc)
    and (:maxNpc is null or s.npcSellPrice <= :maxNpc)
""")
    Page<SkyblockItem> search(
            @Param("q")        String q,
            @Param("tier")     String tier,
            @Param("category") String category,
            @Param("inBazaar") boolean inBazaar,
            @Param("minNpc")   Double minNpc,
            @Param("maxNpc")   Double maxNpc,
            Pageable page
    );

    Optional<SkyblockItem> findById(String id);
}
