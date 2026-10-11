# x-post-save

Save an X (Twitter) post to **json**, **md**, **toml**, or **yaml** in any directory you choose.

- Zero runtime dependencies — the CLI framework and the TOML/YAML serializers are hand-written.
- Data comes from the [FxTwitter API](https://docs.fxembed.com/api/twitter/) (`api.fxtwitter.com`).

## Usage

```bash
# from a status URL
bun run src/index.ts https://x.com/jack/status/20 --format json --out ./posts

# from a bare id, short flags
bun run src/index.ts 20 -f yaml -o ./posts
```

Output file: `<out>/<screenName>-<id>.<ext>`, e.g. `./posts/jack-20.json`.

### Options

| Option            | Description                                  |
| ----------------- | -------------------------------------------- |
| `-f, --format`    | `json` \| `md` \| `toml` \| `yaml` (required) |
| `-o, --out`       | Directory to write into (default: `.`)       |
| `-h, --help`      | Show help                                     |
| `-V, --version`   | Show version                                  |

## Develop

```bash
bun install
bun test
bun run typecheck
bun run build
```
