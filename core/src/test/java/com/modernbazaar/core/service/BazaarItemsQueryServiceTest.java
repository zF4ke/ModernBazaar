package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.BazaarItemHourAverageResponseDTO;
import com.modernbazaar.core.api.dto.BazaarItemHourSummaryResponseDTO;
import com.modernbazaar.core.api.dto.BazaarItemLiveViewResponseDTO;
import com.modernbazaar.core.domain.*;
import com.modernbazaar.core.repository.BazaarItemHourSummaryRepository;
import com.modernbazaar.core.repository.BazaarItemRepository;
import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BazaarItemsQueryServiceTest {

    @Mock private BazaarProductSnapshotRepository snapshotRepo;
    @Mock private BazaarItemRepository            itemRepo;
    @Mock private BazaarItemHourSummaryRepository hourRepo;

    @InjectMocks
    private BazaarItemsQueryService service;

    private BazaarItemHourSummary sum;

    @BeforeEach
    void setUp() {
        Instant hr = Instant.parse("2025-07-26T10:00:00Z")
                .truncatedTo(ChronoUnit.HOURS);

        sum = BazaarItemHourSummary.builder()
                .id(1L)
                .productId("A")
                .hourStart(hr)
                .openInstantBuyPrice (50)
                .closeInstantBuyPrice(55)
                .minInstantBuyPrice  (49)
                .maxInstantBuyPrice  (56)
                .openInstantSellPrice(100)
                .closeInstantSellPrice(110)
                .minInstantSellPrice (98)
                .maxInstantSellPrice (111)
                .createdBuyOrders(10).createdSellOrders(12)
                .deltaBuyOrders(2).deltaSellOrders(3)
                .addedItemsSellOrders(500)
                .addedItemsBuyOrders(600)
                .build();
    }

    @Test
    void getItem_returns_live_view_with_hour_summary_and_name() {
        // ── no snapshot available
        when(snapshotRepo.findTopByProductIdOrderByFetchedAtDesc("A"))
                .thenReturn(Optional.empty());

        // ── return our hour summary
        when(hourRepo.findLatestWithPoints("A"))
                .thenReturn(List.of(sum));

        // ── stub the catalog lookup to supply the displayName
        SkyblockItem sky = SkyblockItem.builder()
                .id("A")
                .name("Name A")
                .build();
        BazaarItem item = BazaarItem.builder()
                .productId("A")
                .skyblockItem(sky)
                .build();
        when(itemRepo.findById("A"))
                .thenReturn(Optional.of(item));

        // ── invoke
        BazaarItemLiveViewResponseDTO dto = service.getItem("A");

        // ── assertions
        assertThat(dto.snapshot()).isNull();

        BazaarItemHourSummaryResponseDTO bar = dto.lastHourSummary();
        assertThat(bar).isNotNull();
        assertThat(bar.productId()).isEqualTo("A");
        assertThat(bar.displayName()).isEqualTo("Name A");
        assertThat(bar.closeInstantBuyPrice()).isEqualTo(55);
        assertThat(bar.closeInstantSellPrice()).isEqualTo(110);
        assertThat(bar.points()).isEmpty();
    }

    @Test
    void getLast48HourAverage_ShouldReturnAverageOfLast48Summaries() {
        // Given
        String productId = "TEST_ITEM";
        List<BazaarItemHourSummary> summaries = List.of(
            createHourSummary(productId, 100.0, 110.0, 90.0, 120.0, 200.0, 210.0, 190.0, 220.0, 10, 5, 15, 8, 100, 200),
            createHourSummary(productId, 105.0, 115.0, 95.0, 125.0, 205.0, 215.0, 195.0, 225.0, 12, 6, 18, 10, 120, 220)
        );

        when(hourRepo.findLastNByProductId(eq(productId), eq(48))).thenReturn(summaries);
        when(itemRepo.findById(productId)).thenReturn(Optional.empty());

        // When
        BazaarItemHourAverageResponseDTO result = service.getLast48HourAverage(productId);

        // Then
        assertNotNull(result);
        assertEquals(productId, result.productId());
        assertEquals(2, result.summaryCount());
        assertEquals(102.5, result.averageOpenInstantBuyPrice(), 0.01);
        assertEquals(112.5, result.averageCloseInstantBuyPrice(), 0.01);
        assertEquals(92.5, result.averageMinInstantBuyPrice(), 0.01);
        assertEquals(122.5, result.averageMaxInstantBuyPrice(), 0.01);
        assertEquals(202.5, result.averageOpenInstantSellPrice(), 0.01);
        assertEquals(212.5, result.averageCloseInstantSellPrice(), 0.01);
        assertEquals(192.5, result.averageMinInstantSellPrice(), 0.01);
        assertEquals(222.5, result.averageMaxInstantSellPrice(), 0.01);
        assertEquals(11.0, result.averageCreatedBuyOrders(), 0.01);
        assertEquals(5.5, result.averageDeltaBuyOrders(), 0.01);
        assertEquals(16.5, result.averageCreatedSellOrders(), 0.01);
        assertEquals(9.0, result.averageDeltaSellOrders(), 0.01);
        assertEquals(110.0, result.averageAddedItemsBuyOrders(), 0.01);
        assertEquals(210.0, result.averageAddedItemsSellOrders(), 0.01);
    }

    @Test
    void getLast48HourAverage_ShouldThrowException_WhenNoSummariesFound() {
        // Given
        String productId = "TEST_ITEM";
        when(hourRepo.findLastNByProductId(eq(productId), eq(48))).thenReturn(List.of());

        // When & Then
        assertThrows(java.util.NoSuchElementException.class, () -> {
            service.getLast48HourAverage(productId);
        });
    }

    private BazaarItemHourSummary createHourSummary(
            String productId,
            double openBuy, double closeBuy, double minBuy, double maxBuy,
            double openSell, double closeSell, double minSell, double maxSell,
            long createdBuy, long deltaBuy, long createdSell, long deltaSell,
            long addedBuy, long addedSell) {
        return BazaarItemHourSummary.builder()
                .productId(productId)
                .hourStart(Instant.now())
                .openInstantBuyPrice(openBuy)
                .closeInstantBuyPrice(closeBuy)
                .minInstantBuyPrice(minBuy)
                .maxInstantBuyPrice(maxBuy)
                .openInstantSellPrice(openSell)
                .closeInstantSellPrice(closeSell)
                .minInstantSellPrice(minSell)
                .maxInstantSellPrice(maxSell)
                .createdBuyOrders(createdBuy)
                .deltaBuyOrders(deltaBuy)
                .createdSellOrders(createdSell)
                .deltaSellOrders(deltaSell)
                .addedItemsBuyOrders(addedBuy)
                .addedItemsSellOrders(addedSell)
                .build();
    }
}
