package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.*;
import com.modernbazaar.core.domain.*;
import com.modernbazaar.core.repository.*;
import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Query‑side facade that merges the freshest minute snapshot with the last
 * completed hour summary — including displayName lookups — from the catalog.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BazaarItemsQueryService {

    private final BazaarItemHourSummaryRepository hourRepo;
    private final BazaarProductSnapshotRepository snapRepo;
    private final BazaarItemRepository            itemRepo;

    /* ───────────────────── LIST ───────────────────── */

    @Cacheable(value = "liveViewList", key = "'list-'+#filter.hashCode()+#sort.orElse('')+#limit+'-'+#page")
    @Transactional(readOnly = true)
    public PagedResponseDTO<BazaarItemLiveViewResponseDTO> getLatestPaginated(
            BazaarItemFilterDTO filter,
            Optional<String>   sort,
            int                page,
            int                limit,
            boolean            includeHour) {

        /* 0️⃣ total count first */
        long totalItems = snapRepo.countFilteredProducts(
                filter.q(),
                filter.minSell(), filter.maxSell(),
                filter.minBuy(),  filter.maxBuy(),
                filter.minSpread());

        /* guard-rails */
        int totalPages = totalItems == 0 ? 1 : (int) Math.ceil((double) totalItems / limit);
        if (page < 0)               page = 0;
        else if (page >= totalPages) page = Math.max(0, totalPages - 1);

        int offset = page * limit;

        /* 1️⃣ page of IDs */
        List<String> pageIds = snapRepo.findLatestProductIdsPaged(
                filter.q(),
                filter.minSell(), filter.maxSell(),
                filter.minBuy(),  filter.maxBuy(),
                filter.minSpread(),
                limit, offset);

        if (pageIds.isEmpty()) {
            return new PagedResponseDTO<>(
                    List.of(), page, limit,
                    (int) totalItems, totalPages,
                    page < totalPages - 1, page > 0);
        }

        /* 2️⃣ fetch rows */
        List<BazaarItemSnapshot> snaps = snapRepo.findLatestByProductIds(pageIds);
        List<BazaarItemHourSummary> hrs = includeHour
                ? hourRepo.findLatestByProductIds(pageIds)
                : List.of();

        /* 3️⃣ assemble & sort */
        List<BazaarItemLiveViewResponseDTO> dtos =
                buildLiveViewDTOs(pageIds, snaps, hrs, includeHour);
        applySorting(dtos, sort);

        /* 4️⃣ final DTO with correct totals */
        return new PagedResponseDTO<>(
                dtos,
                page,
                limit,
                (int) totalItems,
                totalPages,
                page < totalPages - 1,
                page > 0);
    }

    /* ───────────────────── DETAIL ─────────────────── */

    @Cacheable(value = "liveViewItem", key = "#productId")
    @Transactional(readOnly = true)
    public BazaarItemLiveViewResponseDTO getItem(String productId) {
        // 1️⃣  Get the latest Snapshot row *without* collections (no warning)
        BazaarItemSnapshot meta = snapRepo
                .findTopByProductIdOrderByFetchedAtDesc(productId)
                .orElse(null);

        // 2️⃣  Fetch the two order collections in a follow‑up query (safe)
        BazaarItemSnapshot snap = null;
        if (meta != null) {
            snap = snapRepo.findWithOrdersById(meta.getId())
                    .orElse(meta);
        }

        // latest summary (we still omit points here)
        BazaarItemHourSummary hs = hourRepo
                .findLatestWithPoints(productId).stream()
                .findFirst().orElse(null);

        String displayName = itemRepo.findById(productId)
                .map(BazaarItem::getSkyblockItem)
                .map(SkyblockItem::getName)
                .orElse(null);

        BazaarItemSnapshotResponseDTO snapDto = snap != null
                ? mapSnapshot(snap, displayName)
                : null;

        BazaarItemHourSummaryResponseDTO hourDto = hs != null
                ? buildDto(hs, displayName, false)
                : null;

        if (snapDto == null && hourDto == null) {
            throw new NoSuchElementException("Item not found: " + productId);
        }

        return new BazaarItemLiveViewResponseDTO(snapDto, hourDto);
    }

    /* ───────────────────── helpers (factored out) ─────────────────── */

    private List<BazaarItemLiveViewResponseDTO> buildLiveViewDTOs(List<String>        ids,
                                                                  List<BazaarItemSnapshot>    snaps,
                                                                  List<BazaarItemHourSummary> hours,
                                                                  boolean includeHour) {
        // Index look‑ups ---------------------------------------------------
        Map<String, BazaarItemSnapshot>    snapById  = snaps.stream()
                .collect(Collectors.toMap(BazaarItemSnapshot::getProductId, Function.identity()));
        Map<String,BazaarItemHourSummary> hourById = includeHour
                ? hours.stream().collect(Collectors.toMap(BazaarItemHourSummary::getProductId,
                Function.identity()))
                : Collections.emptyMap();

        Map<String, String> names = preloadNames(new HashSet<>(ids));

        // Build the DTO list preserving the original order ---------------
        List<BazaarItemLiveViewResponseDTO> out = new ArrayList<>(ids.size());
        for (String id : ids) {
            BazaarItemSnapshot    snap  = snapById.get(id);
            BazaarItemHourSummary hs    = hourById.get(id);
            String                name  = names.get(id);

            BazaarItemSnapshotResponseDTO snapDto = snap != null
                    ? mapSnapshot(snap, name)
                    : null;

            BazaarItemHourSummaryResponseDTO hourDto = hs != null
                    ? buildDto(hs, name, false)   // never include points here
                    : null;

            out.add(new BazaarItemLiveViewResponseDTO(snapDto, hourDto));
        }
        return out;
    }

    private void applySorting(List<BazaarItemLiveViewResponseDTO> out, Optional<String> sortKey) {
        sortKey.map(String::trim)
                .map(String::toLowerCase)
                .ifPresent(k -> {
                    Comparator<BazaarItemLiveViewResponseDTO> cmp = switch (k) {
                        case "sellasc"   -> Comparator.comparingDouble(this::sellPrice);
                        case "selldesc"  -> Comparator.comparingDouble(this::sellPrice).reversed();
                        case "buyasc"    -> Comparator.comparingDouble(this::buyPrice);
                        case "buydesc"   -> Comparator.comparingDouble(this::buyPrice).reversed();
                        case "spreadasc" -> Comparator.comparingDouble(this::spread);
                        case "spreaddesc"-> Comparator.comparingDouble(this::spread).reversed();
                        default          -> null;
                    };
                    if (cmp != null) out.sort(cmp);
                });
    }

    /* ───────────────────── HISTORY ────────────────── */

    @Transactional(readOnly = true)
    @Cacheable(value = "liveViewHistory", key = "'history-'+#productId+'-'+#from+'-'+#to+'-'+#withPoints")
    public List<BazaarItemHourSummaryResponseDTO> getHistory(
            String  productId,
            Instant from,
            Instant to,
            boolean withPoints
    ) {
        Instant start = from != null ? from : Instant.EPOCH;
        Instant end   = to   != null ? to   : Instant.now();
        if (!start.isBefore(end)) {
            throw new IllegalArgumentException("'from' must be before 'to'");
        }

        List<BazaarItemHourSummary> rows = withPoints
                ? hourRepo.findRangeWithPoints(productId, start, end)
                : hourRepo.findRange(productId, start, end);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("No data for product " + productId);
        }

        return rows.stream()
                .map(r -> BazaarItemHourSummaryResponseDTO.of(r, withPoints))
                .map(dto -> {
                    if (!withPoints) return dto;
                    // Dedupe by exact snapshotTime so you never get 3 600 entries:
                    Map<Instant, BazaarItemHourPointDTO> unique = new LinkedHashMap<>();
                    assert dto.points() != null;
                    for (var p : dto.points()) {
                        unique.putIfAbsent(p.snapshotTime(), p);
                    }
                    return new BazaarItemHourSummaryResponseDTO(
                            dto.productId(),
                            dto.displayName(),
                            dto.hourStart(),
                            dto.openInstantBuyPrice(),
                            dto.closeInstantBuyPrice(),
                            dto.minInstantBuyPrice(),
                            dto.maxInstantBuyPrice(),
                            dto.openInstantSellPrice(),
                            dto.closeInstantSellPrice(),
                            dto.minInstantSellPrice(),
                            dto.maxInstantSellPrice(),
                            dto.createdBuyOrders(),
                            dto.deltaBuyOrders(),
                            dto.createdSellOrders(),
                            dto.deltaSellOrders(),
                            dto.addedItemsBuyOrders(),
                            dto.addedItemsSellOrders(),
                            new ArrayList<>(unique.values())
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "liveViewHourAverage", key = "'hourAverage-'+#productId")
    public BazaarItemHourAverageResponseDTO getLast48HourAverage(String productId) {
        List<BazaarItemHourSummary> summaries = hourRepo.findLastNByProductId(productId, 48);
        
        if (summaries.isEmpty()) {
            throw new NoSuchElementException("No hour summaries found for product " + productId);
        }

        // Get display name
        String displayName = itemRepo.findById(productId)
                .flatMap(item -> Optional.ofNullable(item.getSkyblockItem()))
                .map(skyblockItem -> skyblockItem.getName())
                .orElse(null);

        // Calculate averages
        double avgOpenBuy = summaries.stream().mapToDouble(BazaarItemHourSummary::getOpenInstantBuyPrice).average().orElse(0.0);
        double avgCloseBuy = summaries.stream().mapToDouble(BazaarItemHourSummary::getCloseInstantBuyPrice).average().orElse(0.0);
        double avgMinBuy = summaries.stream().mapToDouble(BazaarItemHourSummary::getMinInstantBuyPrice).average().orElse(0.0);
        double avgMaxBuy = summaries.stream().mapToDouble(BazaarItemHourSummary::getMaxInstantBuyPrice).average().orElse(0.0);
        
        double avgOpenSell = summaries.stream().mapToDouble(BazaarItemHourSummary::getOpenInstantSellPrice).average().orElse(0.0);
        double avgCloseSell = summaries.stream().mapToDouble(BazaarItemHourSummary::getCloseInstantSellPrice).average().orElse(0.0);
        double avgMinSell = summaries.stream().mapToDouble(BazaarItemHourSummary::getMinInstantSellPrice).average().orElse(0.0);
        double avgMaxSell = summaries.stream().mapToDouble(BazaarItemHourSummary::getMaxInstantSellPrice).average().orElse(0.0);
        
        double avgCreatedBuy = summaries.stream().mapToDouble(s -> s.getCreatedBuyOrders()).average().orElse(0.0);
        double avgDeltaBuy = summaries.stream().mapToDouble(s -> s.getDeltaBuyOrders()).average().orElse(0.0);
        double avgCreatedSell = summaries.stream().mapToDouble(s -> s.getCreatedSellOrders()).average().orElse(0.0);
        double avgDeltaSell = summaries.stream().mapToDouble(s -> s.getDeltaSellOrders()).average().orElse(0.0);
        
        double avgAddedBuy = summaries.stream().mapToDouble(s -> s.getAddedItemsBuyOrders()).average().orElse(0.0);
        double avgAddedSell = summaries.stream().mapToDouble(s -> s.getAddedItemsSellOrders()).average().orElse(0.0);

        return BazaarItemHourAverageResponseDTO.of(
                productId, displayName, Instant.now(), summaries.size(),
                avgOpenBuy, avgCloseBuy, avgMinBuy, avgMaxBuy,
                avgOpenSell, avgCloseSell, avgMinSell, avgMaxSell,
                avgCreatedBuy, avgDeltaBuy, avgCreatedSell, avgDeltaSell,
                avgAddedBuy, avgAddedSell);
    }

    /* ───────────────────── helpers ────────────────── */

    private Map<String,String> preloadNames(Set<String> ids) {
        return itemRepo.findAllByProductIdIn(ids).stream()
                .filter(bi -> bi.getSkyblockItem() != null)
                .collect(Collectors.toMap(
                        BazaarItem::getProductId,
                        bi -> bi.getSkyblockItem().getName()
                ));
    }

    private BazaarItemSnapshotResponseDTO mapSnapshot(
            BazaarItemSnapshot s,
            @Nullable String    displayName
    ) {
        return new BazaarItemSnapshotResponseDTO(
                s.getProductId(),
                displayName,
                s.getLastUpdated(),
                s.getFetchedAt(),
                s.getWeightedTwoPercentBuyPrice(),
                s.getWeightedTwoPercentSellPrice(),
                s.getInstantBuyPrice(),
                s.getInstantSellPrice(),
                s.getInstantSellPrice() - s.getInstantBuyPrice(),
                s.getBuyMovingWeek(),
                s.getSellMovingWeek(),
                s.getActiveBuyOrdersCount(),
                s.getActiveSellOrdersCount(),
                s.getBuyOrders().stream()
                        .map(o -> new OrderEntryResponseDTO(
                                o.getOrderIndex(), o.getPricePerUnit(),
                                o.getAmount(), o.getOrders()))
                        .toList(),
                s.getSellOrders().stream()
                        .map(o -> new OrderEntryResponseDTO(
                                o.getOrderIndex(), o.getPricePerUnit(),
                                o.getAmount(), o.getOrders()))
                        .toList()
        );
    }

    private BazaarItemHourSummaryResponseDTO buildDto(
            BazaarItemHourSummary h,
            @Nullable String       displayName,
            boolean                withPoints
    ) {
        // we never use this pts if withPoints is false
        List<BazaarItemHourPointDTO> pts = withPoints && h.getPoints() != null
                ? h.getPoints().stream()
                .sorted(Comparator.comparing(
                        BazaarItemHourPoint::getSnapshotTime))
                .map(p -> new BazaarItemHourPointDTO(
                        p.getSnapshotTime(),
                        p.getInstantBuyPrice(),
                        p.getInstantSellPrice(),
                        p.getActiveBuyOrdersCount(),
                        p.getActiveSellOrdersCount(),
                        p.getBuyVolume(),
                        p.getSellVolume(),
                        p.getBuyOrders().stream()
                                .map(o -> new OrderEntryResponseDTO(
                                        o.getOrderIndex(), o.getPricePerUnit(),
                                        o.getAmount(), o.getOrders()))
                                .toList(),
                        p.getSellOrders().stream()
                                .map(o -> new OrderEntryResponseDTO(
                                        o.getOrderIndex(), o.getPricePerUnit(),
                                        o.getAmount(), o.getOrders()))
                                .toList()))
                .toList()
                : List.of();

        return new BazaarItemHourSummaryResponseDTO(
                h.getProductId(),
                displayName,
                h.getHourStart(),
                h.getOpenInstantBuyPrice(),
                h.getCloseInstantBuyPrice(),
                h.getMinInstantBuyPrice(),
                h.getMaxInstantBuyPrice(),
                h.getOpenInstantSellPrice(),
                h.getCloseInstantSellPrice(),
                h.getMinInstantSellPrice(),
                h.getMaxInstantSellPrice(),
                h.getCreatedBuyOrders(),
                h.getDeltaBuyOrders(),
                h.getCreatedSellOrders(),
                h.getDeltaSellOrders(),
                h.getAddedItemsBuyOrders(),
                h.getAddedItemsSellOrders(),
                pts
        );
    }

    // pricing helpers for sorting

    private double sellPrice(BazaarItemLiveViewResponseDTO dto) {
        return dto.snapshot() != null
                ? dto.snapshot().instantSellPrice()
                : dto.lastHourSummary() != null
                ? dto.lastHourSummary().closeInstantSellPrice()
                : Double.NaN;
    }

    private double buyPrice(BazaarItemLiveViewResponseDTO dto) {
        return dto.snapshot() != null
                ? dto.snapshot().instantBuyPrice()
                : dto.lastHourSummary() != null
                ? dto.lastHourSummary().closeInstantBuyPrice()
                : Double.NaN;
    }

    private double spread(BazaarItemLiveViewResponseDTO dto) {
        return sellPrice(dto) - buyPrice(dto);
    }
}
