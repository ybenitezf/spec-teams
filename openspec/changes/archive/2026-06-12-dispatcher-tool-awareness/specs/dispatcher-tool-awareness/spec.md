## ADDED Requirements

### Requirement: Dispatcher tool-checking rule in system prompt

The `buildRulesSegment()` function SHALL include a rule instructing the dispatcher to check the `## Agents` catalog for tool availability before dispatching. The rule SHALL contain: (1) a directive to check the catalog before dispatching, (2) an explicit reference to the `## Agents` section by name, and (3) concrete examples matching task types to tool requirements (e.g., `write` and `edit` for implementation, `read` and `grep` for investigation, `bash` for running commands).

#### Scenario: Rule is present in rules segment output
- **WHEN** `buildRulesSegment()` is called
- **THEN** the returned string contains a rule that references `## Agents`
- **AND** the rule mentions checking tool availability before dispatching
- **AND** the rule includes at least one concrete example mapping task types to tool names

#### Scenario: Rule references specific tool examples
- **WHEN** `buildRulesSegment()` is called
- **THEN** the returned string contains the phrase `write and edit` (or `write`, `edit`) as examples for implementation
- **AND** the returned string contains the phrase `read and grep` (or `read`, `grep`) as examples for investigation
- **AND** the returned string contains the phrase `bash` as an example for running commands

#### Scenario: Existing rules are preserved unchanged
- **WHEN** `buildRulesSegment()` is called
- **THEN** the returned string still contains the rule "NEVER try to read, write, or execute code directly"
- **AND** the returned string still contains the rule "ALWAYS use dispatch_agent to get work done"
- **AND** the returned string still contains the rule "Keep tasks focused"

#### Scenario: Rule appears in full system prompt
- **WHEN** the full dispatcher system prompt is assembled
- **THEN** the tool-checking rule appears in the `## Rules` section
- **AND** the `## Agents` catalog section (which lists tools per agent) also appears in the same prompt
- **AND** the rule and the catalog are in separate sections as expected