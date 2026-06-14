package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.AppSetting;
import com.modernbazaar.core.repository.AppSettingRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runtime app settings. The maintenance flag is cached in a volatile field so the
 * request filter reads it with no DB hit; it's refreshed on write and at startup.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AppSettingsService {

    public static final String KEY_MAINTENANCE = "maintenance_mode";

    private final AppSettingRepository repo;
    private volatile boolean maintenanceCache = false;

    @PostConstruct
    void load() {
        maintenanceCache = "true".equalsIgnoreCase(get(KEY_MAINTENANCE, "false"));
        if (maintenanceCache) log.warn("⚠️ Maintenance mode is ON at startup");
    }

    public boolean isMaintenanceMode() {
        return maintenanceCache;
    }

    @Transactional
    public void setMaintenanceMode(boolean enabled) {
        set(KEY_MAINTENANCE, Boolean.toString(enabled));
        maintenanceCache = enabled;
        log.warn("Maintenance mode set to {}", enabled);
    }

    @Transactional(readOnly = true)
    public String get(String key, String defaultValue) {
        return repo.findByKey(key).map(AppSetting::getValue).orElse(defaultValue);
    }

    @Transactional
    public void set(String key, String value) {
        AppSetting s = repo.findByKey(key).orElseGet(() -> AppSetting.builder().key(key).build());
        s.setValue(value);
        repo.save(s);
    }
}
