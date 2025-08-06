(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ZERO-ADDRESS u101)
(define-constant ERR-ALREADY-REGISTERED u102)
(define-constant ERR-NOT-REGISTERED u103)
(define-constant ERR-INVALID-TYPE u104)
(define-constant ERR-ALREADY-ALERTED u105)
(define-constant ERR-INVALID-PRIORITY u106)
(define-constant ERR-ALERT-NOT-FOUND u107)

;; Alert types
(define-constant TYPE-LIQUIDITY "liquidity")
(define-constant TYPE-GOVERNANCE "governance")
(define-constant TYPE-PERMISSIONS "permissions")

;; Priority levels
(define-constant PRIORITY-HIGH u1)
(define-constant PRIORITY-MEDIUM u2)
(define-constant PRIORITY-LOW u3)

;; Admin
(define-data-var admin principal tx-sender)

;; Registered Monitors
(define-map monitors principal bool)

;; Subscriptions to alert types
(define-map subscriptions { subscriber: principal, alert-type: (string-ascii 32) } bool)

;; Alerts
(define-data-var alert-id-counter uint u0)
(define-map alerts uint {
  id: uint,
  alert-type: (string-ascii 32),
  message: (string-ascii 200),
  priority: uint,
  timestamp: uint,
  source: principal
})

;; Tracking if subscriber received alert
(define-map delivered { alert-id: uint, recipient: principal } bool)

;; Private helper to check admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Set new admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Register as monitor
(define-public (register-monitor)
  (begin
    (asserts! (not (default-to false (map-get? monitors tx-sender))) (err ERR-ALREADY-REGISTERED))
    (map-set monitors tx-sender true)
    (ok true)
  )
)

;; Unregister monitor
(define-public (unregister-monitor)
  (begin
    (asserts! (default-to false (map-get? monitors tx-sender)) (err ERR-NOT-REGISTERED))
    (map-delete monitors tx-sender)
    (ok true)
  )
)

;; Subscribe to an alert type
(define-public (subscribe (alert-type (string-ascii 32)))
  (begin
    (asserts! (or (is-eq alert-type TYPE-LIQUIDITY) (is-eq alert-type TYPE-GOVERNANCE) (is-eq alert-type TYPE-PERMISSIONS)) (err ERR-INVALID-TYPE))
    (map-set subscriptions { subscriber: tx-sender, alert-type: alert-type } true)
    (ok true)
  )
)

;; Unsubscribe
(define-public (unsubscribe (alert-type (string-ascii 32)))
  (begin
    (map-delete subscriptions { subscriber: tx-sender, alert-type: alert-type })
    (ok true)
  )
)

;; Emit alert
(define-public (emit-alert (alert-type (string-ascii 32)) (message (string-ascii 200)) (priority uint))
  (begin
    (asserts! (default-to false (map-get? monitors tx-sender)) (err ERR-NOT-REGISTERED))
    (asserts! (or (is-eq priority PRIORITY-HIGH) (is-eq priority PRIORITY-MEDIUM) (is-eq priority PRIORITY-LOW)) (err ERR-INVALID-PRIORITY))
    (let ((id (var-get alert-id-counter)))
      (map-set alerts id {
        id: id,
        alert-type: alert-type,
        message: message,
        priority: priority,
        timestamp: block-height,
        source: tx-sender
      })
      (var-set alert-id-counter (+ id u1))
      (ok id)
    )
  )
)

;; Mark alert delivered
(define-public (mark-delivered (alert-id uint))
  (begin
    (asserts! (is-some (map-get? alerts alert-id)) (err ERR-ALERT-NOT-FOUND))
    (asserts! (not (default-to false (map-get? delivered { alert-id: alert-id, recipient: tx-sender }))) (err ERR-ALREADY-ALERTED))
    (map-set delivered { alert-id: alert-id, recipient: tx-sender } true)
    (ok true)
  )
)

;; Read-only: check alert
(define-read-only (get-alert (id uint))
  (match (map-get? alerts id)
    entry (ok entry)
    (err ERR-ALERT-NOT-FOUND)
  )
)

;; Read-only: check if subscribed
(define-read-only (is-subscribed (user principal) (atype (string-ascii 32)))
  (ok (default-to false (map-get? subscriptions { subscriber: user, alert-type: atype })))
)

;; Read-only: is monitor
(define-read-only (is-monitor (user principal))
  (ok (default-to false (map-get? monitors user)))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: get alert count
(define-read-only (get-alert-count)
  (ok (var-get alert-id-counter))
)
