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

    @Cacheable(value = "flipOpportunities", key = "#filter+'-'+#sort+'-'+#page+'-'+#limit+'-'+#budget+'-'+#horizonHours")
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

        // aplicar ordenação (padrão: score desc)
        String key = sort.map(String::trim).filter(s -> !s.isEmpty()).map(String::toLowerCase).orElse("score");
        Comparator<FlipOpportunityResponseDTO> cmp;
        switch (key) {
            case "spread":
                cmp = Comparator.comparingDouble(FlipOpportunityResponseDTO::spread).reversed();
                break;
            case "iselldesc":
                cmp = Comparator.comparingDouble(FlipOpportunityResponseDTO::instantSellPrice).reversed();
                break;
            case "ibuydesc":
                cmp = Comparator.comparingDouble(FlipOpportunityResponseDTO::instantBuyPrice).reversed();
                break;
            case "profitperhour": // novo sort: lucro por hora (plano)
                cmp = Comparator.comparingDouble((FlipOpportunityResponseDTO o) -> Optional.ofNullable(o.reasonableProfitPerHour()).orElse(0.0d)).reversed();
                break;
            case "score":
            default:
                cmp = Comparator.comparingDouble(FlipOpportunityResponseDTO::score).reversed();
        }
        all.sort(cmp);

        return PagedResponseDTO.of(all, page, limit);
    }

    @Cacheable(value = "flipOpportunitiesAdvanced", key = "#filter+'-'+#sort+'-'+#page+'-'+#limit+'-'+#budget+'-'+#horizonHours+'-'+#maxTime+'-'+#minUnitsPerHour+'-'+#maxUnitsPerHour+'-'+#disableCompetitionPenalties+'-'+#disableRiskPenalties")
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
            Boolean             disableCompetitionPenalties,
            Boolean             disableRiskPenalties
    ) {
        if (limit <= 0) limit = 50;
        if (page < 0) page = 0;

        List<FlipOpportunityResponseDTO> all = scorer.listWithAdvancedFilters(filter, budget, horizonHours,
                                                                            maxTime, minUnitsPerHour, maxUnitsPerHour,
                                                                            disableCompetitionPenalties, disableRiskPenalties);

        // aplicar ordenação (padrão: score desc)
        String key = sort.map(String::trim).filter(s -> !s.isEmpty()).map(String::toLowerCase).orElse("score");
        Comparator<FlipOpportunityResponseDTO> cmp;
        switch (key) {
            case "spread":
                cmp = Comparator.comparingDouble(FlipOpportunityResponseDTO::spread).reversed();
                break;
            case "iselldesc":
                cmp = Comparator.comparingDouble(FlipOpportunityResponseDTO::instantSellPrice).reversed();
                break;
            case "ibuydesc":
                cmp = Comparator.comparingDouble(FlipOpportunityResponseDTO::instantBuyPrice).reversed();
                break;
            case "profitperhour": // novo sort: lucro por hora (plano)
                cmp = Comparator.comparingDouble((FlipOpportunityResponseDTO o) -> Optional.ofNullable(o.reasonableProfitPerHour()).orElse(0.0d)).reversed();
                break;
            case "score":
            default:
                cmp = Comparator.comparingDouble(FlipOpportunityResponseDTO::score).reversed();
        }
        all.sort(cmp);

        return PagedResponseDTO.of(all, page, limit);
    }
}
