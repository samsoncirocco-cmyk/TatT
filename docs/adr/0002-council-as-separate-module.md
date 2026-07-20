# Council is its own module, not a generation internal

Council (prompt enhancement) is exposed on its own API route
(`/api/v1/council/enhance`), so it has consumers besides the generation
pipeline. We decided Council lives as its own small module with its own public
entry point; `generation` calls it like any other consumer. Burying it inside
`generation` would have forced the standalone route to reach through
generation's boundary.
