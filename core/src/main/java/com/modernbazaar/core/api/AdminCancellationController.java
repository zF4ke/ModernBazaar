package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.AdminCancellationDTO;
import com.modernbazaar.core.api.dto.PagedResponseDTO;
import com.modernbazaar.core.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin churn view: the feedback users leave when cancelling a subscription.
 * Gated by {@code manage:plans} (see SecurityConfig {@code /api/admin/**}).
 */
@RestController
@RequestMapping(path = "/api/admin/cancellations", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Admin Cancellations")
public class AdminCancellationController {

    private final SubscriptionService subscriptions;

    @GetMapping
    @Operation(summary = "List cancellation feedback, newest first (paginated)")
    public PagedResponseDTO<AdminCancellationDTO> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return subscriptions.listCancellations(page, limit);
    }
}
