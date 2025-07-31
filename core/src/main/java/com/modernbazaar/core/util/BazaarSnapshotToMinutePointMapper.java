package com.modernbazaar.core.util;

import com.modernbazaar.core.domain.*;
        import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class BazaarSnapshotToMinutePointMapper {

    private static final int DEPTH = 30;  // how many order levels to keep

    public BazaarItemHourPoint toMinute(BazaarItemSnapshot s,
                                        BazaarItemHourSummary parent) {

        BazaarItemHourPoint p = new BazaarItemHourPoint();
        p.setHourSummary(parent);
        p.setSnapshotTime(s.getFetchedAt());

        p.setInstantBuyPrice (s.getInstantBuyPrice());
        p.setInstantSellPrice(s.getInstantSellPrice());
        p.setActiveBuyOrdersCount (s.getActiveBuyOrdersCount());
        p.setActiveSellOrdersCount(s.getActiveSellOrdersCount());

        /* ---- copy (trimmed) order-books -------------------------------- */
        p.setBuyOrders (cloneOrders(
                s.getBuyOrders(), BuyOrderEntry.class,  p));
        p.setSellOrders(cloneOrders(
                s.getSellOrders(), SellOrderEntry.class, p));

        return p;
    }

    /** deep-clone the first N order levels so we can delete the parent snapshot. */
    private <T extends BazaarOrderEntry> List<T> cloneOrders(
            List<? extends BazaarOrderEntry> src,
            Class<T> type,
            BazaarItemHourPoint owner) {

        return src.stream()
                .limit(BazaarSnapshotToMinutePointMapper.DEPTH)
                .map(o -> {
                    T copy = type.cast(o.cloneShallow());   // add a copy helper or ctor
                    copy.setHourPoint(owner);
                    return copy;
                })
                .toList();
    }
}
