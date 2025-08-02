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
 * Query-side facade that merges the freshest minute snapshot with the last
 * completed hour summary—including displayName lookups—from the catalog.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BazaarItemsQueryService {

    private final BazaarItemHourSummaryRepository hourRepo;
    private final BazaarProductSnapshotRepository snapRepo;
    private final BazaarItemRepository            itemRepo;

    /* ───────────────────── LIST ───────────────────── */

    @Cacheable(value = "liveViewList", key = "'list-'+#filter.hashCode()+#sort.orElse('')+#limit")
    @Transactional(readOnly = true)
    public PagedResponseDTO<BazaarItemLiveViewResponseDTO> getLatestPaginated(
            BazaarItemFilterDTO filter,
            Optional<String>        sort,
            int                     page,
            int                     limit
    ) {
        var all = getLatestInternal(filter, sort, Optional.empty());
        return PagedResponseDTO.of(all, page, limit);
    }

    @Transactional(readOnly = true)
    protected List<BazaarItemLiveViewResponseDTO> getLatestInternal(
            BazaarItemFilterDTO filter,
            Optional<String>     sort,
            Optional<Integer>    limit
    ) {
        // 1) fetch raw tables
        List<BazaarItemSnapshot>    snaps = snapRepo.searchLatest(
                filter.q(), filter.minSell(), filter.maxSell(),
                filter.minBuy(), filter.maxBuy(), filter.minSpread());
        List<BazaarItemHourSummary> hours = hourRepo.searchLatest(
                filter.q(), filter.minSell(), filter.maxSell(),
                filter.minBuy(), filter.maxBuy(), filter.minSpread());

        // 2) index by productId
        Map<String,BazaarItemSnapshot>    snapById    = snaps.stream()
                .collect(Collectors.toMap(
                        BazaarItemSnapshot::getProductId, Function.identity()));
        Map<String,BazaarItemHourSummary>  hourByIdRaw = hours.stream()
                .collect(Collectors.toMap(
                        BazaarItemHourSummary::getProductId, Function.identity()));

        // 3) preload display names
        Set<String> allIds = new HashSet<>(snapById.keySet());
        allIds.addAll(hourByIdRaw.keySet());
        Map<String,String> names = preloadNames(allIds);

        // 4) build composite DTOs
        List<BazaarItemLiveViewResponseDTO> out = allIds.stream()
                .map(id -> {
                    BazaarItemSnapshot      snap  = snapById.get(id);
                    BazaarItemHourSummary   hs    = hourByIdRaw.get(id);
                    String                  name  = names.get(id);

                    BazaarItemSnapshotResponseDTO snapDto = snap != null
                            ? mapSnapshot(snap, name)
                            : null;

                    BazaarItemHourSummaryResponseDTO hourDto = hs != null
                            ? buildDto(hs, name, false)   // never include points here
                            : null;

                    return new BazaarItemLiveViewResponseDTO(snapDto, hourDto);
                })
                .collect(Collectors.toList());

        // 5) optional sorting
        sort.map(String::trim)
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

        // 6) optional limit
        return limit.filter(l -> l > 0 && l < out.size())
                .map(l -> out.subList(0, l))
                .orElse(out);
    }

    /* ───────────────────── DETAIL ─────────────────── */

    @Cacheable(value = "liveViewItem", key = "#productId")
    @Transactional(readOnly = true)
    public BazaarItemLiveViewResponseDTO getItem(String productId) {
        // freshest snapshot
        BazaarItemSnapshot snap = snapRepo
                .findTopByProductIdOrderByFetchedAtDesc(productId)
                .orElse(null);

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
                            dto.newSellOrders(),
                            dto.deltaNewSellOrders(),
                            dto.newBuyOrders(),
                            dto.deltaNewBuyOrders(),
                            dto.itemsListedSellOrders(),
                            dto.itemsListedBuyOrders(),
                            new ArrayList<>(unique.values())
                    );
                })
                .toList();
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
                h.getNewSellOrders(),
                h.getDeltaNewSellOrders(),
                h.getNewBuyOrders(),
                h.getDeltaNewBuyOrders(),
                h.getItemsListedSellOrders(),
                h.getItemsListedBuyOrders(),
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
