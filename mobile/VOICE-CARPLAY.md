# Mobile voice and CarPlay integration

The first release exposes one narrow system action: **Tell Orca**. Siri captures an instruction,
opens Orca Mobile through its existing URL scheme, and sends the instruction to the terminal in the
last worktree visited on that phone. The existing mobile transport remains the only network and
encryption implementation.

```mermaid
flowchart TD
    Driver["Driver invokes Tell Orca with Siri"] --> Intent["iOS App Intent captures instruction"]
    Intent --> Link["orca://voice-command deep link"]
    Link --> Resolve{"Last mobile worktree available?"}
    Resolve -- No --> Recovery["Show recovery: open an Orca worktree once"]
    Resolve -- Yes --> Session["Open last host and worktree session"]
    Session --> Ready{"Encrypted mobile client connected and terminal ready?"}
    Ready -- No --> Wait["Wait on existing reconnect and session hydration"]
    Wait --> Ready
    Ready -- Yes --> Send["Send instruction once through terminal.send"]
    Send --> Desktop["Paired Orca desktop"]
    Desktop --> Agent["Active CLI agent"]
    Send -- Failure --> Draft["Keep instruction in composer for retry"]

    Widget["Future CarPlay status widget"] -. "status only" .-> Session
    CarPlay["Future voice-based CarPlay app"] -. "requires Apple entitlement" .-> Desktop
```

## Current boundaries

- The desktop must be running and reachable through Orca's existing LAN or relay path.
- Siri launches the mobile app because the App Intent intentionally reuses the React Native session
  and encrypted transport rather than duplicating credentials or protocol code in Swift.
- The instruction is sent once per App Intent request ID. A failed send remains in the composer for
  manual retry.
- A CarPlay widget and a full voice-based CarPlay scene are separate follow-ups. The latter requires
  Apple's managed CarPlay entitlement before it can be signed for TestFlight.
