# Security Specification: DataMind AI

## 1. Data Invariants
- A session must belong to a valid authenticated user.
- Chat messages must belong to a session owned by the authenticated user.
- Users can only read and write their own profile, sessions, and chat messages.

## 2. The "Dirty Dozen" Payloads
1. Create a User profile with a different UID.
2. Update a User profile's `email` without verification.
3. Read another user's session data.
4. Delete another user's session.
5. Add a chat message to a session owned by another user.
6. Create a session with a massive `dataPreview` field (resource exhaustion).
7. Update `createdAt` after creation.
8. Injection of script tags into `content` (though more of a frontend concern, we check string size).
9. Session creation with a fake `userId`.
10. Listing sessions without being the owner.
11. Updating `lastModifiedAt` to a past time.
12. Creating a chat message with a fake `sessionId`.

## 3. Test Runner (Mock)
(Testing usually requires a local emulator setup which I don't have here, but I will provide the rules that satisfy these).
