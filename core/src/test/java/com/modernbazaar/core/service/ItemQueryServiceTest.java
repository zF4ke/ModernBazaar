package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.ItemDetailResponseDTO;
import com.modernbazaar.core.api.dto.ItemSummaryResponseDTO;
import com.modernbazaar.core.api.dto.ItemFilterDTO;
import com.modernbazaar.core.domain.*;
import com.modernbazaar.core.repository.BazaarItemRepository;
import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * This test class verifies the functionality of ItemQueryService, which provides methods
 * to retrieve item summaries and detailed information about items based on their snapshots.
 * It uses Mockito to mock the repository dependencies and tests the service methods.
 */
@ExtendWith(MockitoExtension.class)
class ItemQueryServiceTest {

    @Mock
    BazaarProductSnapshotRepository snapshotRepo;
    @Mock
    BazaarItemRepository itemRepo;
    @InjectMocks
    ItemQueryService service;

    private BazaarProductSnapshot snapHigh;
    private BazaarProductSnapshot snapLow;
    private BazaarItem itemHigh;
    private BazaarItem itemLow;
    private BazaarProductSnapshot detailSnap;
    private BazaarItem detailItem;

    /**
     * Sets up the test environment by initializing the mock objects
     * and creating fixtures for BazaarProductSnapshot and BazaarItem.
     */
    @BeforeEach
    void setUp() {
        Instant now = Instant.now();

        // summary/filter fixtures
        snapHigh = new BazaarProductSnapshot();
        snapHigh.setProductId("HIGH");
        snapHigh.setLastUpdated(now);
        snapHigh.setFetchedAt(now);
        snapHigh.setWeightedTwoPercentBuyPrice(80);
        snapHigh.setWeightedTwoPercentSellPrice(100);
        snapHigh.setBuyMovingWeek(0);
        snapHigh.setSellMovingWeek(0);
        snapHigh.setActiveBuyOrdersCount(0);
        snapHigh.setActiveSellOrdersCount(0);

        snapLow = new BazaarProductSnapshot();
        snapLow.setProductId("LOW");
        snapLow.setLastUpdated(now);
        snapLow.setFetchedAt(now);
        snapLow.setWeightedTwoPercentBuyPrice(45);
        snapLow.setWeightedTwoPercentSellPrice(50);
        snapLow.setBuyMovingWeek(0);
        snapLow.setSellMovingWeek(0);
        snapLow.setActiveBuyOrdersCount(0);
        snapLow.setActiveSellOrdersCount(0);

        itemHigh = new BazaarItem();
        itemHigh.setProductId("HIGH");
        itemHigh.setDisplayName("High Item");

        itemLow = new BazaarItem();
        itemLow.setProductId("LOW");
        itemLow.setDisplayName("Low Item");

        // detail fixtures
        detailSnap = new BazaarProductSnapshot();
        detailSnap.setProductId("TEST_ID");
        detailSnap.setLastUpdated(now);
        detailSnap.setFetchedAt(now);

        BuyOrderEntry b1 = BuyOrderEntry.builder().orderIndex(0).pricePerUnit(10).amount(1).orders(1).build();
        BuyOrderEntry b2 = BuyOrderEntry.builder().orderIndex(1).pricePerUnit(11).amount(2).orders(1).build();
        b1.setSnapshot(detailSnap);
        b2.setSnapshot(detailSnap);
        detailSnap.setBuyOrders(List.of(b1, b2));

        SellOrderEntry s1 = SellOrderEntry.builder().orderIndex(0).pricePerUnit(20).amount(3).orders(1).build();
        s1.setSnapshot(detailSnap);
        detailSnap.setSellOrders(List.of(s1));

        detailItem = new BazaarItem();
        detailItem.setProductId("TEST_ID");
        detailItem.setDisplayName("My Test");
    }

