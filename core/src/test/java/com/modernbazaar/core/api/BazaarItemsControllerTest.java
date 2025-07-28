package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.*;
import com.modernbazaar.core.service.BazaarItemsQueryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class BazaarItemsControllerTest {

    @InjectMocks
    private BazaarItemsController controller;

    @Mock
    private BazaarItemsQueryService service;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void listEndpoint_returns_json_array() throws Exception {
        BazaarItemSummaryResponseDTO summary = new BazaarItemSummaryResponseDTO(
                "ID1", "Name1",
                Instant.parse("2025-07-26T10:00:00Z"),
                Instant.parse("2025-07-26T10:00:05Z"),
                5.0, 6.0, 1.0,
                10L, 20L, 2, 3
        );
        PagedItemsResponseDTO page = PagedItemsResponseDTO.of(List.of(summary), 0, 50);

        when(service.getLatestPaginated(
                any(BazaarItemFilterDTO.class),
                eq(Optional.empty()), // no default sort anymore
                eq(0), eq(50))
        ).thenReturn(page);

        mockMvc.perform(get("/api/bazaar/items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].productId").value("ID1"))
                .andExpect(jsonPath("$.items[0].weightedTwoPercentBuyPrice").value(5.0))
                .andExpect(jsonPath("$.items[0].weightedTwoPercentSellPrice").value(6.0))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.limit").value(50))
                .andExpect(jsonPath("$.totalItems").value(1))      // <-- was $.total
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.hasPrevious").value(false));
    }

    @Test
    void detailEndpoint_returns_item_detail() throws Exception {
        BazaarItemDetailResponseDTO detail = new BazaarItemDetailResponseDTO(
                "ID2", "Name2",
                Instant.parse("2025-07-26T10:00:00Z"),
                Instant.parse("2025-07-26T10:00:05Z"),
                7.0, 8.0, 1.0,
                15L, 25L, 1, 1,
                List.of(new OrderEntryResponseDTO(0, 7.0, 1, 1)),
                List.of(new OrderEntryResponseDTO(0, 8.0, 2, 1))
        );

        when(service.getItemDetail("ID2")).thenReturn(detail);

        mockMvc.perform(get("/api/bazaar/items/ID2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productId").value("ID2"))
                .andExpect(jsonPath("$.buyOrders[0].pricePerUnit").value(7.0))
                .andExpect(jsonPath("$.sellOrders[0].pricePerUnit").value(8.0));
    }
}
