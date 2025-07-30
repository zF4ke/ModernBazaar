package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.PagedResponseDTO;
import com.modernbazaar.core.api.dto.SkyblockItemDTO;
import com.modernbazaar.core.domain.SkyblockItem;
import com.modernbazaar.core.dto.RawSkyblockItem;
import com.modernbazaar.core.dto.RawSkyblockItemsResponse;
import com.modernbazaar.core.repository.SkyblockItemRepository;
import com.modernbazaar.core.util.RawSkyblockItemToItemMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SkyblockItemsCatalogService {

    private final WebClient webClient;
    private final SkyblockItemRepository repo;
    private final RawSkyblockItemToItemMapper mapper;

    private static final String ITEMS_URI = "/resources/skyblock/items";

    @Transactional(readOnly = true)
    public PagedResponseDTO<SkyblockItemDTO> search(
            String q,
            String tier,
            String category,
            boolean inBazaar,
            Double minNpc,
            Double maxNpc,
            int page,
            int limit
    ) {
        Page<SkyblockItem> p = repo.search(
                q,
                tier,
                category,
                inBazaar,
                minNpc,
                maxNpc,
                PageRequest.of(page, limit)
        );
        Page<SkyblockItemDTO> dtoPage = p.map(this::toDTO);
        return PagedResponseDTO.fromPage(dtoPage);
    }

    @Transactional(readOnly = true)
    public SkyblockItemDTO getById(String id) {
        SkyblockItem item = repo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Item not found: " + id));
        return toDTO(item);
    }

    @Transactional
    public boolean refreshIfStale(Duration maxAge) {
        Instant newest = repo.findMaxLastRefreshed();
        if (newest != null && newest.isAfter(Instant.now().minus(maxAge))) {
            return false;
        }
        forceRefresh();
        return true;
    }

    @Transactional
    public void forceRefresh() {
        RawSkyblockItemsResponse resp = webClient.get()
                .uri(ITEMS_URI)
                .retrieve()
                .bodyToMono(RawSkyblockItemsResponse.class)
                .block();

        if (resp == null || !resp.isSuccess() || resp.getItems() == null) {
            log.warn("Skyblock items fetch failed or returned empty.");
            return;
        }

        Instant refreshedAt = Instant.now();
        List<RawSkyblockItem> rawItems = resp.getItems();

        Set<String> ids = rawItems.stream().map(RawSkyblockItem::getId).collect(Collectors.toSet());
        Map<String, SkyblockItem> existing = repo.findAllByIdIn(ids).stream()
                .collect(Collectors.toMap(SkyblockItem::getId, it -> it));

        List<SkyblockItem> toSave = new ArrayList<>(rawItems.size());
        for (RawSkyblockItem raw : rawItems) {
            SkyblockItem current = mapper.toEntity(raw, refreshedAt);
            SkyblockItem prior = existing.get(current.getId());
            if (prior == null) {
                toSave.add(current);
            } else if (needsUpdate(prior, current)) {
                current.setId(prior.getId());
                toSave.add(current);
            }
        }

        if (!toSave.isEmpty()) {
            repo.saveAll(toSave);
            log.info("Skyblock catalog refresh: saved {} records ({} total received).", toSave.size(), rawItems.size());
        } else {
            log.info("Skyblock catalog refresh: no changes detected ({} items).", rawItems.size());
        }
    }

    private boolean needsUpdate(SkyblockItem a, SkyblockItem b) {
        if (!Objects.equals(a.getName(), b.getName())) return true;
        if (!Objects.equals(a.getMaterial(), b.getMaterial())) return true;
        if (!Objects.equals(a.getColor(), b.getColor())) return true;
        if (!Objects.equals(a.getCategory(), b.getCategory())) return true;
        if (!Objects.equals(a.getTier(), b.getTier())) return true;
        if (!Objects.equals(a.getNpcSellPrice(), b.getNpcSellPrice())) return true;
        if (!Objects.equals(a.getStatsJson(), b.getStatsJson())) return true;
        return false;
    }

    private SkyblockItemDTO toDTO(SkyblockItem s) {
        return new SkyblockItemDTO(
                s.getId(),
                s.getName(),
                s.getMaterial(),
                s.getColor(),
                s.getCategory(),
                s.getTier(),
                s.getNpcSellPrice(),
                s.getStatsJson(),
                s.getLastRefreshed()
        );
    }
}
