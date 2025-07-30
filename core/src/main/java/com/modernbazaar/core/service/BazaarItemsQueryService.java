package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.*;
import com.modernbazaar.core.domain.*;
import com.modernbazaar.core.repository.BazaarItemHourSummaryRepository;
import com.modernbazaar.core.repository.BazaarItemRepository;
import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BazaarItemsQueryService {

    private final BazaarProductSnapshotRepository snapshotRepo;
    private final BazaarItemRepository itemRepo;
    private final BazaarItemHourSummaryRepository hourSummaryRepo;

    /**
     * Fetches the latest BazaarProductSnapshots based on the provided filter criteria with pagination.
     * This method retrieves snapshots that match the filter conditions, sorts them according to the specified sort order,
     * and returns paginated results.
     *
     * @param filter the filter criteria to apply when searching for items
     * @param sort an optional sort order, which can be one of the following: sellAsc, sellDesc, buyAsc,
     *            buyDesc, spreadAsc, spreadDesc.
     * @param page the page number (0-based)
     * @param limit the number of items per page
     * @return a PagedItemsResponseDTO containing the paginated item summaries
     */
    @Transactional(readOnly = true)
    public PagedResponseDTO<BazaarItemSummaryResponseDTO> getLatestPaginated(BazaarItemFilterDTO filter, Optional<String> sort, int page, int limit) {
        List<BazaarItemSummaryResponseDTO> allItems = getLatest(filter, sort, Optional.empty());
        return PagedResponseDTO.of(allItems, page, limit);
    }

    /**
     * Fetches the latest BazaarProductSnapshots based on the provided filter criteria.
     * This method retrieves snapshots that match the filter conditions, sorts them according to the specified sort order,
     * and limits the results to the specified number if provided.
     *
     * @param filter the filter criteria to apply when searching for items
     * @param sort an optional sort order, which can be one of the following: sellAsc, sellDesc, buyAsc,
     *            buyDesc, spreadAsc, spreadDesc.
     * @param limit an optional limit on the number of results to return
     * @return a list of ItemSummaryResponseDTO containing the latest item summaries
     */
    @Transactional(readOnly = true)
    public List<BazaarItemSummaryResponseDTO> getLatest(BazaarItemFilterDTO filter, Optional<String> sort, Optional<Integer> limit) {
        List<BazaarItemSnapshot> snaps = snapshotRepo.searchLatest(
                filter.q(), filter.minSell(), filter.maxSell(),
                filter.minBuy(), filter.maxBuy(), filter.minSpread()
        );

        // Preload BazaarItem + SkyblockItem for all productIds to avoid N+1.
        Set<String> ids = snaps.stream().map(BazaarItemSnapshot::getProductId).collect(Collectors.toSet());
        List<BazaarItem> items = itemRepo.findAllWithSkyblockByIdIn(ids);
        Map<String, BazaarItem> byId = items.stream()
                .collect(Collectors.toMap(BazaarItem::getProductId, Function.identity()));

        List<BazaarItemSummaryResponseDTO> list = snaps.stream()
                .map(s -> toSummaryDTO(s, byId.get(s.getProductId())))
                .collect(Collectors.toList());

        // optional sorting
        sort.ifPresent(key -> {
            Comparator<BazaarItemSummaryResponseDTO> cmp = switch (key) {
                case "sellAsc"   -> Comparator.comparing(BazaarItemSummaryResponseDTO::instantSellPrice);
                case "sellDesc"  -> Comparator.comparing(BazaarItemSummaryResponseDTO::instantSellPrice).reversed();
                case "buyAsc"    -> Comparator.comparing(BazaarItemSummaryResponseDTO::instantBuyPrice);
                case "buyDesc"   -> Comparator.comparing(BazaarItemSummaryResponseDTO::instantBuyPrice).reversed();
                case "spreadAsc" -> Comparator.comparing(BazaarItemSummaryResponseDTO::spread);
                case "spreadDesc"-> Comparator.comparing(BazaarItemSummaryResponseDTO::spread).reversed();
                default -> null;
            };

            if (cmp != null) {
                list.sort(cmp);
            }
        });

        return limit.filter(l -> l > 0 && l < list.size())
                .map(l -> list.subList(0, l))
                .orElse(list);
    }

    @Transactional(readOnly = true)
    public BazaarItemDetailResponseDTO getItemDetail(String productId) {
        BazaarItem item = itemRepo.findById(productId).orElse(null);
        BazaarItemSnapshot snap = snapshotRepo
                .findTopByProductIdOrderByFetchedAtDesc(productId)
                .orElseThrow(() -> new NoSuchElementException("Item not found: " + productId));
        return toDetailDTO(snap, item);
    }

    /**
     * Fetches the BazaarItemSnapshot for a specific product ID.
     * This method retrieves the most recent snapshot for the given product ID.
     *
     * @param productId the ID of the product to fetch
     * @return a BazaarItemSnapshotResponseDTO containing the snapshot details
     */
    @Transactional(readOnly = true)
    public List<BazaarHourSummaryResponseDTO> getHistory(
            String  productId,
            Instant from,          // may be null
            Instant to,            // may be null
            boolean withPoints) {

        // normalise range
        Instant start = (from != null) ? from : Instant.EPOCH; // “since forever”
        Instant end   = (to   != null) ? to   : Instant.now(); // “until now”

        if (!start.isBefore(end)) {
            throw new IllegalArgumentException("'from' must be before 'to' (or both null)");
        }

        List<BazaarItemHourSummary> rows = withPoints
                ? hourSummaryRepo.findRangeWithPoints(productId, start, end)
                : hourSummaryRepo.findRange(productId,          start, end);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("No data for product " + productId);
        }

        // build DTOs (already ordered ASC in JPQL)
        return rows.stream()
                .map(s -> BazaarHourSummaryResponseDTO.of(s, withPoints))
                .toList();
    }


    // ── mapping ────────────────────────────────────────────────────────────────

    /**
     * Converts a BazaarProductSnapshot to an ItemSummaryResponseDTO.
     * This method extracts the necessary fields from the snapshot and the associated BazaarItem
     *
     * @param s the BazaarProductSnapshot to convert
     * @param item the associated BazaarItem, may be null if not found
     * @return an ItemSummaryResponseDTO containing the summary information
     */
    private BazaarItemSummaryResponseDTO toSummaryDTO(BazaarItemSnapshot s, BazaarItem item) {
        String name = null;
        if (item != null && item.getSkyblockItem() != null) {
            name = item.getSkyblockItem().getName();
        }

        double buy  = s.getInstantBuyPrice();
        double sell = s.getInstantSellPrice();

        return new BazaarItemSummaryResponseDTO(
                s.getProductId(),
                name,
                s.getLastUpdated(),
                s.getFetchedAt(),
                s.getWeightedTwoPercentBuyPrice(),
                s.getWeightedTwoPercentSellPrice(),
                buy,
                sell,
                sell - buy,
                s.getBuyMovingWeek(),
                s.getSellMovingWeek(),
                s.getActiveBuyOrdersCount(),
                s.getActiveSellOrdersCount()
        );
    }

    /**
     * Converts a BazaarProductSnapshot to an ItemDetailResponseDTO.
     * This method extracts detailed order information and the associated BazaarItem.
     *
     * @param s the BazaarProductSnapshot to convert
     * @param item the associated BazaarItem, may be null if not found
     * @return an ItemDetailResponseDTO containing detailed information about the item
     */
    private BazaarItemDetailResponseDTO toDetailDTO(BazaarItemSnapshot s, BazaarItem item) {
        String name = null;
        if (item != null && item.getSkyblockItem() != null) {
            name = item.getSkyblockItem().getName();
        }

        double buy  = s.getInstantBuyPrice();
        double sell = s.getInstantSellPrice();

        List<OrderEntryResponseDTO> buyOrders = s.getBuyOrders().stream()
                .sorted(Comparator.comparingInt(BuyOrderEntry::getOrderIndex))
                .map(o -> new OrderEntryResponseDTO(o.getOrderIndex(), o.getPricePerUnit(), o.getAmount(), o.getOrders()))
                .toList();

        List<OrderEntryResponseDTO> sellOrders = s.getSellOrders().stream()
                .sorted(Comparator.comparingInt(SellOrderEntry::getOrderIndex))
                .map(o -> new OrderEntryResponseDTO(o.getOrderIndex(), o.getPricePerUnit(), o.getAmount(), o.getOrders()))
                .toList();

        return new BazaarItemDetailResponseDTO(
                s.getProductId(),
                name,
                s.getLastUpdated(),
                s.getFetchedAt(),
                s.getWeightedTwoPercentBuyPrice(),
                s.getWeightedTwoPercentSellPrice(),
                buy,
                sell,
                sell - buy,
                s.getBuyMovingWeek(),
                s.getSellMovingWeek(),
                s.getActiveBuyOrdersCount(),
                s.getActiveSellOrdersCount(),
                buyOrders,
                sellOrders
        );
    }
}
