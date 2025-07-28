package com.modernbazaar.core.api;

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
import static org.mockito.Mockito.*;
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
    void search_returns_list() throws Exception {
        SkyblockItemDTO a = new SkyblockItemDTO("A", "Name A", "MAT", null, "CAT", "RARE",
                123.0, "{\"DEFENSE\":10}", Instant.parse("2025-07-26T10:00:00Z"));
        SkyblockItemDTO b = new SkyblockItemDTO("B", "Name B", null, null, null, null,
                null, null, Instant.parse("2025-07-26T10:00:00Z"));

        when(service.search(eq("farm"), eq("RARE"), eq("CHESTPLATE"), eq(true), eq(25)))
                .thenReturn(List.of(a, b));

        mockMvc.perform(get("/api/skyblock/items")
                        .param("q", "farm")
                        .param("tier", "RARE")
                        .param("category", "CHESTPLATE")
                        .param("inBazaar", "true")
                        .param("limit", "25"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("A"))
                .andExpect(jsonPath("$[0].name").value("Name A"))
                .andExpect(jsonPath("$[1].id").value("B"));
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
