package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "bazaar_order_entry",
        indexes = @Index(columnList = "snapshot_id, side"))
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "side", discriminatorType = DiscriminatorType.STRING)
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public abstract class BazaarOrderEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** owning snapshot */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "snapshot_id", nullable = false)
    private BazaarProductSnapshot snapshot;

    /**
     * Maintains the same API ordering.
     * Hibernate will write and read this column for `@OrderColumn`.
     */
    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    /** price per unit */
    @Column(name = "price_per_unit", nullable = false)
    private double pricePerUnit;

    /** total quantity at this price level */
    @Column(nullable = false)
    private long amount;

    /** number of distinct orders at this price */
    @Column(nullable = false)
    private int orders;

    @Override
    public String toString() {
        return "BazaarOrderEntry{" +
                "id=" + id +
                ", snapshot=" + snapshot.getId() +
                ", orderIndex=" + orderIndex +
                ", pricePerUnit=" + pricePerUnit +
                ", amount=" + amount +
                ", orders=" + orders +
                '}';
    }
}
