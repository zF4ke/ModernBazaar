package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.BazaarItemHourSummaryResponseDTO;
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
import static org.mockito.ArgumentMatchers.*;
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
                .newBuyOrders(10).newSellOrders(12)
                .deltaNewBuyOrders(2).deltaNewSellOrders(3)
                .itemsListedBuyOrders(500)
                .itemsListedSellOrders(600)
                .build();
    }

    @Test
    void getItemSummary_returns_hour_summary_with_name() {

        when(hourRepo.findLatestWithPoints("A")).thenReturn(List.of(sum));

        SkyblockItem sky = SkyblockItem.builder().id("A").name("Name A").build();
        BazaarItem item  = BazaarItem.builder().productId("A").skyblockItem(sky).build();
        when(itemRepo.findById("A")).thenReturn(Optional.of(item));

        BazaarItemHourSummaryResponseDTO dto = service.getItemSummary("A");

        assertThat(dto.productId()).isEqualTo("A");
        assertThat(dto.displayName()).isEqualTo("Name A");
        assertThat(dto.closeInstantBuyPrice()).isEqualTo(55);
        assertThat(dto.closeInstantSellPrice()).isEqualTo(110);
        assertThat(dto.points()).isEmpty();          // none mocked
    }
}
