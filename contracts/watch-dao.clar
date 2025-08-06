;; Watch DAO Governance Contract
;; Clarity v1

(define-constant ERR-NOT-ADMIN u100)
(define-constant ERR-NOT-ENOUGH-TOKENS u101)
(define-constant ERR-ALREADY-VOTED u102)
(define-constant ERR-PROPOSAL-NOT-FOUND u103)
(define-constant ERR-NOT-OPEN u104)
(define-constant ERR-TOO-EARLY u105)
(define-constant ERR-NOT-EXECUTABLE u106)

(define-data-var admin principal tx-sender)
(define-data-var proposal-id-counter uint u0)

(define-map proposals
  uint
  {
    proposer: principal,
    description: (string-utf8 100),
    start-block: uint,
    end-block: uint,
    executed: bool,
    yes-votes: uint,
    no-votes: uint
  }
)

(define-map has-voted (tuple (proposal-id uint) (voter principal)) bool)

;; Assume token balances come from a pre-defined external contract
(define-read-only (get-token-balance (user principal))
  ;; Placeholder for integration
  (ok u1000)
)

(define-public (create-proposal (description (string-utf8 100)) (duration uint))
  (let ((id (+ u1 (var-get proposal-id-counter))))
    (begin
      (var-set proposal-id-counter id)
      (map-set proposals id {
        proposer: tx-sender,
        description: description,
        start-block: block-height,
        end-block: (+ block-height duration),
        executed: false,
        yes-votes: u0,
        no-votes: u0
      })
      (ok id)
    )
  )
)

(define-public (vote (proposal-id uint) (support bool))
  (let (
    (proposal (map-get? proposals proposal-id))
    (voted (default-to false (map-get? has-voted { proposal-id: proposal-id, voter: tx-sender })))
  )
    (begin
      (asserts! (is-some proposal) (err ERR-PROPOSAL-NOT-FOUND))
      (asserts! (not voted) (err ERR-ALREADY-VOTED))
      (let (
        (p (unwrap! proposal (err ERR-PROPOSAL-NOT-FOUND)))
        (now block-height)
        (weight (unwrap-panic (get-token-balance tx-sender)))
      )
        (asserts! (>= now (get start-block p)) (err ERR-NOT-OPEN))
        (asserts! (<= now (get end-block p)) (err ERR-NOT-OPEN))
        (map-set has-voted { proposal-id: proposal-id, voter: tx-sender } true)
        (map-set proposals proposal-id (merge p {
          yes-votes: (if support (+ (get yes-votes p) weight) (get yes-votes p)),
          no-votes: (if support (get no-votes p) (+ (get no-votes p) weight))
        }))
        (ok true)
      )
    )
  )
)

(define-public (execute-proposal (proposal-id uint))
  (let ((proposal (map-get? proposals proposal-id)))
    (begin
      (asserts! (is-some proposal) (err ERR-PROPOSAL-NOT-FOUND))
      (let ((p (unwrap! proposal (err ERR-PROPOSAL-NOT-FOUND))))
        (asserts! (>= block-height (get end-block p)) (err ERR-TOO-EARLY))
        (asserts! (not (get executed p)) (err ERR-NOT-EXECUTABLE))
        (asserts! (> (get yes-votes p) (get no-votes p)) (err ERR-NOT-EXECUTABLE))
        (map-set proposals proposal-id (merge p { executed: true }))
        ;; Place logic for post-execution action here (e.g. fund transfer)
        (ok true)
      )
    )
  )
)

(define-read-only (get-proposal (id uint))
  (map-get? proposals id)
)
