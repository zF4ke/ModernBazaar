package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.BazaarItemFilterDTO;
import com.modernbazaar.core.api.dto.ManipulationOpportunityResponseDTO;
import com.modernbazaar.core.api.dto.PagedResponseDTO;
import com.modernbazaar.core.strategy.manipulation.ManipulationScorer;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StrategyManipulationService {

    private final ManipulationScorer scorer;

    // page/limit deliberately excluded from the cache key so the expensive scan is
    // computed once per filter combo and sliced in memory across pages.
    @Cacheable(value = "manipulationOpportunities",
            key = "#filter+'-'+#sort+'-'+#budget+'-'+#roi+'-'+#taxRate+'-'+#sellWallFactor+'-'+#minDemandSupplyRatio+'-'+#minProfit+'-'+#maxCornerSupply+'-'+#formulaVersion")
    @Transactional(readOnly = true)
    public PagedResponseDTO<ManipulationOpportunityResponseDTO> list(
            BazaarItemFilterDTO filter,
            Optional<String>    sort,
            int                 page,
            int                 limit,
            Double              budget,
            Double              roi,
            Double              taxRate,
            Double              sellWallFactor,
            Double              minDemandSupplyRatio,
            Double              minProfit,
            Long                maxCornerSupply,
            String              formulaVersion
    ) {
        if (limit <= 0) limit = 50;
        if (page < 0) page = 0;

        List<ManipulationOpportunityResponseDTO> all =
                scorer.list(filter, budget, roi, taxRate, sellWallFactor, minDemandSupplyRatio, minProfit, maxCornerSupply, formulaVersion);

        String key = sort.map(String::trim).filter(s -> !s.isEmpty()).map(String::toLowerCase).orElse("score");
        Comparator<ManipulationOpportunityResponseDTO> cmp = switch (key) {
            case "profit", "totalprofit" ->
                    Comparator.comparingDouble(ManipulationOpportunityResponseDTO::totalProfit).reversed();
            case "ratio", "demandsupplyratio" ->
                    Comparator.comparingDouble((ManipulationOpportunityResponseDTO o) ->
                            Optional.ofNullable(o.demandSupplyRatio()).orElse(0.0)).reversed();
            case "cornercost" -> // cheapest market to corner first
                    Comparator.comparingDouble(ManipulationOpportunityResponseDTO::cornerCost);
            case "demand" ->
                    Comparator.comparingDouble((ManipulationOpportunityResponseDTO o) ->
                            Optional.ofNullable(o.demandPerHour()).orElse(0.0)).reversed();
            default ->
                    Comparator.comparingDouble(ManipulationOpportunityResponseDTO::score).reversed()
                            .thenComparing(Comparator.comparingDouble((ManipulationOpportunityResponseDTO o) ->
                                    Optional.ofNullable(o.estimatedSellThroughHours()).orElse(Double.POSITIVE_INFINITY)))
                            .thenComparing(Comparator.comparingDouble((ManipulationOpportunityResponseDTO o) ->
                                    Optional.ofNullable(o.demandSupplyRatio()).orElse(0.0)).reversed())
                            .thenComparing(Comparator.comparingDouble(ManipulationOpportunityResponseDTO::totalProfit).reversed());
        };
        all.sort(cmp);

        return PagedResponseDTO.of(all, page, limit);
    }
}
