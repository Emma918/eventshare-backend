const express = require('express');
const router = express.Router();
const columnController = require('../controllers/columnController');

// get column
router.get('/columns/:columnName', columnController.getColumnByName);

module.exports = router;
