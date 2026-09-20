import app from './app.js'
import { config } from './config.js'

app.listen(config.port, () => {
  console.log(`FPI Campus API listening on http://localhost:${config.port}`)
  console.log(`  Health check: http://localhost:${config.port}/api/health`)
})
