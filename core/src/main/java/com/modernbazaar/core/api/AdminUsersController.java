package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.AdminUserDTO;
import com.modernbazaar.core.api.dto.PagedResponseDTO;
import com.modernbazaar.core.service.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

/**
 * Admin user management. Gated by {@code manage:plans} via SecurityConfig's
 * {@code /api/admin/**} rule. userId is taken from the request body (not the
 * path) since Auth0 subs contain reserved characters like {@code |}.
 */
@RestController
@RequestMapping(path = "/api/admin/users", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Admin Users")
public class AdminUsersController {

    private final AdminUserService users;

    @GetMapping
    @Operation(summary = "Paginated list of user subscriptions (optional ?q= filters by user id)")
    public PagedResponseDTO<AdminUserDTO> list(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int limit) {
        return users.list(page, limit, q);
    }

    @PostMapping(path = "/plan", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Admin override of a user's plan")
    public AdminUserDTO setPlan(@RequestBody SetPlanRequest body) {
        return users.setPlan(body.userId(), body.planSlug());
    }

    @PostMapping(path = "/extend", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Extend a user's current period by N days")
    public AdminUserDTO extend(@RequestBody ExtendRequest body) {
        return users.extend(body.userId(), body.days());
    }

    public record SetPlanRequest(String userId, String planSlug) {}
    public record ExtendRequest(String userId, int days) {}
}
