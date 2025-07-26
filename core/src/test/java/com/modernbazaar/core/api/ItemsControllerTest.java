package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.OrderEntryResponseDTO;
import com.modernbazaar.core.api.dto.ItemDetailResponseDTO;
import com.modernbazaar.core.api.dto.ItemSummaryResponseDTO;
import com.modernbazaar.core.service.ItemQueryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * This test class verifies the functionality of the ItemsController, which provides endpoints
 * to retrieve item summaries and detailed information about items.
 * It uses Mockito to mock the ItemQueryService and tests the controller methods.
 */
@ExtendWith(MockitoExtension.class)
class ItemsControllerTest {

    @InjectMocks
    private ItemsController controller;

    @Mock
    private ItemQueryService service;

    private MockMvc mockMvc;

    /**
     * Sets up the test environment by initializing the MockMvc instance
     * with the ItemsController.
     */
    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(controller)
                .build();
    }

    /**
     * Tests the list endpoint of the ItemsController to ensure it returns a JSON array
     * of item summaries with the expected fields.
     */
    @Test
    void listEndpoint_returns_json_array() throws Exception {
        ItemSummaryResponseDTO summary = new ItemSummaryResponseDTO(
                "ID1","Name1",Instant.now(),Instant.now(),
                5.0,6.0,1.0,10L,20L,2,3
        );
        when(service.getLatest(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenReturn(List.of(summary));

        mockMvc.perform(get("/api/items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productId").value("ID1"))
                .andExpect(jsonPath("$[0].weightedTwoPercentBuyPrice").value(5.0))
                .andExpect(jsonPath("$[0].weightedTwoPercentSellPrice").value(6.0));
    }

    /**
     * Tests the detail endpoint of the ItemsController to ensure it returns detailed information
     * about a specific item, including its buy and sell orders.
     */
    @Test
    void detailEndpoint_returns_item_detail() throws Exception {
        ItemDetailResponseDTO detail = new ItemDetailResponseDTO(
                "ID2","Name2",Instant.now(),Instant.now(),
                7.0,8.0,1.0,15L,25L,1,1,
                List.of(new OrderEntryResponseDTO(0,7.0,1,1)),
                List.of(new OrderEntryResponseDTO(0,8.0,2,1))
        );
        when(service.getItemDetail("ID2")).thenReturn(detail);

        mockMvc.perform(get("/api/items/ID2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productId").value("ID2"))
                .andExpect(jsonPath("$.buyOrders[0].pricePerUnit").value(7.0))
                .andExpect(jsonPath("$.sellOrders[0].pricePerUnit").value(8.0));
    }
}
