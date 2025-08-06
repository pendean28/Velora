(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ROLE-EXISTS u101)
(define-constant ERR-ROLE-NOT-FOUND u102)
(define-constant ERR-INVALID-ADDRESS u103)

;; Built-in roles
(define-constant ROLE-ADMIN "admin")
(define-constant ROLE-MOD "moderator")
(define-constant ROLE-VIEW "viewer")

(define-map roles (tuple (role-name (string-ascii 20)) (user principal)) bool)

(define-data-var contract-admin principal tx-sender)

(define-private (is-admin (caller principal))
  (is-eq caller (var-get contract-admin))
)

(define-read-only (has-role (user principal) (role-name (string-ascii 20)))
  (ok (default-to false (map-get? roles { role-name: role-name, user: user })))
)

(define-public (grant-role (role-name (string-ascii 20)) (user principal))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq user 'SP000000000000000000002Q6VF78)) (err ERR-INVALID-ADDRESS))
    (map-set roles { role-name: role-name, user: user } true)
    (ok true)
  )
)

(define-public (revoke-role (role-name (string-ascii 20)) (user principal))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-NOT-AUTHORIZED))
    (map-delete roles { role-name: role-name, user: user })
    (ok true)
  )
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-INVALID-ADDRESS))
    (var-set contract-admin new-admin)
    (ok true)
  )
)

;; Example protected action
(define-public (moderate-content)
  (let ((has-mod-role (default-to false (map-get? roles { role-name: ROLE-MOD, user: tx-sender }))))
    (asserts! has-mod-role (err ERR-NOT-AUTHORIZED))
    (ok true)
  )
)

(define-read-only (get-admin)
  (ok (var-get contract-admin))
)
