package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.ReferralCode;
import com.modernbazaar.core.dto.ReferralCodeDTO;
import com.modernbazaar.core.repository.ReferralCodeRepository;
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

    @Transactional(readOnly = true)
    public List<ReferralCodeDTO> list() {
        return repo.findAll().stream()
                .sorted(Comparator.comparingInt(ReferralCode::getConversions).reversed())
                .map(ReferralCodeDTO::of)
                .toList();
    }

    /** Idempotent: returns the user's existing code or mints one. */
    @Transactional
    public ReferralCodeDTO getOrCreate(String userId) {
        if (userId == null || userId.isBlank()) throw new IllegalArgumentException("userId is required");
        return repo.findByUserId(userId)
                .map(ReferralCodeDTO::of)
                .orElseGet(() -> ReferralCodeDTO.of(repo.save(
                        ReferralCode.builder().userId(userId).code(generateUniqueCode()).conversions(0).build())));
    }

    /** Called by the billing webhook on a referred user's first successful payment. */
    @Transactional
    public void recordConversion(String code) {
        if (code == null || code.isBlank()) return;
        repo.findByCodeIgnoreCase(code.trim()).ifPresentOrElse(r -> {
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
