package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * Generic key/value app settings (runtime-toggleable, persisted). Used for the
 * maintenance-mode kill switch and future operational flags.
 */
@Entity
@Table(name = "app_setting",
        indexes = { @Index(name = "idx_app_setting_key", columnList = "setting_key", unique = true) })
@Getter @Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AppSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "setting_key", nullable = false, unique = true, length = 100)
    private String key;

    @Column(name = "setting_value", length = 1000)
    private String value;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }
}
