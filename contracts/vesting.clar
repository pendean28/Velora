(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ALREADY-INITIALIZED u101)
(define-constant ERR-NO-VESTING u102)
(define-constant ERR-NOT-ENOUGH-TOKENS u103)
(define-constant ERR-CLIFF-NOT-REACHED u104)
(define-constant ERR-ZERO-ADDRESS u105)

(define-data-var admin principal tx-sender)

(define-map vesting-schedules
  principal
  {
    total: uint,
    cliff-end: uint,
    start: uint,
    duration: uint,
    claimed: uint
  }
)

(define-read-only (is-admin)
  (ok (is-eq tx-sender (var-get admin)))
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

(define-public (initialize-vesting
  (recipient principal)
  (total uint)
  (cliff-end uint)
  (start uint)
  (duration uint)
)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (map-get? vesting-schedules recipient)) (err ERR-ALREADY-INITIALIZED))
    (map-set vesting-schedules recipient {
      total: total,
      cliff-end: cliff-end,
      start: start,
      duration: duration,
      claimed: u0
    })
    (ok true)
  )
)

(define-private (get-vested-amount (now uint) (schedule (tuple (total uint) (cliff-end uint) (start uint) (duration uint) (claimed uint))))
  (if (< now (get cliff-end schedule))
    u0
    (let (
      (elapsed (- now (get start schedule)))
      (clamped (if (> elapsed (get duration schedule)) (get duration schedule) elapsed))
    )
      (/ (* (get total schedule) clamped) (get duration schedule))
    )
  )
)

(define-public (claim)
  (let ((maybe-schedule (map-get? vesting-schedules tx-sender)))
    (match maybe-schedule schedule
      (let (
        (now (block-height))
        (vested (get-vested-amount now schedule))
        (already-claimed (get claimed schedule))
        (claimable (- vested already-claimed))
      )
        (asserts! (> claimable u0) (err ERR-NOT-ENOUGH-TOKENS))
        (map-set vesting-schedules tx-sender {
          total: (get total schedule),
          cliff-end: (get cliff-end schedule),
          start: (get start schedule),
          duration: (get duration schedule),
          claimed: (+ already-claimed claimable)
        })
        (ok claimable)
      )
      (err ERR-NO-VESTING)
    )
  )
)

(define-read-only (get-vesting (recipient principal))
  (ok (map-get? vesting-schedules recipient))
)
