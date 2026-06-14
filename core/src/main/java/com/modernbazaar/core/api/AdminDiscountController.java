package com.modernbazaar.core.api;

import com.modernbazaar.core.dto.DiscountCodeDTO;
import com.modernbazaar.core.service.DiscountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin discount codes. Gated by {@code manage:plans} via SecurityConfig's
 * {@code /api/admin/**} rule. Codes are tracked locally; mirroring them as
 * Lemon Squeezy discounts is part of payments activation (ADMIN_SUITE_PLAN §5.3).
 */
@RestController
@RequestMapping(path = "/api/admin/discounts", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Admin Discounts")
public class AdminDiscountController {

    private final DiscountService discounts;

    @GetMapping
    @Operation(summary = "List all discount codes (newest first)")
    public List<DiscountCodeDTO> list() {
        return discounts.list();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Generate a discount code (code optional - auto-generated if omitted)")
    public DiscountCodeDTO create(@RequestBody CreateRequest body) {
        return discounts.create(body.percentOff(), body.planSlug(), body.maxRedemptions(), body.expiresInDays(), body.code());
    }

    @PostMapping(path = "/{id}/active", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Activate or deactivate a discount code")
    public DiscountCodeDTO setActive(@PathVariable Long id, @RequestBody ActiveRequest body) {
        return discounts.setActive(id, body.active());
    }

    @DeleteMapping(path = "/{id}")
    @Operation(summary = "Permanently delete a discount code")
    public java.util.Map<String, Boolean> delete(@PathVariable Long id) {
        discounts.delete(id);
        return java.util.Map.of("deleted", true);
    }

    public record CreateRequest(Integer percentOff, String planSlug, Integer maxRedemptions, Integer expiresInDays, String code) {}
    public record ActiveRequest(boolean active) {}
}
