package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.*;
import com.modernbazaar.core.domain.BazaarItem;
import com.modernbazaar.core.domain.BazaarProductSnapshot;
import com.modernbazaar.core.domain.BuyOrderEntry;
import com.modernbazaar.core.domain.SellOrderEntry;
import com.modernbazaar.core.repository.BazaarItemRepository;
import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ItemQueryService {

    private final BazaarProductSnapshotRepository snapshotRepo;
    private final BazaarItemRepository itemRepo;

    /**
     * Fetches the latest BazaarProductSnapshots based on the provided filter criteria.
     * This method retrieves snapshots that match the filter conditions, sorts them according to the specified sort order,
     * and limits the results to the specified number if provided.
     *
     * @param filter the filter criteria to apply when searching for items
     * @param sort an optional sort order, which can be one of the following: sellAsc, sellDesc, buyAsc,
     *            buyDesc, spreadAsc, spreadDesc. If not provided, defaults to "spreadDesc".
     * @param limit an optional limit on the number of results to return
     * @return a list of ItemSummaryResponseDTO containing the latest item summaries
     */
    public List<ItemSummaryResponseDTO> getLatest(ItemFilterDTO filter, Optional<String> sort, Optional<Integer> limit) {
        var snapshots = snapshotRepo.searchLatest(
                filter.q(), filter.minSell(), filter.maxSell(),
                filter.minBuy(), filter.maxBuy(), filter.minSpread()
        );

        // join with items for displayName
        var idToItem = itemRepo.findAllById(
                snapshots.stream().map(BazaarProductSnapshot::getProductId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(BazaarItem::getProductId, Function.identity()));

        var list = snapshots.stream()
                .map(s -> toSummaryDTO(s, idToItem.get(s.getProductId())))
                .collect(Collectors.toList());

        // sorting
        Comparator<ItemSummaryResponseDTO> cmp = switch (sort.orElse("spreadDesc")) {
            case "sellAsc"   -> Comparator.comparing(ItemSummaryResponseDTO::weightedTwoPercentSellPrice);
            case "sellDesc"  -> Comparator.comparing(ItemSummaryResponseDTO::weightedTwoPercentSellPrice).reversed();
            case "buyAsc"    -> Comparator.comparing(ItemSummaryResponseDTO::weightedTwoPercentBuyPrice);
            case "buyDesc"   -> Comparator.comparing(ItemSummaryResponseDTO::weightedTwoPercentBuyPrice).reversed();
            case "spreadAsc" -> Comparator.comparing(ItemSummaryResponseDTO::spread);
            default          -> Comparator.comparing(ItemSummaryResponseDTO::spread).reversed();
        };
        list.sort(cmp);

        return limit.filter(l -> l > 0 && l < list.size())
                .map(l -> list.subList(0, l))
                .orElse(list);
    }

    @Transactional(readOnly = true)
    public ItemDetailResponseDTO getItemDetail(String productId) {
        var item = itemRepo.findById(productId).orElse(null);
        var snap = snapshotRepo
                .findTopByProductIdOrderByFetchedAtDesc(productId)      // ← uses EntityGraph
                .orElseThrow(() -> new NoSuchElementException("Item not found: " + productId));
        return toDetailDTO(snap, item);
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
    private ItemSummaryResponseDTO toSummaryDTO(BazaarProductSnapshot s, BazaarItem item) {
        double weightedTwoPercentBuyPrice  = s.getWeightedTwoPercentBuyPrice();
        double weightedTwoPercentSellPrice = s.getWeightedTwoPercentSellPrice();
        return new ItemSummaryResponseDTO(
                s.getProductId(),
                item != null ? item.getDisplayName() : null,
                s.getLastUpdated(),
                s.getFetchedAt(),
                weightedTwoPercentBuyPrice,
                weightedTwoPercentSellPrice,
                weightedTwoPercentSellPrice - weightedTwoPercentBuyPrice, // spread
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
    private ItemDetailResponseDTO toDetailDTO(BazaarProductSnapshot s, BazaarItem item) {
        double buy  = s.getWeightedTwoPercentBuyPrice();
        double sell = s.getWeightedTwoPercentSellPrice();

        var buyOrders = s.getBuyOrders().stream()
                .sorted(Comparator.comparingInt(BuyOrderEntry::getOrderIndex))
                .map(o -> new OrderEntryResponseDTO(o.getOrderIndex(), o.getPricePerUnit(), o.getAmount(), o.getOrders()))
                .toList();

        var sellOrders = s.getSellOrders().stream()
                .sorted(Comparator.comparingInt(SellOrderEntry::getOrderIndex))
                .map(o -> new OrderEntryResponseDTO(o.getOrderIndex(), o.getPricePerUnit(), o.getAmount(), o.getOrders()))
                .toList();

        return new ItemDetailResponseDTO(
                s.getProductId(),
                item != null ? item.getDisplayName() : null,
                s.getLastUpdated(),
                s.getFetchedAt(),
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
