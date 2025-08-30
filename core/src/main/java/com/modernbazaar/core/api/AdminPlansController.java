package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.AdminPlanDTO;
import com.modernbazaar.core.api.dto.CreateUpdatePlanRequestDTO;
import com.modernbazaar.core.domain.Plan;
import com.modernbazaar.core.repository.PlanRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * REST controller for managing subscription plans (Admin only).
 * 
 * This controller provides administrative endpoints for:
 * - Creating new subscription plans
 * - Updating existing plan details
 * - Activating/deactivating plans
 * - Listing all plans for management
 * 
 * Security is handled at the endpoint level through Spring Security configuration.
 * All endpoints require the 'manage:plans' permission.
 */
@RestController
@RequestMapping(path = "/api/admin/plans")
@RequiredArgsConstructor
public class AdminPlansController {

    private final PlanRepository planRepository;

    /**
     * Retrieves all subscription plans for administrative management.
     * 
     * @return List of all plans (active and inactive)
     */
    @GetMapping
    public List<AdminPlanDTO> list() {
        return planRepository.findAll().stream()
                .map(AdminPlanDTO::from)
                .toList();
    }

    /**
     * Creates a new subscription plan.
     * 
     * This endpoint validates that the plan slug is unique before creation.
     * If a plan with the same slug already exists, returns a 409 Conflict status.
     * 
     * @param request The plan creation request containing all required fields
     * @return ResponseEntity with the created plan or 409 if slug already exists
     */
    @PostMapping
    public ResponseEntity<AdminPlanDTO> create(@Valid @RequestBody CreateUpdatePlanRequestDTO request) {
        if (planRepository.findBySlug(request.slug()).isPresent()) {
            return ResponseEntity.status(409).build();
        }
        
        Plan plan = Plan.builder()
                .slug(request.slug())
                .name(request.name())
                .stripePriceId(request.stripePriceId())
                .featuresJson(request.featuresJson())
                .active(request.active() == null || request.active())
                .build();
        
        plan = planRepository.save(plan);
        return ResponseEntity.ok(AdminPlanDTO.from(plan));
    }

    /**
     * Updates an existing subscription plan.
     * 
     * This endpoint allows partial updates - only provided fields are modified.
     * The updatedAt timestamp is automatically set to the current time.
     * 
     * @param slug The unique identifier of the plan to update
     * @param request The update request containing fields to modify
     * @return ResponseEntity with the updated plan or 404 if plan not found
     */
    @PutMapping("/{slug}")
    public ResponseEntity<AdminPlanDTO> update(@PathVariable String slug, 
                                        @Valid @RequestBody CreateUpdatePlanRequestDTO request) {
        var planOpt = planRepository.findBySlug(slug);
        if (planOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        var plan = planOpt.get();
        
        // Update only provided fields
        if (request.name() != null) {
            plan.setName(request.name());
        }
        if (request.stripePriceId() != null) {
            plan.setStripePriceId(request.stripePriceId());
        }
        if (request.featuresJson() != null) {
            plan.setFeaturesJson(request.featuresJson());
        }
        if (request.active() != null) {
            plan.setActive(request.active());
        }
        
        plan.setUpdatedAt(OffsetDateTime.now());
        planRepository.save(plan);
        
        return ResponseEntity.ok(AdminPlanDTO.from(plan));
    }

    /**
     * Activates a subscription plan.
     * 
     * @param slug The unique identifier of the plan to activate
     * @return ResponseEntity with 200 OK on success or 404 if plan not found
     */
    @PostMapping("/{slug}/activate")
    public ResponseEntity<Void> activate(@PathVariable String slug) {
        return togglePlanStatus(slug, true);
    }

    /**
     * Deactivates a subscription plan.
     * 
     * @param slug The unique identifier of the plan to deactivate
     * @return ResponseEntity with 200 OK on success or 404 if plan not found
     */
    @PostMapping("/{slug}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable String slug) {
        return togglePlanStatus(slug, false);
    }

    /**
     * Toggles the active status of a plan.
     * 
     * @param slug The unique identifier of the plan
     * @param active The desired active status
     * @return ResponseEntity with 200 OK on success or 404 if plan not found
     */
    private ResponseEntity<Void> togglePlanStatus(String slug, boolean active) {
        var planOpt = planRepository.findBySlug(slug);
        if (planOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        var plan = planOpt.get();
        plan.setActive(active);
        plan.setUpdatedAt(OffsetDateTime.now());
        planRepository.save(plan);
        
        return ResponseEntity.ok().build();
    }
}

