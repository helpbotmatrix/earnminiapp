package repository

import "context"

// ApplyPendingReferrerIfNoGate binds pending_referrer_tg when no required-on-entry channels exist.
func (r *UserRepository) ApplyPendingReferrerIfNoGate(ctx context.Context, userID int64) error {
	var n int
	_ = r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM connected_chats
		WHERE COALESCE(required_on_entry, false) = true AND COALESCE(is_active, true) = true
	`).Scan(&n)
	if n > 0 {
		return nil
	}
	var pending *int64
	var referrerID *int64
	err := r.pool.QueryRow(ctx, `
		SELECT pending_referrer_tg, referrer_id FROM users WHERE id = $1
	`, userID).Scan(&pending, &referrerID)
	if err != nil || referrerID != nil || pending == nil || *pending == 0 {
		return err
	}
	var refID int64
	err = r.pool.QueryRow(ctx, `SELECT id FROM users WHERE telegram_id = $1`, *pending).Scan(&refID)
	if err != nil || refID == 0 || refID == userID {
		return nil
	}
	_, err = r.pool.Exec(ctx, `
		UPDATE users SET referrer_id = $1, pending_referrer_tg = NULL, channels_gate_passed = true
		WHERE id = $2 AND referrer_id IS NULL
	`, refID, userID)
	return err
}
