package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "skyblock_item",
        indexes = {
                @Index(columnList = "id"),
                @Index(columnList = "name"),
                @Index(columnList = "tier"),
                @Index(columnList = "category")
        })
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkyblockItem {

    /**
     * Hypixel item ID, e.g. "FARM_ARMOR_CHESTPLATE".
     */
    @Id
    @Column(nullable = false, updatable = false)
    private String id;

    /**
     * Display name from Hypixel, e.g. "Farm Armor Chestplate".
     */
    @Column(nullable = false)
    private String name;

    /**
     * Vanilla material name, e.g. "LEATHER_CHESTPLATE".
     */
    @Column(nullable = true)
    private String material;

    /**
     * Optional RGB string "r,g,b" (as sent by the API).
     */
    @Column(nullable = true, length = 32)
    private String color;

    /**
     * Hypixel category, e.g. "CHESTPLATE".
     */
    @Column(nullable = true, length = 64)
    private String category;

    /**
     * Hypixel rarity tier, e.g. "COMMON", "RARE", ...
     */
    @Column(nullable = true, length = 32)
    private String tier;

    /**
     * NPC sell price if present.
     */
    @Column(name = "npc_sell_price")
    private Double npcSellPrice;

    /**
     * Stats object as JSON text for portability across DBs (H2 + Postgres).
     * Example: {"DEFENSE":75,"HEALTH":20}
     */
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(name = "stats_json", columnDefinition = "text")
    private String statsJson;

    /**
     * When we last refreshed this row from Hypixel.
     */
    @Column(name = "last_refreshed", nullable = false)
    private Instant lastRefreshed;
}
