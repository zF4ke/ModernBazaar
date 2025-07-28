package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "bazaar_item")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BazaarItem {

    @Id
    @Column(name = "product_id", nullable = false, updatable = false)
    private String productId;

    /**
     * Link to the catalog row. Same identifier space as productId.
     * No cascade to avoid large persistence contexts.
     */
    @OneToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "product_id", referencedColumnName = "id", insertable = false, updatable = false)
    @ToString.Exclude
    private SkyblockItem skyblockItem;

    @OneToMany(mappedBy = "item", fetch = FetchType.LAZY)
    @ToString.Exclude
    private List<BazaarItemSnapshot> snapshots;
}
