var router = express.Router()
import express from 'express'
import typhoon from '../models/typhoon.js'

// GET /typhoon/list?year=2022
router.get('/list', (req, res, next) => {
  typhoon.getTyphoonList(req, res, next)
})

export default router
