# Linear PR Title Action

Update your PR's title to the linked Linear issue's title.

To trigger the update, set your PRs title to `x`.

## Inputs

### `linearApiKey`

_Required._ Linear personal API key.

### `ghToken`

_Required._ GitHub API auth token.

## Example usage

```yaml
uses: perdoo/linear-pr-title-action@main
with:
  linearApiKey: ${{ secrets.LINEAR_API_KEY }}
  ghToken: ${{ secrets.GITHUB_TOKEN }}
```