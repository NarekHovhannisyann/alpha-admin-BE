import express from 'express'
import cors from 'cors'
import env from './src/env/env.variables'
import { Router } from './src/routes/router'
import { databaseConnection } from './src/database/connection'
import { readExcelData } from './asdas'

const app = express()

app.use(
  cors({
    origin: '*',
  }),
)
app.use(express.json())
app.use(express.static('public'))

databaseConnection()
readExcelData('./TEST.xlsx')

/**
 * Lifecycle of a normal request
 *
 * - Router(s)
 */
app.use(Router.middleware)

app.listen(env.port || 8080, () => {
  console.log('Server running on port 8080')
})
