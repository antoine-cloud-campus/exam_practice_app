const express = require('express');
const router = express.Router();
const Joi = require('joi');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const logger = require('../config/logger');

const createTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).allow('').optional(),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  description: Joi.string().max(1000).allow(''),
  isCompleted: Joi.boolean(),
});

/**
 * Get all tasks belonging to the authenticated user, most recent first.
 *
 * @function getTasks
 * @memberof module:routes/tasks
 * @route GET /api/tasks
 * @access Private - requires a valid auth cookie
 * @returns {Task[]} 200 - Array of task documents owned by the current user
 * @returns {Object} 500 - `{ msg: 'Server Error' }` on unexpected failure
 */
async function getTasks(req, res) {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    logger.error(err.message);
    res.status(500).send('Server Error');
  }
}

/**
 * Create a new task owned by the authenticated user.
 *
 * @function createTask
 * @memberof module:routes/tasks
 * @route POST /api/tasks
 * @access Private - requires a valid auth cookie
 * @param {string} req.body.title - Task title (1-200 characters, required)
 * @param {string} [req.body.description] - Task description (up to 1000 characters)
 * @returns {Task} 200 - The newly created task document
 * @returns {Object} 400 - `{ msg }` when the payload fails Joi validation
 * @returns {Object} 500 - `{ msg: 'Server Error' }` on unexpected failure
 */
async function createTask(req, res) {
  const { error } = createTaskSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ msg: error.details[0].message });
  }

  const { title, description } = req.body;

  try {
    const newTask = new Task({
      title,
      description,
      user: req.user.id,
    });

    const task = await newTask.save();
    res.json(task);
  } catch (err) {
    logger.error(err.message);
    res.status(500).send('Server Error');
  }
}

/**
 * Update a task, provided it belongs to the authenticated user.
 *
 * @function updateTask
 * @memberof module:routes/tasks
 * @route PUT /api/tasks/:id
 * @access Private - requires a valid auth cookie and ownership of the task
 * @param {string} req.params.id - MongoDB ObjectId of the task to update
 * @param {string} [req.body.title] - New title (1-200 characters)
 * @param {string} [req.body.description] - New description (up to 1000 characters)
 * @param {boolean} [req.body.isCompleted] - New completion state
 * @returns {Task} 200 - The updated task document
 * @returns {Object} 400 - `{ msg }` when the payload fails Joi validation
 * @returns {Object} 403 - `{ msg: 'Not authorized' }` if the task belongs to another user
 * @returns {Object} 404 - `{ msg: 'Task not found' }` if the id does not exist
 * @returns {Object} 500 - `{ msg: 'Server Error' }` on unexpected failure
 */
async function updateTask(req, res) {
  const { error } = updateTaskSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ msg: error.details[0].message });
  }

  const { title, description, isCompleted } = req.body;

  try {
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    task = await Task.findByIdAndUpdate(req.params.id, { $set: { title, description, isCompleted } }, { new: true });

    res.json(task);
  } catch (err) {
    logger.error(err.message);
    res.status(500).send('Server Error');
  }
}

/**
 * Delete a task, provided it belongs to the authenticated user.
 *
 * @function deleteTask
 * @memberof module:routes/tasks
 * @route DELETE /api/tasks/:id
 * @access Private - requires a valid auth cookie and ownership of the task
 * @param {string} req.params.id - MongoDB ObjectId of the task to delete
 * @returns {Object} 200 - `{ msg: 'Task removed' }`
 * @returns {Object} 403 - `{ msg: 'Not authorized' }` if the task belongs to another user
 * @returns {Object} 404 - `{ msg: 'Task not found' }` if the id does not exist
 * @returns {Object} 500 - `{ msg: 'Server Error' }` on unexpected failure
 */
async function deleteTask(req, res) {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Task removed' });
  } catch (err) {
    logger.error(err.message);
    res.status(500).send('Server Error');
  }
}

router.get('/', auth, getTasks);
router.post('/', auth, createTask);
router.put('/:id', auth, updateTask);
router.delete('/:id', auth, deleteTask);

module.exports = router;
