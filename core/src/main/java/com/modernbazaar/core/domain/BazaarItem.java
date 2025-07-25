package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bazaar_item")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class BazaarItem {
    @Id
    private String productId;
    private String displayName;  // you can populate later or derive from productId
}