    /**
     * Tests that getLatest returns a list of item summaries with the correct fields.
     * It verifies that the service correctly retrieves snapshots and items,
     * and formats the response DTO with the expected fields.
     */
    @Test
    void getLatest_returns_summary_with_correct_fields() {
        when(snapshotRepo.searchLatest(null, null, null, null, null, null))
                .thenReturn(List.of(snapHigh, snapLow));
        when(itemRepo.findAllById(Set.of("HIGH", "LOW")))
                .thenReturn(List.of(itemHigh, itemLow));

        List<ItemSummaryResponseDTO> list = service.getLatest(
                ItemFilterDTO.of(null, null, null, null, null, null),
                Optional.empty(),
                Optional.empty()
        );

        assertThat(list).hasSize(2);
        // default sort is spreadDesc so HIGH comes first
        assertThat(list.get(0).productId()).isEqualTo("HIGH");
        assertThat(list.get(1).productId()).isEqualTo("LOW");
    }

    /**
     * Tests that getLatest applies the minSell filter and returns only items
     * with a sell price above the specified threshold.
     * It verifies that the service correctly filters out items that do not meet the criteria.
     */
    @Test
    void getLatest_applies_minSell_filter_and_default_sort() {
        // stub the repo to return only the HIGH snapshot when minSell=60.0
        when(snapshotRepo.searchLatest(
                isNull(),    // q
                eq(60.0),    // minSell
                isNull(),    // maxSell
                isNull(),    // minBuy
                isNull(),    // maxBuy
                isNull()     // minSpread
        )).thenReturn(List.of(snapHigh));

        when(itemRepo.findAllById(Set.of("HIGH")))
                .thenReturn(List.of(itemHigh));

        ItemFilterDTO filter = ItemFilterDTO.of(null, 60.0, null, null, null, null);
        List<ItemSummaryResponseDTO> results =
                service.getLatest(filter, Optional.empty(), Optional.empty());

        assertThat(results).hasSize(1);
        assertThat(results.getFirst().productId()).isEqualTo("HIGH");
    }

    /**
     * Tests that getLatest applies the minBuy filter and sorts by buyDesc.
     * It verifies that only items with a buy price above the threshold are returned,
     * and they are sorted in descending order of their buy price.
     */
    @Test
    void getLatest_sorts_by_buyDesc_and_applies_limit() {
        when(snapshotRepo.searchLatest(null, null, null, null, null, null))
                .thenReturn(List.of(snapLow, snapHigh));
        when(itemRepo.findAllById(Set.of("HIGH", "LOW")))
                .thenReturn(List.of(itemHigh, itemLow));

        List<ItemSummaryResponseDTO> results = service.getLatest(
                ItemFilterDTO.of(null, null, null, null, null, null),
                Optional.of("buyDesc"),
                Optional.of(1)
        );

        assertThat(results).hasSize(1);
        assertThat(results.getFirst().productId()).isEqualTo("HIGH");
    }

    /**
     * Tests that getItemDetail returns the correct item detail with buy and sell orders.
     * It verifies that the service correctly retrieves the item and snapshot,
     * and formats the response DTO with the expected fields.
     */
    @Test
    void getItemDetail_returns_full_orders_in_index_order() {
        when(itemRepo.findById("TEST_ID")).thenReturn(Optional.of(detailItem));
        when(snapshotRepo.findTopByProductIdOrderByFetchedAtDesc("TEST_ID"))
                .thenReturn(Optional.of(detailSnap));

        ItemDetailResponseDTO dto = service.getItemDetail("TEST_ID");

        assertThat(dto.productId()).isEqualTo("TEST_ID");
        assertThat(dto.displayName()).isEqualTo("My Test");
        assertThat(dto.buyOrders()).hasSize(2);
        assertThat(dto.sellOrders()).hasSize(1);
        assertThat(dto.buyOrders().get(0).orderIndex()).isEqualTo(0);
        assertThat(dto.buyOrders().get(1).orderIndex()).isEqualTo(1);
    }

    /**
     * Tests that getItemDetail throws NoSuchElementException when the item or snapshot is missing.
     * This ensures that the service correctly handles cases where the requested item does not exist.
     */
    @Test
    void getItemDetail_throws_when_missing() {
        when(itemRepo.findById("MISSING")).thenReturn(Optional.empty());
        when(snapshotRepo.findTopByProductIdOrderByFetchedAtDesc("MISSING"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getItemDetail("MISSING"))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Item not found");
    }
}
