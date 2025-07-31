package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.*;
import com.modernbazaar.core.domain.*;
import com.modernbazaar.core.repository.*;
import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BazaarItemsQueryService {

    private final BazaarItemHourSummaryRepository hourRepo;
    private final BazaarProductSnapshotRepository snapRepo;
    private final BazaarItemRepository            itemRepo;

    /* ───────────────────── LIST ───────────────────── */

    @Transactional(readOnly = true)
    public PagedResponseDTO<BazaarItemHourSummaryResponseDTO> getLatestPaginated(
            BazaarItemFilterDTO filter, Optional<String> sort, int page, int limit) {

        var all = getLatest(filter, sort, Optional.empty());
        return PagedResponseDTO.of(all, page, limit);
    }

    @Transactional(readOnly = true)
    public List<BazaarItemHourSummaryResponseDTO> getLatest(
            BazaarItemFilterDTO filter, Optional<String> sort, Optional<Integer> limit) {

        List<BazaarItemHourSummary> rows = hourRepo.searchLatest(
                filter.q(), filter.minSell(), filter.maxSell(),
                filter.minBuy(), filter.maxBuy(), filter.minSpread());

        boolean useSnapshots = rows.isEmpty();
        List<BazaarItemHourSummaryResponseDTO> out =
                useSnapshots ? mapSnapshots(snapRepo.searchLatest(
                        filter.q(), filter.minSell(), filter.maxSell(),
                        filter.minBuy(), filter.maxBuy(), filter.minSpread()))
                        : mapSummaries(rows);

        sort.ifPresent(k -> out.sort(switch (k) {
            case "sellAsc"   -> Comparator.comparing(BazaarItemHourSummaryResponseDTO::closeInstantSellPrice);
            case "sellDesc"  -> Comparator.comparing(BazaarItemHourSummaryResponseDTO::closeInstantSellPrice).reversed();
            case "buyAsc"    -> Comparator.comparing(BazaarItemHourSummaryResponseDTO::closeInstantBuyPrice);
            case "buyDesc"   -> Comparator.comparing(BazaarItemHourSummaryResponseDTO::closeInstantBuyPrice).reversed();
            case "spreadAsc" -> Comparator.<BazaarItemHourSummaryResponseDTO, Double>comparing(dto ->
                    dto.closeInstantSellPrice() - dto.closeInstantBuyPrice());
            case "spreadDesc"-> Comparator.<BazaarItemHourSummaryResponseDTO, Double>comparing(dto ->
                    dto.closeInstantSellPrice() - dto.closeInstantBuyPrice()).reversed();
            default -> throw new IllegalArgumentException("Unknown sort key: " + k);
        }));

        return limit.filter(l -> l > 0 && l < out.size())
                .map(l -> out.subList(0, l))
                .orElse(out);
    }

    /* ───────────────────── DETAIL ─────────────────── */

    @Transactional(readOnly = true)
    public BazaarItemHourSummaryResponseDTO getItemSummary(String productId) {

        /* newest hour bar (with minute points) */
        BazaarItemHourSummary sum = hourRepo.findLatestWithPoints(productId)
                .stream().findFirst().orElse(null);

        String name = itemRepo.findById(productId)
                .map(BazaarItem::getSkyblockItem)
                .map(SkyblockItem::getName)
                .orElse(null);

        if (sum != null) {
            return buildDto(sum, name, true);
        }

        /* no hourly data yet → fabricate from last raw snapshot */
        BazaarItemSnapshot s = snapRepo.findTopByProductIdOrderByFetchedAtDesc(productId)
                .orElseThrow(() ->
                        new NoSuchElementException("Item not found: " + productId));

        Instant hourStart = s.getFetchedAt().truncatedTo(ChronoUnit.HOURS);

        BazaarItemHourPointDTO pt = new BazaarItemHourPointDTO(
                s.getFetchedAt(),
                s.getInstantBuyPrice(),
                s.getInstantSellPrice(),
                s.getActiveBuyOrdersCount(),
                s.getActiveSellOrdersCount(),
                s.getBuyOrders().stream()
                        .map(o -> new OrderEntryResponseDTO(
                                o.getOrderIndex(), o.getPricePerUnit(),
                                o.getAmount(),     o.getOrders()))
                        .toList(),
                s.getSellOrders().stream()
                        .map(o -> new OrderEntryResponseDTO(
                                o.getOrderIndex(), o.getPricePerUnit(),
                                o.getAmount(),     o.getOrders()))
                        .toList());

        return new BazaarItemHourSummaryResponseDTO(
                s.getProductId(), name,
                hourStart,

                s.getInstantBuyPrice(),  s.getInstantBuyPrice(),
                s.getInstantBuyPrice(),  s.getInstantBuyPrice(),

                s.getInstantSellPrice(), s.getInstantSellPrice(),
                s.getInstantSellPrice(), s.getInstantSellPrice(),

                0,0,0,0,0,0,
                List.of(pt)
        );
    }

    /* ───────────────────── HISTORY ────────────────── */

    @Transactional(readOnly = true)
    public List<BazaarItemHourSummaryResponseDTO> getHistory(
            String productId, Instant from, Instant to, boolean withPoints) {

        Instant start = from != null ? from : Instant.EPOCH;
        Instant end   = to   != null ? to   : Instant.now();

        if (!start.isBefore(end))
            throw new IllegalArgumentException("'from' must be before 'to'");

        List<BazaarItemHourSummary> rows = withPoints
                ? hourRepo.findRangeWithPoints(productId, start, end)
                : hourRepo.findRange(productId,          start, end);

        if (rows.isEmpty())
            throw new NoSuchElementException("No data for product " + productId);

        return rows.stream()
                .map(r -> BazaarItemHourSummaryResponseDTO.of(r, withPoints))
                .toList();
    }

    /* ───────────────────── helpers ────────────────── */

    private Map<String,String> preloadNames(Set<String> ids) {
        return itemRepo.findAllByProductIdIn(ids).stream()
                .filter(it -> it.getSkyblockItem() != null)
                .collect(Collectors.toMap(
                        BazaarItem::getProductId,
                        it -> it.getSkyblockItem().getName()));
    }

    private List<BazaarItemHourSummaryResponseDTO> mapSummaries(List<BazaarItemHourSummary> rows) {
        Map<String,String> names = preloadNames(rows.stream()
                .map(BazaarItemHourSummary::getProductId)
                .collect(Collectors.toSet()));

        return rows.stream()
                .map(r -> buildDto(r, names.get(r.getProductId()), false))
                .toList();
    }

    private List<BazaarItemHourSummaryResponseDTO> mapSnapshots(List<BazaarItemSnapshot> snaps) {
        Map<String,String> names = preloadNames(snaps.stream()
                .map(BazaarItemSnapshot::getProductId)
                .collect(Collectors.toSet()));
        return snaps.stream().map(s -> {
            Instant hourStart = s.getFetchedAt().truncatedTo(ChronoUnit.HOURS);
            return new BazaarItemHourSummaryResponseDTO(
                    s.getProductId(), names.get(s.getProductId()),
                    hourStart,
                    s.getInstantBuyPrice(),  s.getInstantBuyPrice(),
                    s.getInstantBuyPrice(),  s.getInstantBuyPrice(),
                    s.getInstantSellPrice(), s.getInstantSellPrice(),
                    s.getInstantSellPrice(), s.getInstantSellPrice(),
                    0,0,0,0,0,0,
                    List.of()          // no points kept yet
            );
        }).toList();
    }

    /** Builds the DTO and injects the (possibly-null) Skyblock display name. */
    private BazaarItemHourSummaryResponseDTO buildDto(BazaarItemHourSummary h,
                                                      @Nullable String name,
                                                      boolean withPoints) {

        return new BazaarItemHourSummaryResponseDTO(
                h.getProductId(),           // productId
                name,                       // displayName
                h.getHourStart(),           // hour bucket

                h.getOpenInstantBuyPrice(),
                h.getCloseInstantBuyPrice(),
                h.getMinInstantBuyPrice(),
                h.getMaxInstantBuyPrice(),

                h.getOpenInstantSellPrice(),
                h.getCloseInstantSellPrice(),
                h.getMinInstantSellPrice(),
                h.getMaxInstantSellPrice(),

                h.getNewSellOrders(),       h.getDeltaNewSellOrders(),
                h.getNewBuyOrders(),        h.getDeltaNewBuyOrders(),
                h.getItemsListedSellOrders(),
                h.getItemsListedBuyOrders(),

                (withPoints && h.getPoints() != null)
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
                                                o.getOrderIndex(),
                                                o.getPricePerUnit(),
                                                o.getAmount(),
                                                o.getOrders()))
                                        .toList(),
                                p.getSellOrders().stream()
                                        .map(o -> new OrderEntryResponseDTO(
                                                o.getOrderIndex(),
                                                o.getPricePerUnit(),
                                                o.getAmount(),
                                                o.getOrders()))
                                        .toList()))
                        .toList()
                        : List.of()
        );
    }
}
