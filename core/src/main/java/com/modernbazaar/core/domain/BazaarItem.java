package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "bazaar_item")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BazaarItem {

    @Id
    @Column(name = "product_id", nullable = false)
    private String productId;

    private String displayName;    // you can populate later or derive from productId

    // optional back-reference to snapshots
    @OneToMany(mappedBy = "item", fetch = FetchType.LAZY)
    //  cascade = CascadeType.ALL was causing a memory leak
    @ToString.Exclude
    private List<BazaarProductSnapshot> snapshots;
}
