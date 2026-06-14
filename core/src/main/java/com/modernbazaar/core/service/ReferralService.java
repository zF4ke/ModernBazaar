package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.ReferralCode;
import com.modernbazaar.core.domain.ReferralConversion;
import com.modernbazaar.core.dto.ReferralCodeDTO;
import com.modernbazaar.core.repository.ReferralCodeRepository;
import com.modernbazaar.core.repository.ReferralConversionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReferralService {

    private static final char[] ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RNG = new SecureRandom();

    private final ReferralCodeRepository repo;
    private final ReferralConversionRepository conversionRepo;

    @Transactional(readOnly = true)
    public List<ReferralCodeDTO> list() {
        return repo.findAll().stream()
                .sorted(Comparator.comparingInt(ReferralCode::getConversions).reversed())
                .map(ReferralCodeDTO::of)
                .toList();
    }

    /**
     * Returns the user's existing referral code, or mints one. An optional custom
     * code (great for influencers, e.g. "ALEX") is used only when first creating it.
     */
    @Transactional
    public ReferralCodeDTO getOrCreate(String userId, String customCode) {
        if (userId == null || userId.isBlank()) throw new IllegalArgumentException("userId is required");
        var existing = repo.findByUserId(userId);
        if (existing.isPresent()) return ReferralCodeDTO.of(existing.get());

        String code;
        if (customCode != null && !customCode.isBlank()) {
            code = customCode.trim().toUpperCase().replaceAll("[^A-Z0-9_-]", "");
            if (code.isBlank()) throw new IllegalArgumentException("Custom code must contain letters or numbers");
            if (repo.existsByCodeIgnoreCase(code)) throw new IllegalArgumentException("Code already in use: " + code);
        } else {
            code = generateUniqueCode();
        }
        return ReferralCodeDTO.of(repo.save(ReferralCode.builder().userId(userId).code(code).conversions(0).build()));
    }

    @Transactional
    public void delete(Long id) {
        repo.deleteById(id);
    }

    /**
     * Called by the billing webhook on a referred user's first successful payment.
     * Idempotent per referred user: a replayed (validly signed) event will not
     * double-count, and a user cannot be counted for two different codes.
     */
    @Transactional
    public void recordConversion(String code, String referredUserId) {
        if (code == null || code.isBlank() || referredUserId == null || referredUserId.isBlank()) return;
        if (conversionRepo.existsByReferredUserId(referredUserId)) {
            log.debug("Referral conversion already recorded for referred user {}, skipping", referredUserId);
            return;
        }
        repo.findByCodeIgnoreCase(code.trim()).ifPresentOrElse(r -> {
            // A user cannot refer themselves.
            if (referredUserId.equals(r.getUserId())) {
                log.debug("Self-referral ignored for user {}", referredUserId);
                return;
            }
            conversionRepo.save(ReferralConversion.builder().code(r.getCode()).referredUserId(referredUserId).build());
            r.setConversions(r.getConversions() + 1);
            repo.save(r);
            log.info("Referral conversion recorded for code={} (total={})", r.getCode(), r.getConversions());
        }, () -> log.debug("Referral code not found, ignoring conversion: {}", code));
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String candidate = randomBlock(6);
            if (!repo.existsByCodeIgnoreCase(candidate)) return candidate;
        }
        return randomBlock(8);
    }

    private String randomBlock(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) sb.append(ALPHABET[RNG.nextInt(ALPHABET.length)]);
        return sb.toString();
    }
}
