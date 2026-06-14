package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.DiscountCode;
import com.modernbazaar.core.dto.DiscountCodeDTO;
import com.modernbazaar.core.repository.DiscountCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DiscountService {

    // No ambiguous characters (0/O, 1/I) so codes are easy to read out / type.
    private static final char[] ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RNG = new SecureRandom();

    private final DiscountCodeRepository repo;

    @Transactional(readOnly = true)
    public List<DiscountCodeDTO> list() {
        return repo.findAll().stream()
                .sorted(Comparator.comparing(DiscountCode::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(DiscountCodeDTO::of)
                .toList();
    }

    @Transactional
    public DiscountCodeDTO create(Integer percentOff, String planSlug, Integer maxRedemptions, Integer expiresInDays, String customCode) {
        int pct = percentOff == null ? 0 : percentOff;
        if (pct < 1 || pct > 100) throw new IllegalArgumentException("percentOff must be between 1 and 100");

        String code = (customCode != null && !customCode.isBlank())
                ? customCode.trim().toUpperCase()
                : generateUniqueCode();
        if (repo.existsByCodeIgnoreCase(code)) throw new IllegalArgumentException("Code already exists: " + code);

        DiscountCode dc = DiscountCode.builder()
                .code(code)
                .percentOff(pct)
                .planSlug(planSlug == null || planSlug.isBlank() ? null : planSlug.trim())
                .maxRedemptions(maxRedemptions != null && maxRedemptions > 0 ? maxRedemptions : null)
                .redemptions(0)
                .expiresAt(expiresInDays != null && expiresInDays > 0 ? OffsetDateTime.now().plusDays(expiresInDays) : null)
                .active(true)
                .build();
        return DiscountCodeDTO.of(repo.save(dc));
    }

    @Transactional
    public DiscountCodeDTO setActive(Long id, boolean active) {
        DiscountCode dc = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Discount not found: " + id));
        dc.setActive(active);
        return DiscountCodeDTO.of(repo.save(dc));
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String candidate = randomBlock(4) + "-" + randomBlock(4);
            if (!repo.existsByCodeIgnoreCase(candidate)) return candidate;
        }
        // Extremely unlikely; widen the space to guarantee termination.
        return randomBlock(6) + "-" + randomBlock(6);
    }

    private String randomBlock(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) sb.append(ALPHABET[RNG.nextInt(ALPHABET.length)]);
        return sb.toString();
    }
}
