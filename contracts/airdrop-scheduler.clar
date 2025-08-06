(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-AIRDROP-NOT-FOUND u101)
(define-constant ERR-ALREADY-CLAIMED u102)
(define-constant ERR-AIRDROP-NOT-DUE u103)

(define-data-var next-id uint u1)

(define-map airdrops
  uint
  {
    recipient: principal,
    amount: uint,
    token-contract: principal,
    token-function: (string-ascii 32),
    release-block: uint,
    claimed: bool
  }
)

(define-public (schedule-airdrop
  (recipient principal)
  (amount uint)
  (token-contract principal)
  (token-function (string-ascii 32))
  (release-block uint))
  (begin
    ;; Optional input validations
    (asserts! (> amount u0) (err u900))
    (asserts! (> release-block block-height) (err u901))

    (let ((id (var-get next-id)))
      (map-set airdrops id {
        recipient: recipient,
        amount: amount,
        token-contract: token-contract,
        token-function: token-function,
        release-block: release-block,
        claimed: false
      })
      (var-set next-id (+ id u1))
      (ok id)
    )
  )
)

(define-read-only (get-airdrop (id uint))
  (match (map-get? airdrops id)
    airdrop (ok airdrop)
  )
)

(define-public (claim-airdrop (id uint))
  (let ((entry (map-get? airdrops id)))
    (match entry
      entry-value
        (begin
          (asserts! (is-eq (get recipient entry-value) tx-sender) (err ERR-NOT-AUTHORIZED))
          (asserts! (not (get claimed entry-value)) (err ERR-ALREADY-CLAIMED))
          (asserts! (<= (get release-block entry-value) block-height) (err ERR-AIRDROP-NOT-DUE))

          ;; Mark as claimed
          (map-set airdrops id (merge entry-value { claimed: true }))

          ;; Transfer tokens
          (as-contract
            (contract-call? (get token-contract entry-value)
                            (get token-function entry-value)
                            tx-sender
                            (get recipient entry-value)
                            (get amount entry-value))
          )
        )
    )
  )
)
