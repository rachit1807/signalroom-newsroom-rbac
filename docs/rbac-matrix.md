# Permission matrix

| Capability | Reporter | Editor | Publisher | Admin |
| --- | --- | --- | --- | --- |
| Create a story | Yes | No | No | Yes |
| Read private stories | Own | All in workspace | All in workspace | All in workspace |
| Edit drafts / submit | Own | No | No | Yes |
| Approve / request changes | No | Yes | No | Yes |
| Publish / correct / withdraw | No | No | Yes | Yes |
| Manage real users’ roles | No | No | No | Yes |
| Read public wire | Yes | Yes | Yes | Yes |

Every action also validates the current story state, workspace, and version. No user can approve or publish their own story. Changing an approved story invalidates approval. A publisher releases exactly the approved revision. Published content is immutable; corrections are appended, or the story can be withdrawn. Demo roles are fixed and cannot change real accounts.

A hidden button is only an interface convenience: the server independently enforces all boundaries. Role claims supplied during registration are ignored. JWTs identify a revocable session, while permissions come from the current stored user. Administrator role changes and password changes revoke sessions.
