package com.modernbazaar.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.modernbazaar.core.api.dto.PagedResponseDTO;
import com.modernbazaar.core.api.dto.SkyblockItemDTO;
import com.modernbazaar.core.domain.SkyblockItem;
import com.modernbazaar.core.dto.RawSkyblockItem;
import com.modernbazaar.core.dto.RawSkyblockItemsResponse;
import com.modernbazaar.core.repository.SkyblockItemRepository;
import com.modernbazaar.core.util.RawSkyblockItemToItemMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SkyblockItemsCatalogServiceTest {

    @Mock
    private SkyblockItemRepository repo;

    @Mock
    private RawSkyblockItemToItemMapper mapper;

    @Test
    void refreshIfStale_returns_false_when_recent() {
        WebClient wc = WebClient.builder().exchangeFunction(req ->
                Mono.just(jsonResponse("{}"))
        ).build();

        SkyblockItemsCatalogService svc = new SkyblockItemsCatalogService(wc, repo, mapper);

        when(repo.findMaxLastRefreshed()).thenReturn(Instant.now().minus(Duration.ofHours(6)));

        boolean refreshed = svc.refreshIfStale(Duration.ofDays(2));
        assertThat(refreshed).isFalse();
        verify(repo, never()).saveAll(anyList());
    }

    @Test
    void refreshIfStale_triggers_forceRefresh_and_upserts_new_and_changed_items() throws Exception {
        RawSkyblockItemsResponse payload = new RawSkyblockItemsResponse();
        payload.setSuccess(true);
        payload.setItems(List.of(
                raw("NEW_ID", "New Item"),
                raw("EXISTING_ID", "Existing Item Updated")
        ));

        String json = new ObjectMapper().writeValueAsString(payload);
        WebClient wc = WebClient.builder().exchangeFunction(req ->
                Mono.just(jsonResponse(json))
        ).build();

        SkyblockItemsCatalogService svc = new SkyblockItemsCatalogService(wc, repo, mapper);

        when(repo.findMaxLastRefreshed()).thenReturn(Instant.now().minus(Duration.ofDays(10)));

        SkyblockItem existing = SkyblockItem.builder()
                .id("EXISTING_ID").name("Old Name").build();
        when(repo.findAllByIdIn(argThat(set -> set.containsAll(Set.of("NEW_ID", "EXISTING_ID")))))
                .thenReturn(List.of(existing));

        when(mapper.toEntity(any(RawSkyblockItem.class), any()))
                .thenAnswer(inv -> {
                    RawSkyblockItem r = inv.getArgument(0);
                    Instant ts = inv.getArgument(1);
                    return SkyblockItem.builder()
                            .id(r.getId())
                            .name(r.getName())
                            .lastRefreshed(ts)
                            .build();
                });

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<SkyblockItem>> cap = ArgumentCaptor.forClass(List.class);
        when(repo.saveAll(cap.capture())).thenAnswer(inv -> inv.getArgument(0));

        boolean refreshed = svc.refreshIfStale(Duration.ofDays(2));
        assertThat(refreshed).isTrue();

        List<SkyblockItem> saved = cap.getValue();
        assertThat(saved).extracting(SkyblockItem::getId)
                .containsExactlyInAnyOrder("NEW_ID", "EXISTING_ID");

        assertThat(saved.stream().filter(s -> s.getId().equals("EXISTING_ID")).findFirst().get().getName())
                .isEqualTo("Existing Item Updated");
    }

    @Test
    void forceRefresh_handles_empty_or_failure_response_gracefully() throws Exception {
        RawSkyblockItemsResponse payload = new RawSkyblockItemsResponse();
        payload.setSuccess(false);
        payload.setItems(null);

        String json = new ObjectMapper().writeValueAsString(payload);
        WebClient wc = WebClient.builder().exchangeFunction(req ->
                Mono.just(jsonResponse(json))
        ).build();

        SkyblockItemsCatalogService svc = new SkyblockItemsCatalogService(wc, repo, mapper);

        svc.forceRefresh();

        verify(repo, never()).saveAll(anyList());
    }

    @Test
    void search_returns_paged_dtos_from_repo_page() {
        WebClient wc = WebClient.builder().build();
        SkyblockItemsCatalogService svc = new SkyblockItemsCatalogService(wc, repo, mapper);

        SkyblockItem e1 = SkyblockItem.builder().id("A").name("Name A").build();
        SkyblockItem e2 = SkyblockItem.builder().id("B").name("Name B").build();

        when(repo.search(any(), any(), any(), anyBoolean(), isNull(), isNull(), eq(PageRequest.of(1, 2))))
                .thenReturn(new PageImpl<>(List.of(e1, e2), PageRequest.of(1, 2), 5));

        PagedResponseDTO<SkyblockItemDTO> out = svc.search(null, null, null, false, null, null,1, 2);

        assertThat(out.items()).hasSize(2);
        assertThat(out.totalItems()).isEqualTo(5);
        assertThat(out.totalPages()).isEqualTo(3);
        assertThat(out.page()).isEqualTo(1);
        assertThat(out.limit()).isEqualTo(2);
        assertThat(out.hasNext()).isTrue();
        assertThat(out.hasPrevious()).isTrue();
        assertThat(out.items().get(0).id()).isEqualTo("A");
        assertThat(out.items().get(1).id()).isEqualTo("B");
    }

    @Test
    void getById_maps_entity_to_dto() {
        WebClient wc = WebClient.builder().build();
        SkyblockItemsCatalogService svc = new SkyblockItemsCatalogService(wc, repo, mapper);

        SkyblockItem e = SkyblockItem.builder()
                .id("X").name("Name X").material("MAT").category("CAT").tier("RARE")
                .npcSellPrice(10.0).statsJson("{\"DEFENSE\":10}")
                .lastRefreshed(Instant.parse("2025-07-26T10:00:00Z"))
                .build();

        when(repo.findById("X")).thenReturn(Optional.of(e));

        SkyblockItemDTO dto = svc.getById("X");
        assertThat(dto.id()).isEqualTo("X");
        assertThat(dto.name()).isEqualTo("Name X");
        assertThat(dto.material()).isEqualTo("MAT");
        assertThat(dto.category()).isEqualTo("CAT");
        assertThat(dto.tier()).isEqualTo("RARE");
        assertThat(dto.npcSellPrice()).isEqualTo(10.0);
        assertThat(dto.statsJson()).isEqualTo("{\"DEFENSE\":10}");
    }

    private static RawSkyblockItem raw(String id, String name) {
        RawSkyblockItem r = new RawSkyblockItem();
        r.setId(id);
        r.setName(name);
        return r;
    }

    private static ClientResponse jsonResponse(String json) {
        return ClientResponse
                .create(HttpStatus.OK)
                .headers(h -> h.add("Content-Type", "application/json"))
                .body(json)
                .build();
    }
}
