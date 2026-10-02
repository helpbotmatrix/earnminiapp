# Progressive Lucky Spin Tiers

## How it works
1. Admin sets base:
   - `goal_usd` (default 1.00) — each cycle earns this much USD on the wheel curve
   - `spins_to_goal_min` / `spins_to_goal_max` (e.g. 20–30)

2. **Tier 1**: fill $1 within ~20–30 spins (early spins pay more, late spins smaller until cycle completes)

3. When cycle completes:
   - Money already in wallet balance
   - `spin_cycle_earned` resets to 0
   - `spin_tier` becomes 2
   - Curve resets (big early rewards again)

4. **Tier 2**: display goal $2; spin window **2×** → 40–60  
   **Tier 3**: display goal $3; spin window **4×** → 80–120  
   **Tier n**: display goal = `goal_usd * n`; spins = base × **2^(n-1)**

## Admin only
No code change needed — set `goal_usd`, `spins_to_goal_min`, `spins_to_goal_max` in system settings / ads config API.

## DB
- `users.spin_tier` (default 1)
- `users.spin_cycle_earned` (progress inside current $1 cycle)
