const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

// All task routes require JWT authentication
router.use(protect);

// Dynamic Statistics Endpoint (must be above /:id)
router.get('/stats/summary', getTaskStats);

// Tasks List and Creation
router.route('/')
  .get(getTasks)
  .post(createTask);

// Single Task Operations
router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

// Quick Status Update
router.patch('/:id/status', updateTaskStatus);

module.exports = router;
