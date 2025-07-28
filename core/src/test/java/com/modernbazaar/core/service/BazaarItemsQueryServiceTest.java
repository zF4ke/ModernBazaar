package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.*;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BazaarItemsQueryServiceTest {

    @Mock
    private BazaarProductSnapshotRepository snapshotRepo;

    @Mock
    private BazaarItemRepository itemRepo;

    @InjectMocks
    private BazaarItemsQueryService service;

    private BazaarItemSnapshot snapA;
    private BazaarItemSnapshot snapB;

    @BeforeEach
    void setUp() {
        Instant ts = Instant.parse("2025-07-26T10:00:00Z");

        snapA = BazaarItemSnapshot.builder()
                .id(1L)
                .productId("A")
                .lastUpdated(ts)
                .fetchedAt(ts.plusSeconds(1))
                .weightedTwoPercentBuyPrice(50.0)
                .weightedTwoPercentSellPrice(100.0) // spread 50
                .buyMovingWeek(10)
                .sellMovingWeek(20)
                .activeBuyOrdersCount(2)
                .activeSellOrdersCount(3)
                .build();

        snapB = BazaarItemSnapshot.builder()
                .id(2L)
                .productId("B")
                .lastUpdated(ts)
                .fetchedAt(ts.plusSeconds(2))
                .weightedTwoPercentBuyPrice(80.0)
                .weightedTwoPercentSellPrice(90.0) // spread 10
                .buyMovingWeek(5)
                .sellMovingWeek(7)
                .activeBuyOrdersCount(1)
                .activeSellOrdersCount(1)
                .build();
    }

    @Test
    void getLatest_maps_display_name_from_skyblock_item_and_sorts_when_requested() {
        when(snapshotRepo.searchLatest(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(snapA, snapB));

        // Prepare BazaarItem + SkyblockItem
        SkyblockItem skyA = SkyblockItem.builder().id("A").name("Name A").build();
        SkyblockItem skyB = SkyblockItem.builder().id("B").name("Name B").build();

        BazaarItem itemA = BazaarItem.builder().productId("A").skyblockItem(skyA).build();
        BazaarItem itemB = BazaarItem.builder().productId("B").skyblockItem(skyB).build();

        when(itemRepo.findAllWithSkyblockByIdIn(anySet()))
                .thenReturn(List.of(itemA, itemB));

        ItemFilterDTO filter = ItemFilterDTO.of(null, null, null, null, null, null);

        // sort by spreadDesc
        List<ItemSummaryResponseDTO> out = service.getLatest(filter, Optional.of("spreadDesc"), Optional.empty());

        assertThat(out).hasSize(2);
        assertThat(out.get(0).productId()).isEqualTo("A");
        assertThat(out.get(0).displayName()).isEqualTo("Name A");
        assertThat(out.get(0).spread()).isEqualTo(50.0);
        assertThat(out.get(1).productId()).isEqualTo("B");
        assertThat(out.get(1).displayName()).isEqualTo("Name B");
        assertThat(out.get(1).spread()).isEqualTo(10.0);
    }

    @Test
    void getItemDetail_returns_detail_with_orders_and_name_from_catalog() {
        // build orders
        BuyOrderEntry b0 = BuyOrderEntry.builder().orderIndex(0).pricePerUnit(55.0).amount(10).orders(2).build();
        SellOrderEntry s0 = SellOrderEntry.builder().orderIndex(0).pricePerUnit(95.0).amount(5).orders(1).build();

        snapA.getBuyOrders().add(b0);
        snapA.getSellOrders().add(s0);

        when(snapshotRepo.findTopByProductIdOrderByFetchedAtDesc("A"))
                .thenReturn(Optional.of(snapA));

        SkyblockItem skyA = SkyblockItem.builder().id("A").name("Name A").build();
        BazaarItem itemA = BazaarItem.builder().productId("A").skyblockItem(skyA).build();

        when(itemRepo.findById("A")).thenReturn(Optional.of(itemA));

        ItemDetailResponseDTO dto = service.getItemDetail("A");
        assertThat(dto.productId()).isEqualTo("A");
        assertThat(dto.displayName()).isEqualTo("Name A");
        assertThat(dto.buyOrders()).hasSize(1);
        assertThat(dto.sellOrders()).hasSize(1);
        assertThat(dto.weightedTwoPercentBuyPrice()).isEqualTo(50.0);
        assertThat(dto.weightedTwoPercentSellPrice()).isEqualTo(100.0);
    }
}
