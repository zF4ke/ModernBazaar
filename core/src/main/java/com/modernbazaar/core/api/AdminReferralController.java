package com.modernbazaar.core.api;

import com.modernbazaar.core.dto.ReferralCodeDTO;
import com.modernbazaar.core.service.ReferralService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin referral codes. Gated by {@code manage:plans}. Conversions are counted
 * by the billing webhook on the referred user's first successful payment.
 */
@RestController
@RequestMapping(path = "/api/admin/referrals", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Admin Referrals")
public class AdminReferralController {

    private final ReferralService referrals;

    @GetMapping
    @Operation(summary = "List referral codes, most conversions first")
    public List<ReferralCodeDTO> list() {
        return referrals.list();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get or create a referral code for a user")
    public ReferralCodeDTO create(@RequestBody CreateRequest body) {
        return referrals.getOrCreate(body.userId());
    }

    public record CreateRequest(String userId) {}
}
