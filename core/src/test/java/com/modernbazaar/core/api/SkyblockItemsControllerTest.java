package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.PagedResponseDTO;
import com.modernbazaar.core.api.dto.SkyblockItemDTO;
import com.modernbazaar.core.service.SkyblockItemsCatalogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class SkyblockItemsControllerTest {

    @InjectMocks
    private SkyblockItemsController controller;

    @Mock
    private SkyblockItemsCatalogService service;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void search_returns_paginated_json() throws Exception {
        SkyblockItemDTO a = new SkyblockItemDTO("A", "Name A", "MAT", null, "CAT", "RARE",
                123.0, "{\"DEFENSE\":10}", Instant.parse("2025-07-26T10:00:00Z"));
        SkyblockItemDTO b = new SkyblockItemDTO("B", "Name B", null, null, null, null,
                null, null, Instant.parse("2025-07-26T10:00:00Z"));

        PagedResponseDTO<SkyblockItemDTO> page =
                PagedResponseDTO.of(List.of(a, b), 0, 25);

        when(service.search(eq("farm"), eq("RARE"), eq("CHESTPLATE"), eq(true), isNull(), isNull(), eq(0), eq(25)))
                .thenReturn(page);

        mockMvc.perform(get("/api/skyblock/items")
                        .param("q", "farm")
                        .param("tier", "RARE")
                        .param("category", "CHESTPLATE")
                        .param("inBazaar", "true")
                        .param("page", "0")
                        .param("limit", "25"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value("A"))
                .andExpect(jsonPath("$.items[0].name").value("Name A"))
                .andExpect(jsonPath("$.items[1].id").value("B"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.limit").value(25))
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.hasPrevious").value(false));
    }

    @Test
    void getById_returns_item() throws Exception {
        SkyblockItemDTO dto = new SkyblockItemDTO("ID", "Name", null, null, null, null,
                null, null, Instant.parse("2025-07-26T10:00:00Z"));
        when(service.getById("ID")).thenReturn(dto);

        mockMvc.perform(get("/api/skyblock/items/ID"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ID"))
                .andExpect(jsonPath("$.name").value("Name"));
    }

    @Test
    void forceRefresh_invokes_service_and_returns_200() throws Exception {
        mockMvc.perform(post("/api/skyblock/items/refresh")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(service).forceRefresh();
    }

    @Test
    void refreshIfStale_returns_boolean() throws Exception {
        when(service.refreshIfStale(Duration.ofDays(7))).thenReturn(true);

        mockMvc.perform(post("/api/skyblock/items/refresh-if-stale")
                        .param("days", "7"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));

        verify(service).refreshIfStale(Duration.ofDays(7));
    }
}
