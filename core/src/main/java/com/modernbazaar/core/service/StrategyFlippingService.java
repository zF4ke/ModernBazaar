package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.BazaarItemFilterDTO;
import com.modernbazaar.core.api.dto.FlipOpportunityResponseDTO;
import com.modernbazaar.core.api.dto.PagedResponseDTO;
import com.modernbazaar.core.strategy.flipping.FlippingScorer;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class StrategyFlippingService {

    private final FlippingScorer scorer;

    // IMPORTANT: não incluir page/limit na chave para reutilizar cálculo caro entre páginas (só fazemos slice em memória)
    @Cacheable(value = "flipOpportunities", key = "#filter+'-'+#sort+'-'+#budget+'-'+#horizonHours")
    @Transactional(readOnly = true)
    public PagedResponseDTO<FlipOpportunityResponseDTO> list(
            BazaarItemFilterDTO filter,
            Optional<String>    sort,
            int                 page,
            int                 limit,
            Double              budget,
            Double              horizonHours
    ) {
        if (limit <= 0) limit = 50;
        if (page < 0) page = 0;

        List<FlipOpportunityResponseDTO> all = scorer.list(filter, budget, horizonHours);
        all.sort(buildComparator(sort));
        return PagedResponseDTO.of(all, page, limit);
    }

    // Igual: retirar page/limit da chave de cache; filtros avançados agora aplicados dentro do scorer
    @Cacheable(value = "flipOpportunitiesAdvanced", key = "#filter+'-'+#sort+'-'+#budget+'-'+#horizonHours+'-'+#maxTime+'-'+#minUnitsPerHour+'-'+#maxUnitsPerHour+'-'+#maxCompetitionPerHour+'-'+#maxRiskScore+'-'+#disableCompetitionPenalties+'-'+#disableRiskPenalties")
    @Transactional(readOnly = true)
    public PagedResponseDTO<FlipOpportunityResponseDTO> listWithAdvancedFilters(
            BazaarItemFilterDTO filter,
            Optional<String>    sort,
            int                 page,
            int                 limit,
            Double              budget,
            Double              horizonHours,
            Double              maxTime,
            Double              minUnitsPerHour,
            Double              maxUnitsPerHour,
            Double              maxCompetitionPerHour,
            Double              maxRiskScore,
            Boolean             disableCompetitionPenalties,
            Boolean             disableRiskPenalties
    ) {
        if (limit <= 0) limit = 50;
        if (page < 0) page = 0;

        List<FlipOpportunityResponseDTO> all = scorer.listWithAdvancedFilters(filter, budget, horizonHours,
                                                                            maxTime, minUnitsPerHour, maxUnitsPerHour,
                                                                            maxCompetitionPerHour, maxRiskScore,
                                                                            disableCompetitionPenalties, disableRiskPenalties);
        all.sort(buildComparator(sort));
        return PagedResponseDTO.of(all, page, limit);
    }

    /**
     * Builds the result comparator for the requested sort key (default: score desc).
     * Shared by both list endpoints so the sort options stay in one place.
     */
    private static Comparator<FlipOpportunityResponseDTO> buildComparator(Optional<String> sort) {
        String key = sort.map(String::trim).filter(s -> !s.isEmpty()).map(String::toLowerCase).orElse("score");
        return switch (key) {
            case "spread" ->
                    Comparator.comparingDouble(FlipOpportunityResponseDTO::spread).reversed();
            case "iselldesc" ->
                    Comparator.comparingDouble(FlipOpportunityResponseDTO::instantSellPrice).reversed();
            case "ibuydesc" ->
                    Comparator.comparingDouble(FlipOpportunityResponseDTO::instantBuyPrice).reversed();
            case "profitperhour" -> // profit per hour (planned)
                    Comparator.comparingDouble((FlipOpportunityResponseDTO o) ->
                            Optional.ofNullable(o.reasonableProfitPerHour()).orElse(0.0d)).reversed();
            default ->
                    Comparator.comparingDouble(FlipOpportunityResponseDTO::score).reversed();
        };
    }
}
