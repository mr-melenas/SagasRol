# RPG Engine & Agnostic Systems
- **Core Principle**: All game systems (DnD 3.5, Homebrew) must be treated as DATA, not CODE.
- **Data Structures**: Use JSONB in PostgreSQL for character sheets and item attributes to allow dynamic schemas.
- **System Maker**: The "Maker" phase is currently visual. Any new backend logic must support a dynamic "System Template" that defines which fields a character sheet has.
- **Lobby Logic**: The lobby must render components based on the `Universe` ruleset, not hardcoded RPG stats.