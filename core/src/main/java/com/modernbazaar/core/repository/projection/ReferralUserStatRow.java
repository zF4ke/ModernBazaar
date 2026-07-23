package com.modernbazaar.core.repository.projection;

import java.time.Instant;

/** One referred (converted) user's latest subscription state, tagged with the code that referred them. */
public interface ReferralUserStatRow {
    String getCode();
    String getPlan();
    String getStatus();
    Instant getLastSeen();
    Instant getPeriodEnd();
}
