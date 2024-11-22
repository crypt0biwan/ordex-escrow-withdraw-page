# Ordex escrow withdraw page

## Dependencies

- [buffer.js](https://github.com/feross/buffer)
- [web3.min.js](https://cdn.jsdelivr.net/npm/web3/dist/web3.min.js)

I've used browserify to convert the buffer js dependency, so it can be included in the browser easily.

```bash
npx browserify --standalone buffer - -o buffer.js <<<"module.exports = require('buffer/').Buffer;"
```