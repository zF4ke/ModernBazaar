package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.*;
import com.modernbazaar.core.service.BazaarItemsQueryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
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

        BazaarItemHourSummaryResponseDTO summary =
                new BazaarItemHourSummaryResponseDTO(
                        "ID1","Name1",
                        Instant.parse("2025-07-26T10:00:00Z"),
                        5,6,5,6, 5,6,5,6,
                        10,20,15,25,
                        100,200,
                        null);


        PagedResponseDTO<BazaarItemHourSummaryResponseDTO> page =
                PagedResponseDTO.of(List.of(summary),0,50);

        when(service.getLatestPaginated(any(), eq(Optional.empty()), eq(0),eq(50)))
                .thenReturn(page);

        mockMvc.perform(get("/api/bazaar/items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].productId").value("ID1"))
                .andExpect(jsonPath("$.items[0].displayName").value("Name1"))
                .andExpect(jsonPath("$.totalItems").value(1));
    }
}
